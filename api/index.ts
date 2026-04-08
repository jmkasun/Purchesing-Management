import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Fix for Aiven/Heroku self-signed certificate issues
process.env.PGSSLMODE = 'no-verify';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const JWT_SECRET = process.env.JWT_SECRET || "the-curated-ledger-secret-key-2024";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Database Initialization
let dbInitialized = false;
async function initDb() {
  if (dbInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS s_accounts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS s_users (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES s_accounts(id),
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        avatar_url TEXT,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS s_materials (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES s_accounts(id),
        material_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        unit TEXT NOT NULL,
        current_stock NUMERIC DEFAULT 0,
        total_stock NUMERIC DEFAULT 0,
        unit_price NUMERIC DEFAULT 0,
        deleted_at TIMESTAMP,
        UNIQUE(account_id, material_id)
      );

      CREATE TABLE IF NOT EXISTS s_categories (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES s_accounts(id),
        name TEXT NOT NULL,
        deleted_at TIMESTAMP,
        UNIQUE(account_id, name)
      );

      CREATE TABLE IF NOT EXISTS s_suppliers (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES s_accounts(id),
        supplier_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        deleted_at TIMESTAMP,
        UNIQUE(account_id, supplier_id)
      );

      CREATE TABLE IF NOT EXISTS s_supplier_contacts (
        id SERIAL PRIMARY KEY,
        supplier_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT,
        phone TEXT,
        email TEXT
      );

      CREATE TABLE IF NOT EXISTS s_quotations (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES s_accounts(id),
        material_id TEXT NOT NULL,
        supplier_id TEXT NOT NULL,
        date_received TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        price_per_unit NUMERIC NOT NULL,
        quantity TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS s_allocations (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES s_accounts(id),
        project_name TEXT NOT NULL,
        project_id TEXT NOT NULL,
        material_id TEXT NOT NULL,
        quantity NUMERIC NOT NULL,
        status TEXT DEFAULT 'pending',
        date_allocated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        person_responsible TEXT NOT NULL,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS s_projects (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES s_accounts(id),
        name TEXT NOT NULL,
        deleted_at TIMESTAMP,
        UNIQUE(account_id, name)
      );
    `);

    // Migrations for existing tables to add account_id and deleted_at
    const tablesToUpdate = ['s_users', 's_materials', 's_categories', 's_suppliers', 's_quotations', 's_allocations', 's_projects'];
    for (const table of tablesToUpdate) {
      await pool.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='account_id') THEN
            ALTER TABLE ${table} ADD COLUMN account_id INTEGER REFERENCES s_accounts(id);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='deleted_at') THEN
            ALTER TABLE ${table} ADD COLUMN deleted_at TIMESTAMP;
          END IF;
        END $$;
      `);
    }

    // Fix unique constraints for multi-tenancy
    await pool.query(`
      DO $$ 
      BEGIN 
        -- s_categories
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='s_categories' AND constraint_name='s_categories_name_key') THEN
          ALTER TABLE s_categories DROP CONSTRAINT IF EXISTS s_categories_name_key CASCADE;
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='s_categories' AND constraint_name='s_categories_account_id_name_key') THEN
            ALTER TABLE s_categories ADD CONSTRAINT s_categories_account_id_name_key UNIQUE (account_id, name);
          END IF;
        END IF;

        -- s_materials
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='s_materials' AND constraint_name='s_materials_material_id_key') THEN
          ALTER TABLE s_materials DROP CONSTRAINT IF EXISTS s_materials_material_id_key CASCADE;
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='s_materials' AND constraint_name='s_materials_account_id_material_id_key') THEN
            ALTER TABLE s_materials ADD CONSTRAINT s_materials_account_id_material_id_key UNIQUE (account_id, material_id);
          END IF;
        END IF;

        -- s_suppliers
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='s_suppliers' AND constraint_name='s_suppliers_supplier_id_key') THEN
          ALTER TABLE s_suppliers DROP CONSTRAINT IF EXISTS s_suppliers_supplier_id_key CASCADE;
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='s_suppliers' AND constraint_name='s_suppliers_account_id_supplier_id_key') THEN
            ALTER TABLE s_suppliers ADD CONSTRAINT s_suppliers_account_id_supplier_id_key UNIQUE (account_id, supplier_id);
          END IF;
        END IF;
      END $$;
    `);

    // Seed initial account if none exists
    const accountCheck = await pool.query("SELECT * FROM s_accounts LIMIT 1");
    let defaultAccountId = accountCheck.rows[0]?.id;
    if (!defaultAccountId) {
      const newAccount = await pool.query("INSERT INTO s_accounts (name) VALUES ('Default Account') RETURNING id");
      defaultAccountId = newAccount.rows[0].id;
    }

    // Seed super admin
    const superAdminCheck = await pool.query("SELECT * FROM s_users WHERE role = 'super_admin'");
    if (superAdminCheck.rows.length === 0) {
      await pool.query(
        "INSERT INTO s_users (email, password, full_name, role) VALUES ($1, $2, $3, $4)",
        ["superadmin@ledger.com", "superadmin123", "Super Admin", "super_admin"]
      );
    }

    // Seed initial admin for default account
    const adminCheck = await pool.query("SELECT * FROM s_users WHERE email = 'admin@ledger.com'");
    if (adminCheck.rows.length === 0) {
      await pool.query(
        "INSERT INTO s_users (account_id, email, password, full_name, role, avatar_url) VALUES ($1, $2, $3, $4, $5, $6)",
        [defaultAccountId, "admin@ledger.com", "admin123", "Alex Mercer", "admin", "https://lh3.googleusercontent.com/aida-public/AB6AXuCrhHQIW-dAY92BTIV6Oe0eNYUGt9INePTg8JWFLvg477E2rFwso_kN6GKPDz4dYlrTkazSiboLUBYothNa8R5FE5ZDKUt_Ar9GKq1lzGck6RXdT3oCgZkKeXa1_aeq5b5NVsSLwiu2ngYqdOcSOJ0aX5ZMMY_AUgO-5YhhFhQPisVGtZPTq6JMF-KkLbYDVDxbcLdIiO-1dgSKehv2o8LIHYDsCu2tevipFYT292ZwwzoR010-ax0iM1x2dSGNcKpKVd4IR7nRKgA"]
      );
    }

    // Seed some categories if empty
    const categoryCheck = await pool.query("SELECT * FROM s_categories LIMIT 1");
    if (categoryCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO s_categories (account_id, name) VALUES
        (NULL, 'Construction'),
        (NULL, 'Electrical'),
        (NULL, 'Plumbing'),
        (NULL, 'Mechanical'),
        (NULL, 'Raw Metals'),
        (NULL, 'Specialty Fluids'),
        (NULL, 'Components'),
        (NULL, 'Packaging');
      `);
    }

    // Seed some materials if empty
    const materialCheck = await pool.query("SELECT * FROM s_materials LIMIT 1");
    if (materialCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO s_materials (account_id, material_id, name, category, description, unit, current_stock, total_stock, unit_price) VALUES
        ($1, 'MTR-902-ST', 'Structural Steel I-Beam', 'Construction', 'ASTM A36 carbon steel beam for structural framing.', 'Metric Tons', 42.5, 100, 1200),
        ($1, 'MTR-441-EL', 'Copper Wiring 12/2', 'Electrical', 'High-conductivity copper wire with PVC insulation.', 'Rolls (100m)', 12, 50, 85),
        ($1, 'MTR-108-PL', 'Industrial PVC Piping', 'Plumbing', 'Schedule 80 PVC for high-pressure fluid systems.', 'Units (3m)', 312, 500, 45),
        ($1, 'MTR-772-MC', 'Hydraulic Pump Assembly', 'Mechanical', 'Variable displacement piston pump for machinery.', 'Set', 5, 20, 2450);
      `, [defaultAccountId]);
    }

    // Seed some suppliers if empty
    const supplierCheck = await pool.query("SELECT * FROM s_suppliers LIMIT 1");
    if (supplierCheck.rows.length === 0) {
      const suppliers = [
        [defaultAccountId, 'AS-9942-DE', 'AluStream Global', 'Raw Metals', 'active'],
        [defaultAccountId, 'HC-1102-FR', 'HydroChem Industries', 'Specialty Fluids', 'under_review'],
        [defaultAccountId, 'VM-3381-US', 'VoltMatrix Solutions', 'Components', 'active'],
        [defaultAccountId, 'PP-8821-UK', 'Pioneer Packaging', 'Packaging', 'active']
      ];

      for (const s of suppliers) {
        await pool.query(
          "INSERT INTO s_suppliers (account_id, supplier_id, name, category, status) VALUES ($1, $2, $3, $4, $5)",
          s
        );
      }

      await pool.query(`
        INSERT INTO s_supplier_contacts (supplier_id, name, role, phone, email) VALUES
        ('AS-9942-DE', 'Marcus Thorne', 'Head of Sales', '+49 30 555-0122', 'm.thorne@alustream.com'),
        ('HC-1102-FR', 'Sarah Jenkins', 'Logistics Director', '+33 1 42 68 55 55', 's.jenkins@h-chem.fr'),
        ('VM-3381-US', 'Chen Wei', 'Regional Manager', '+1 415 555-0198', 'c.wei@voltmatrix.io'),
        ('PP-8821-UK', 'Alicia Vance', 'Account Lead', '+44 20 7946 0122', 'a.vance@pioneerpack.co.uk');
      `);
    }

    // Seed some quotations if empty
    const quotationCheck = await pool.query("SELECT * FROM s_quotations LIMIT 1");
    if (quotationCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO s_quotations (account_id, material_id, supplier_id, price_per_unit, quantity, status) VALUES
        ($1, 'MTR-902-ST', 'AS-9942-DE', 1150, '50 tons', 'approved'),
        ($1, 'MTR-441-EL', 'VM-3381-US', 82, '100 rolls', 'pending'),
        ($1, 'MTR-108-PL', 'HC-1102-FR', 48, '200 units', 'rejected'),
        ($1, 'MTR-772-MC', 'PP-8821-UK', 2400, '10 sets', 'pending');
      `, [defaultAccountId]);
    }

    // Seed some allocations if empty
    const allocationCheck = await pool.query("SELECT * FROM s_allocations LIMIT 1");
    if (allocationCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO s_allocations (account_id, material_id, quantity, project_name, project_id, person_responsible, status) VALUES
        ($1, 'MTR-902-ST', 15, 'Skyline Tower A', 'PRJ-001', 'John Doe', 'allocated'),
        ($1, 'MTR-441-EL', 5, 'Metro Station Phase 2', 'PRJ-002', 'Jane Smith', 'pending'),
        ($1, 'MTR-108-PL', 120, 'Industrial Park Water Grid', 'PRJ-003', 'Bob Wilson', 'allocated');
      `, [defaultAccountId]);
    }

    // Seed some projects if empty
    const projectCheck = await pool.query("SELECT * FROM s_projects LIMIT 1");
    if (projectCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO s_projects (account_id, name) VALUES
        ($1, 'Skyline Tower A'),
        ($1, 'Metro Station Phase 2'),
        ($1, 'Industrial Park Water Grid');
      `, [defaultAccountId]);
    }

    // Update any remaining existing data to belong to default account if account_id is null
    for (const table of tablesToUpdate) {
      if (table !== 's_users') {
        await pool.query(`UPDATE ${table} SET account_id = $1 WHERE account_id IS NULL`, [defaultAccountId]);
      } else {
        await pool.query(`UPDATE s_users SET account_id = $1 WHERE account_id IS NULL AND role != 'super_admin'`, [defaultAccountId]);
      }
    }
    dbInitialized = true;
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API Routes
app.get("/api/health", async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
      return res.status(500).json({ 
        status: "error", 
        message: "Database environment variables are missing (DATABASE_URL or POSTGRES_URL)" 
      });
    }
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected", initialized: dbInitialized });
  } catch (err: any) {
    res.status(500).json({ 
      status: "error", 
      database: "disconnected", 
      message: err.message 
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!dbInitialized) await initDb();
    const result = await pool.query(`
      SELECT u.*, a.name as account_name 
      FROM s_users u 
      LEFT JOIN s_accounts a ON u.account_id = a.id 
      WHERE u.email = $1 AND u.deleted_at IS NULL
    `, [email]);
    const user = result.rows[0];
    if (user && password === user.password) {
      const token = jwt.sign({ 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        account_id: user.account_id 
      }, JWT_SECRET);
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          full_name: user.full_name, 
          role: user.role, 
          avatar_url: user.avatar_url,
          account_id: user.account_id,
          account_name: user.account_name
        } 
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", details: err.message });
  }
});

app.get("/api/materials", authenticateToken, async (req, res) => {
  try {
    let query = "SELECT * FROM s_materials WHERE deleted_at IS NULL";
    let params: any[] = [];
    if (req.user.role !== 'super_admin') {
      query += " AND account_id = $1";
      params.push(req.user.account_id);
    }
    const result = await pool.query(query + " ORDER BY material_id", params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/materials", authenticateToken, async (req, res) => {
  const { name, category, description, unit, current_stock, total_stock, unit_price } = req.body;
  const material_id = `MAT-${Date.now().toString().slice(-6)}`;
  try {
    const result = await pool.query(
      "INSERT INTO s_materials (account_id, material_id, name, category, description, unit, current_stock, total_stock, unit_price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [req.user.account_id, material_id, name, category, description, unit, current_stock || 0, total_stock || 0, unit_price || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/materials/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, category, description, unit, current_stock, total_stock, unit_price } = req.body;
  try {
    const result = await pool.query(
      "UPDATE s_materials SET name = $1, category = $2, description = $3, unit = $4, current_stock = $5, total_stock = $6, unit_price = $7 WHERE id = $8 AND (account_id IS NOT DISTINCT FROM $9) AND deleted_at IS NULL RETURNING *",
      [name, category, description, unit, current_stock, total_stock, unit_price, id, req.user.account_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Material not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/materials/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE s_materials SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND (account_id IS NOT DISTINCT FROM $2)", [id, req.user.account_id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/categories", authenticateToken, async (req, res) => {
  try {
    let query = "SELECT * FROM s_categories WHERE deleted_at IS NULL";
    let params: any[] = [];
    if (req.user.role !== 'super_admin') {
      query += " AND (account_id = $1 OR account_id IS NULL)";
      params.push(req.user.account_id);
    }
    const result = await pool.query(query + " ORDER BY name", params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/categories", authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    const existing = await pool.query(
      "SELECT * FROM s_categories WHERE name = $1 AND account_id IS NOT DISTINCT FROM $2", 
      [name, req.user.account_id]
    );
    if (existing.rows.length > 0) {
      if (existing.rows[0].deleted_at) {
        const result = await pool.query("UPDATE s_categories SET deleted_at = NULL WHERE id = $1 RETURNING *", [existing.rows[0].id]);
        return res.status(200).json(result.rows[0]);
      } else {
        return res.status(400).json({ message: "Category already exists" });
      }
    }
    const result = await pool.query("INSERT INTO s_categories (account_id, name) VALUES ($1, $2) RETURNING *", [req.user.account_id, name]);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Server error" });
  }
});

app.put("/api/categories/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query(
      "UPDATE s_categories SET name = $1 WHERE id = $2 AND (account_id IS NOT DISTINCT FROM $3) AND deleted_at IS NULL RETURNING *",
      [name, id, req.user.account_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Category not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/categories/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) return res.status(400).json({ message: "Invalid category ID" });
    let query = "UPDATE s_categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1";
    let params: any[] = [categoryId];
    if (req.user.role !== 'super_admin') {
      query += " AND account_id = $2";
      params.push(req.user.account_id);
    }
    await pool.query(query, params);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/suppliers", authenticateToken, async (req, res) => {
  try {
    let query = "SELECT * FROM s_suppliers WHERE deleted_at IS NULL";
    let params: any[] = [];
    if (req.user.role !== 'super_admin') {
      query += " AND account_id = $1";
      params.push(req.user.account_id);
    }
    const suppliers = await pool.query(query + " ORDER BY name", params);
    const contacts = await pool.query("SELECT * FROM s_supplier_contacts");
    const result = suppliers.rows.map(s => ({
      ...s,
      contacts: contacts.rows.filter(c => c.supplier_id === s.supplier_id)
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/suppliers", authenticateToken, async (req, res) => {
  const { name, category, status, contacts } = req.body;
  const supplier_id = `SUP-${Date.now().toString().slice(-6)}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const supplierResult = await client.query(
      "INSERT INTO s_suppliers (account_id, supplier_id, name, category, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [req.user.account_id, supplier_id, name, category, status || 'active']
    );
    if (contacts && Array.isArray(contacts)) {
      for (const contact of contacts) {
        await client.query(
          "INSERT INTO s_supplier_contacts (supplier_id, name, role, phone, email) VALUES ($1, $2, $3, $4, $5)",
          [supplier_id, contact.name, contact.role, contact.phone, contact.email]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json({ ...supplierResult.rows[0], contacts: contacts || [] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

app.put("/api/suppliers/:supplier_id", authenticateToken, async (req, res) => {
  const { supplier_id } = req.params;
  const { name, category, status, contacts } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let query = "UPDATE s_suppliers SET name = $1, category = $2, status = $3 WHERE supplier_id = $4 AND deleted_at IS NULL";
    let params = [name, category, status, supplier_id];
    if (req.user.role !== 'super_admin') {
      query += " AND account_id = $5";
      params.push(req.user.account_id);
    }
    const supplierResult = await client.query(query + " RETURNING *", params);
    if (supplierResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Supplier not found" });
    }
    await client.query("DELETE FROM s_supplier_contacts WHERE supplier_id = $1", [supplier_id]);
    if (contacts && Array.isArray(contacts)) {
      for (const contact of contacts) {
        await client.query(
          "INSERT INTO s_supplier_contacts (supplier_id, name, role, phone, email) VALUES ($1, $2, $3, $4, $5)",
          [supplier_id, contact.name, contact.role, contact.phone, contact.email]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ ...supplierResult.rows[0], contacts: contacts || [] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

app.delete("/api/suppliers/:supplier_id", authenticateToken, async (req, res) => {
  const { supplier_id } = req.params;
  try {
    let query = "UPDATE s_suppliers SET deleted_at = CURRENT_TIMESTAMP WHERE supplier_id = $1";
    let params = [supplier_id];
    if (req.user.role !== 'super_admin') {
      query += " AND account_id = $2";
      params.push(req.user.account_id);
    }
    await pool.query(query, params);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/quotations", authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT q.*, m.name as material_name, s.name as supplier_name 
      FROM s_quotations q
      JOIN s_materials m ON q.material_id = m.material_id AND m.account_id = q.account_id
      JOIN s_suppliers s ON q.supplier_id = s.supplier_id AND s.account_id = q.account_id
      WHERE q.deleted_at IS NULL
    `;
    let params: any[] = [];
    if (req.user.role !== 'super_admin') {
      query += " AND q.account_id = $1";
      params.push(req.user.account_id);
    }
    const result = await pool.query(query + " ORDER BY q.date_received DESC", params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/quotations", authenticateToken, async (req, res) => {
  const { material_id, supplier_id, price_per_unit, quantity, status } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO s_quotations (account_id, material_id, supplier_id, price_per_unit, quantity, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [req.user.account_id, material_id, supplier_id, price_per_unit, quantity, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/quotations/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, price_per_unit, quantity } = req.body;
  try {
    let query = "UPDATE s_quotations SET status = $1, price_per_unit = $2, quantity = $3 WHERE id = $4 AND deleted_at IS NULL";
    let params = [status, price_per_unit, quantity, id];
    if (req.user.role !== 'super_admin') {
      query += " AND account_id = $5";
      params.push(req.user.account_id);
    }
    const result = await pool.query(query + " RETURNING *", params);
    if (result.rows.length === 0) return res.status(404).json({ message: "Quotation not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/quotations/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    let query = "UPDATE s_quotations SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1";
    let params = [id];
    if (req.user.role !== 'super_admin') {
      query += " AND account_id = $2";
      params.push(req.user.account_id);
    }
    await pool.query(query, params);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/allocations", authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT a.*, m.name as material_name
      FROM s_allocations a
      JOIN s_materials m ON a.material_id = m.material_id AND m.account_id = a.account_id
      WHERE a.deleted_at IS NULL
    `;
    let params: any[] = [];
    if (req.user.role !== 'super_admin') {
      query += " AND a.account_id = $1";
      params.push(req.user.account_id);
    }
    const result = await pool.query(query + " ORDER BY a.date_allocated DESC", params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/allocations", authenticateToken, async (req, res) => {
  const { project_name, project_id, material_id, quantity, status, person_responsible } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const material = await client.query(
      "SELECT current_stock FROM s_materials WHERE material_id = $1 AND account_id = $2", 
      [material_id, req.user.account_id]
    );
    if (material.rows.length === 0) throw new Error("Material not found");
    const currentStock = parseFloat(material.rows[0].current_stock);
    const allocQty = parseFloat(quantity);
    if (currentStock < allocQty) throw new Error("Insufficient stock");
    const result = await client.query(
      "INSERT INTO s_allocations (account_id, project_name, project_id, material_id, quantity, status, person_responsible) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [req.user.account_id, project_name, project_id, material_id, quantity, status || 'pending', person_responsible]
    );
    await client.query(
      "UPDATE s_materials SET current_stock = current_stock - $1 WHERE material_id = $2 AND account_id = $3",
      [quantity, material_id, req.user.account_id]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message || "Server error" });
  } finally {
    client.release();
  }
});

app.delete("/api/allocations/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    let query = "UPDATE s_allocations SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1";
    let params = [id];
    if (req.user.role !== 'super_admin') {
      query += " AND account_id = $2";
      params.push(req.user.account_id);
    }
    await pool.query(query, params);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/projects", authenticateToken, async (req, res) => {
  try {
    let query = "SELECT * FROM s_projects WHERE deleted_at IS NULL";
    let params: any[] = [];
    if (req.user.role !== 'super_admin') {
      query += " AND account_id = $1";
      params.push(req.user.account_id);
    }
    const result = await pool.query(query + " ORDER BY name", params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/projects", authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    const existing = await pool.query(
      "SELECT * FROM s_projects WHERE name = $1 AND account_id IS NOT DISTINCT FROM $2", 
      [name, req.user.account_id]
    );
    if (existing.rows.length > 0) {
      if (existing.rows[0].deleted_at) {
        const result = await pool.query("UPDATE s_projects SET deleted_at = NULL WHERE id = $1 RETURNING *", [existing.rows[0].id]);
        return res.status(200).json(result.rows[0]);
      } else {
        return res.status(400).json({ message: "Project already exists" });
      }
    }
    const result = await pool.query("INSERT INTO s_projects (account_id, name) VALUES ($1, $2) RETURNING *", [req.user.account_id, name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/projects/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    let query = "UPDATE s_projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1";
    let params = [id];
    if (req.user.role !== 'super_admin') {
      query += " AND account_id = $2";
      params.push(req.user.account_id);
    }
    await pool.query(query, params);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/stats", authenticateToken, async (req, res) => {
  try {
    let whereClause = "WHERE deleted_at IS NULL";
    let params: any[] = [];
    if (req.user.role !== 'super_admin') {
      whereClause += " AND account_id = $1";
      params.push(req.user.account_id);
    }
    const totalMaterials = await pool.query(`SELECT COUNT(*) FROM s_materials ${whereClause}`, params);
    const totalValue = await pool.query(`SELECT SUM(current_stock * unit_price) FROM s_materials ${whereClause}`, params);
    const pendingQuotes = await pool.query(`SELECT COUNT(*) FROM s_quotations ${whereClause} AND status = 'pending'`, params);
    const criticalStock = await pool.query(`SELECT COUNT(*) FROM s_materials ${whereClause} AND current_stock < (total_stock * 0.2)`, params);
    res.json({
      totalMaterials: parseInt(totalMaterials.rows[0].count),
      totalValue: parseFloat(totalValue.rows[0].sum || 0),
      pendingQuotes: parseInt(pendingQuotes.rows[0].count),
      criticalStock: parseInt(criticalStock.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/accounts", authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.sendStatus(403);
  try {
    const result = await pool.query("SELECT * FROM s_accounts WHERE deleted_at IS NULL ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/accounts", authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.sendStatus(403);
  const { name } = req.body;
  try {
    const result = await pool.query("INSERT INTO s_accounts (name) VALUES ($1) RETURNING *", [name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT u.id, u.email, u.full_name, u.role, u.account_id, u.avatar_url, a.name as account_name 
      FROM s_users u 
      LEFT JOIN s_accounts a ON u.account_id = a.id 
      WHERE u.deleted_at IS NULL
    `;
    let params: any[] = [];
    if (req.user.role !== 'super_admin') {
      query += " AND u.account_id = $1";
      params.push(req.user.account_id);
    }
    const result = await pool.query(query + " ORDER BY u.full_name", params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/users", authenticateToken, async (req, res) => {
  const { email, password, full_name, role, account_id } = req.body;
  if (req.user.role !== 'super_admin') {
    if (role === 'super_admin') return res.status(403).json({ message: "Unauthorized role" });
    if (account_id && account_id !== req.user.account_id) return res.status(403).json({ message: "Unauthorized account" });
  }
  const targetAccountId = req.user.role === 'super_admin' ? account_id : req.user.account_id;
  try {
    const result = await pool.query(
      "INSERT INTO s_users (email, password, full_name, role, account_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, account_id",
      [email, password, full_name, role || 'user', targetAccountId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ message: "Email already exists" });
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/users/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { full_name, role, account_id, password } = req.body;
  try {
    const userCheck = await pool.query("SELECT account_id, role FROM s_users WHERE id = $1", [id]);
    if (userCheck.rows.length === 0) return res.status(404).json({ message: "User not found" });
    if (req.user.role !== 'super_admin') {
      if (userCheck.rows[0].account_id !== req.user.account_id) return res.sendStatus(403);
      if (role === 'super_admin' || userCheck.rows[0].role === 'super_admin') return res.sendStatus(403);
      if (account_id && account_id !== req.user.account_id) return res.sendStatus(403);
    }
    let query = "UPDATE s_users SET full_name = $1, role = $2";
    let params = [full_name, role];
    let paramCount = 3;
    if (req.user.role === 'super_admin' && account_id) {
      query += `, account_id = $${paramCount++}`;
      params.push(account_id);
    }
    if (password) {
      query += `, password = $${paramCount++}`;
      params.push(password);
    }
    query += ` WHERE id = $${paramCount} RETURNING id, email, full_name, role, account_id`;
    params.push(id);
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/users/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const userCheck = await pool.query("SELECT account_id, role FROM s_users WHERE id = $1", [id]);
    if (userCheck.rows.length === 0) return res.status(404).json({ message: "User not found" });
    if (req.user.role !== 'super_admin') {
      if (userCheck.rows[0].account_id !== req.user.account_id) return res.sendStatus(403);
      if (userCheck.rows[0].role === 'super_admin') return res.sendStatus(403);
    }
    await pool.query("UPDATE s_users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

async function setupApp() {
  initDb().catch(err => console.error("Database initialization background error:", err));
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

setupApp();

export default app;
