import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Material } from '../types';
import { Package, Search, Plus, MoreVertical, Construction, X, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import ConfirmationModal from '../components/ConfirmationModal';

interface Category {
  id: number;
  name: string;
}

export default function Inventory() {
  const { token } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: '',
    current_stock: 0,
    total_stock: 0,
    unit_price: 0,
    description: ''
  });
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMaterials = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/materials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch materials: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setMaterials(data);
      } else {
        console.error('Materials data is not an array:', data);
        setMaterials([]);
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch categories: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setCategories(data);
        if (data.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: data[0].name }));
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchCategories();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const url = editingMaterial ? `/api/materials/${editingMaterial.id}` : '/api/materials';
      const method = editingMaterial ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Failed to ${editingMaterial ? 'update' : 'add'} material`);
      }

      await fetchMaterials();
      setIsModalOpen(false);
      setEditingMaterial(null);
      setFormData({
        name: '',
        category: categories[0]?.name || '',
        unit: '',
        current_stock: 0,
        total_stock: 0,
        unit_price: 0,
        description: ''
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      category: material.category,
      unit: material.unit,
      current_stock: material.current_stock,
      total_stock: material.total_stock,
      unit_price: material.unit_price,
      description: material.description || ''
    });
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleDelete = async (id: number) => {
    setDeleteConfirmId(id);
    setActiveMenu(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const response = await fetch(`/api/materials/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchMaterials();
      }
    } catch (err) {
      console.error(err);
    }
    setDeleteConfirmId(null);
  };

  const filteredMaterials = materials.filter(m => {
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         m.material_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError('');
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCategoryName })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add category');
      }

      await fetchCategories();
      setFormData(prev => ({ ...prev, category: newCategoryName }));
      setIsCategoryModalOpen(false);
      setNewCategoryName('');
    } catch (err: any) {
      setCategoryError(err.message);
    }
  };

  return (
    <div className="p-4 md:p-10 flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight">Material Inventory</h2>
          <p className="text-sm md:text-base text-on-surface-variant mt-2 font-body max-w-lg">Manage and monitor your enterprise-grade materials with architectural precision.</p>
        </div>
        <button 
          onClick={() => {
            setEditingMaterial(null);
            setFormData({
              name: '',
              category: categories[0]?.name || '',
              unit: '',
              current_stock: 0,
              total_stock: 0,
              unit_price: 0,
              description: ''
            });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-[#3755c3] to-[#2848b7] text-white px-6 py-3 rounded-xl font-headline font-bold text-sm shadow-xl shadow-primary/10 hover:shadow-primary/25 transition-all active:scale-95 w-full md:w-auto"
        >
          <Plus size={20} />
          Add Material
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div 
            onClick={() => setSelectedCategory('All')}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer",
              selectedCategory === 'All' 
                ? "bg-primary text-on-primary shadow-lg shadow-primary/20" 
                : "bg-secondary-container text-on-secondary-container hover:bg-surface-container-high"
            )}
          >
            All Categories
          </div>
          {categories.length > 0 ? (
            categories.map(cat => (
              <div 
                key={cat.id} 
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  "px-4 py-2 rounded-full border text-xs font-medium transition-colors cursor-pointer",
                  selectedCategory === cat.name
                    ? "bg-primary text-on-primary border-primary shadow-lg shadow-primary/20"
                    : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                {cat.name}
              </div>
            ))
          ) : (
            <div className="text-xs text-on-surface-variant italic px-2">No categories found</div>
          )}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={18} />
          <input 
            type="text"
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm text-on-surface transition-all"
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-high">
              <tr>
                <th className="px-4 md:px-6 py-4 font-headline text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Name</th>
                <th className="px-4 md:px-6 py-4 font-headline text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Category</th>
                <th className="hidden md:table-cell px-6 py-4 font-headline text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Unit</th>
                <th className="px-4 md:px-6 py-4 font-headline text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Stock</th>
                <th className="px-4 md:px-6 py-4 font-headline text-[10px] uppercase tracking-widest font-bold text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map((m, index) => (
                  <tr key={m.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                        <Construction className="text-primary" size={14} />
                      </div>
                      <span className="font-headline font-bold text-xs md:text-sm text-on-surface truncate max-w-[100px] md:max-w-none">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <span className="bg-tertiary-container/20 text-on-tertiary-container px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase whitespace-nowrap">{m.category}</span>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 text-xs font-medium">{m.unit}</td>
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-headline font-extrabold text-xs md:text-sm", m.current_stock < m.total_stock * 0.2 && "text-error")}>
                        {m.current_stock}
                      </span>
                      <div className="hidden sm:block w-12 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full", m.current_stock < m.total_stock * 0.2 ? "bg-error" : "bg-primary")} 
                          style={{ width: `${Math.min(100, (m.current_stock / m.total_stock) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-right relative">
                    <button 
                      onClick={() => setActiveMenu(activeMenu === m.id ? null : m.id)}
                      className="p-1.5 hover:bg-primary/10 text-on-surface-variant hover:text-primary rounded-lg transition-colors"
                    >
                      <MoreVertical size={20} />
                    </button>
                    <AnimatePresence>
                      {activeMenu === m.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: index >= materials.length - 2 ? 10 : -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: index >= materials.length - 2 ? 10 : -10 }}
                            className={cn(
                              "absolute right-6 w-32 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 z-20 overflow-hidden",
                              index >= materials.length - 2 ? "bottom-12" : "top-12"
                            )}
                          >
                            <button 
                              onClick={() => handleEdit(m)}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(m.id)}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-error hover:bg-error/10 transition-colors border-t border-outline-variant/10"
                            >
                              Delete
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-on-surface-variant/60">
                    <Package size={48} strokeWidth={1} />
                    <p className="font-headline font-bold">No materials found</p>
                    <p className="text-xs">Try adjusting your filters or search query</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-outline-variant/20"
            >
              <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-high/30">
                <div>
                  <h3 className="font-headline font-extrabold text-2xl text-on-surface">
                    {editingMaterial ? 'Edit Material' : 'Add New Material'}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-1">
                    {editingMaterial ? 'Update material specifications.' : 'Enter material specifications for the ledger.'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingMaterial(null);
                  }}
                  className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-error-container text-on-error-container rounded-xl text-sm font-bold flex items-center gap-2">
                    <Package size={18} />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Material Name</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. Structural Steel"
                      className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Category</label>
                    <div className="flex gap-2">
                      <select 
                        className="flex-1 bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all appearance-none"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                      <button 
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="p-3 bg-surface-container-high text-primary hover:bg-primary hover:text-on-primary rounded-xl transition-all"
                        title="Add New Category"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Unit</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. Metric Tons, Rolls"
                      className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all"
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Current Stock</label>
                    <input 
                      type="number"
                      className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all"
                      value={formData.current_stock}
                      onChange={e => setFormData({...formData, current_stock: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Total Capacity</label>
                    <input 
                      type="number"
                      className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all"
                      value={formData.total_stock}
                      onChange={e => setFormData({...formData, total_stock: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Brief architectural specification..."
                    className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all resize-none"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingMaterial(null);
                    }}
                    className="flex-1 px-6 py-4 rounded-xl font-headline font-bold text-sm bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 rounded-xl font-headline font-bold text-sm bg-primary text-on-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {editingMaterial ? 'Update Material' : 'Save Material'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-outline-variant/20"
            >
              <div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-high/30">
                <h3 className="font-headline font-extrabold text-xl text-on-surface">New Category</h3>
                <button 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddCategory} className="p-6 space-y-4">
                {categoryError && (
                  <div className="p-3 bg-error-container text-on-error-container rounded-lg text-xs font-bold">
                    {categoryError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Category Name</label>
                  <input 
                    required
                    autoFocus
                    type="text"
                    placeholder="e.g. Finishing Materials"
                    className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-headline font-bold text-xs bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl font-headline font-bold text-xs bg-primary text-on-primary shadow-lg shadow-primary/20 transition-all"
                  >
                    Add Category
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Delete Material"
        message="Are you sure you want to delete this material? This will remove it from the inventory ledger."
      />
    </div>
  );
}
