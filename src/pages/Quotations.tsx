import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Quotation, Material, Supplier } from '../types';
import { FileText, ArrowLeftRight, Plus, MoreVertical, Download, Filter, X, Check, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Quotations() {
  const { token } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    material_id: '',
    supplier_id: '',
    price_per_unit: 0,
    quantity: '',
    status: 'pending' as 'pending' | 'approved' | 'rejected'
  });

  const fetchQuotations = async () => {
    try {
      const response = await fetch('/api/quotations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setQuotations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/materials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) setMaterials(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) setSuppliers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQuotations();
    fetchMaterials();
    fetchSuppliers();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const url = editingQuotation ? `/api/quotations/${editingQuotation.id}` : '/api/quotations';
      const method = editingQuotation ? 'PUT' : 'POST';

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
        throw new Error(data.message || 'Failed to save quotation');
      }

      await fetchQuotations();
      setIsModalOpen(false);
      setEditingQuotation(null);
      setFormData({
        material_id: '',
        supplier_id: '',
        price_per_unit: 0,
        quantity: '',
        status: 'pending'
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (q: Quotation) => {
    setEditingQuotation(q);
    setFormData({
      material_id: q.material_id,
      supplier_id: q.supplier_id,
      price_per_unit: q.price_per_unit,
      quantity: q.quantity,
      status: q.status as any
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
      const response = await fetch(`/api/quotations/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchQuotations();
      }
    } catch (err) {
      console.error(err);
    }
    setDeleteConfirmId(null);
  };

  const groupedQuotes = quotations.reduce((acc, q) => {
    const name = q.material_name || 'Unknown Material';
    if (!acc[name]) acc[name] = [];
    acc[name].push(q);
    return acc;
  }, {} as Record<string, Quotation[]>);

  return (
    <div className="pt-20 md:pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-10 gap-6">
        <div>
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold">Procurement Core</span>
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-background mt-1">Quotation Manager</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setIsCompareModalOpen(true)}
            className="bg-surface-container-highest text-on-surface px-6 py-2.5 rounded-xl font-headline font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
          >
            <ArrowLeftRight size={18} />
            Compare Quotes
          </button>
          <button 
            onClick={() => {
              setEditingQuotation(null);
              setFormData({
                material_id: materials[0]?.material_id || '',
                supplier_id: suppliers[0]?.supplier_id || '',
                price_per_unit: 0,
                quantity: '',
                status: 'pending'
              });
              setIsModalOpen(true);
            }}
            className="primary-gradient text-on-primary px-6 py-2.5 rounded-xl font-headline font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            <Plus size={18} />
            New Quotation Request
          </button>
        </div>
      </div>

      <section className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
        <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-high/50">
          <h3 className="font-headline font-bold text-lg">Recent Quotations</h3>
          <div className="flex gap-2">
            <button className="p-2 bg-surface-container-high rounded-lg border border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-highest transition-colors">
              <Filter size={18} />
            </button>
            <button className="p-2 bg-surface-container-high rounded-lg border border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-highest transition-colors">
              <Download size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high">
                <th className="px-4 md:px-8 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Material</th>
                <th className="px-4 md:px-8 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Supplier</th>
                <th className="hidden md:table-cell px-8 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold text-center">Date</th>
                <th className="px-4 md:px-8 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold text-right">Price</th>
                <th className="hidden md:table-cell px-8 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold text-right">Qty</th>
                <th className="px-4 md:px-8 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold text-center">Status</th>
                <th className="px-4 md:px-8 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr><td colSpan={7} className="px-8 py-10 text-center text-on-surface-variant">Loading quotations...</td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan={7} className="px-8 py-10 text-center text-on-surface-variant">No quotations found.</td></tr>
              ) : (
                quotations.map((q, index) => (
                  <tr key={q.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-4 md:px-8 py-6">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded bg-primary-fixed flex items-center justify-center shrink-0">
                          <FileText className="text-primary" size={14} />
                        </div>
                        <span className="font-headline font-bold text-xs md:text-sm truncate max-w-[80px] md:max-w-none">{q.material_name}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-6">
                      <span className="font-body text-xs md:text-sm font-medium truncate max-w-[80px] md:max-w-none block">{q.supplier_name}</span>
                    </td>
                    <td className="hidden md:table-cell px-8 py-6 text-center">
                      <span className="font-body text-xs text-on-surface-variant">{format(new Date(q.date_received), 'MMM dd, yyyy')}</span>
                    </td>
                    <td className="px-4 md:px-8 py-6 text-right">
                      <span className="font-headline font-bold text-xs md:text-sm">${parseFloat(q.price_per_unit.toString()).toLocaleString()}</span>
                    </td>
                    <td className="hidden md:table-cell px-8 py-6 text-right">
                      <span className="font-body text-sm">{q.quantity}</span>
                    </td>
                    <td className="px-4 md:px-8 py-6 text-center">
                      <span className={cn(
                        "px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider",
                        q.status === 'approved' ? "bg-tertiary-container text-on-tertiary-container" : 
                        q.status === 'pending' ? "bg-secondary-container text-on-secondary-container" : 
                        "bg-error-container text-on-error-container"
                      )}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 md:px-8 py-6 text-right relative">
                      <button 
                        onClick={() => setActiveMenu(activeMenu === q.id ? null : q.id)}
                        className="text-on-surface-variant hover:text-primary p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                      >
                        <MoreVertical size={20} />
                      </button>
                      <AnimatePresence>
                        {activeMenu === q.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: index >= quotations.length - 2 ? 10 : -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: index >= quotations.length - 2 ? 10 : -10 }}
                              className={cn(
                                "absolute right-8 w-32 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 z-20 overflow-hidden",
                                index >= quotations.length - 2 ? "bottom-12" : "top-12"
                              )}
                            >
                              <button 
                                onClick={() => handleEdit(q)}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(q.id)}
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
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* New/Edit Quotation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-outline-variant/20"
            >
              <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-high/30">
                <h3 className="font-headline font-extrabold text-2xl text-on-surface">
                  {editingQuotation ? 'Edit Quotation' : 'New Quotation Request'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-error-container text-on-error-container rounded-xl text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Material</label>
                    <select 
                      required
                      disabled={!!editingQuotation}
                      className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all appearance-none disabled:opacity-50"
                      value={formData.material_id}
                      onChange={e => setFormData({...formData, material_id: e.target.value})}
                    >
                      {materials.map(m => (
                        <option key={m.id} value={m.material_id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Supplier</label>
                    <select 
                      required
                      disabled={!!editingQuotation}
                      className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all appearance-none disabled:opacity-50"
                      value={formData.supplier_id}
                      onChange={e => setFormData({...formData, supplier_id: e.target.value})}
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.supplier_id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Price per Unit</label>
                      <input 
                        required
                        type="number"
                        step="0.01"
                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all"
                        value={formData.price_per_unit}
                        onChange={e => setFormData({...formData, price_per_unit: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Quantity</label>
                      <input 
                        required
                        type="text"
                        placeholder="e.g. 50 tons"
                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all"
                        value={formData.quantity}
                        onChange={e => setFormData({...formData, quantity: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Status</label>
                    <select 
                      className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all appearance-none"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-xl font-headline font-bold text-sm bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 rounded-xl font-headline font-bold text-sm bg-primary text-on-primary shadow-xl shadow-primary/20 transition-all"
                  >
                    {editingQuotation ? 'Update Quotation' : 'Save Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compare Quotes Modal */}
      <AnimatePresence>
        {isCompareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-outline-variant/20"
            >
              <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-high/30">
                <h3 className="font-headline font-extrabold text-2xl text-on-surface">Compare Quotations</h3>
                <button onClick={() => setIsCompareModalOpen(false)} className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8">
                {Object.keys(groupedQuotes).map((material) => {
                  const quotes = groupedQuotes[material];
                  return (
                    <div key={material} className="space-y-4">
                      <h4 className="font-headline font-bold text-lg text-primary flex items-center gap-2">
                        <FileText size={20} />
                        {material}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...quotes].sort((a, b) => a.price_per_unit - b.price_per_unit).map((q, idx) => (
                        <div 
                          key={q.id} 
                          className={cn(
                            "p-4 rounded-xl border-2 transition-all",
                            idx === 0 ? "border-tertiary bg-tertiary-container/5" : "border-outline-variant/20 bg-surface-container-low"
                          )}
                        >
                          {idx === 0 && (
                            <div className="flex items-center gap-1 text-tertiary text-[10px] font-bold uppercase tracking-widest mb-2">
                              <Check size={12} />
                              Best Price
                            </div>
                          )}
                          <p className="font-headline font-bold text-on-surface">{q.supplier_name}</p>
                          <div className="mt-3 flex justify-between items-end">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Price/Unit</p>
                              <p className="text-xl font-headline font-extrabold text-on-surface">${parseFloat(q.price_per_unit.toString()).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Qty</p>
                              <p className="text-sm font-medium text-on-surface">{q.quantity}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Delete Quotation"
        message="Are you sure you want to delete this quotation request? This will remove it from the procurement ledger."
      />
    </div>
  );
}
