export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  account_id?: number;
  account_name?: string;
  avatar_url?: string;
}

export interface Account {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  name: string;
}

export interface Material {
  id: number;
  material_id: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  current_stock: number;
  total_stock: number;
  unit_price: number;
}

export interface SupplierContact {
  id?: number;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface Supplier {
  id: number;
  supplier_id: string;
  name: string;
  category: string;
  status: 'active' | 'under_review';
  contacts: SupplierContact[];
}

export interface Quotation {
  id: number;
  material_id: string;
  supplier_id: string;
  date_received: string;
  price_per_unit: number;
  quantity: string;
  status: 'pending' | 'approved' | 'rejected';
  material_name?: string;
  supplier_name?: string;
}

export interface Allocation {
  id: number;
  project_name: string;
  material_id: string;
  quantity: string;
  status: 'dispatched' | 'in_transit' | 'pending';
  date_allocated: string;
  person_responsible: string;
  material_name?: string;
}

export interface Stats {
  totalMaterials: number;
  totalValue: number;
  pendingQuotes: number;
  criticalStock: number;
}
