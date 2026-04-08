import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Supplier, SupplierContact } from '../types';
import { Factory, Phone, Mail, MoreVertical, UserPlus, Trash2, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Suppliers() {
  const { token } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [error, setError] = useState('');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    status: 'active' as 'active' | 'under_review',
    contacts: [{ name: '', role: '', phone: '', email: '' }] as SupplierContact[]
  });

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setSuppliers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setCategories(data);
        if (data.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: data[0].name }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchCategories();
  }, [token]);

  const handleAddContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', role: '', phone: '', email: '' }]
    }));
  };

  const handleRemoveContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const handleContactChange = (index: number, field: keyof SupplierContact, value: string) => {
    const newContacts = [...formData.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData(prev => ({ ...prev, contacts: newContacts }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.supplier_id}` : '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';

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
        throw new Error(data.message || `Failed to ${editingSupplier ? 'update' : 'add'} supplier`);
      }

      await fetchSuppliers();
      setIsModalOpen(false);
      setEditingSupplier(null);
      setFormData({
        name: '',
        category: categories[0]?.name || '',
        status: 'active',
        contacts: [{ name: '', role: '', phone: '', email: '' }]
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      category: supplier.category,
      status: supplier.status,
      contacts: supplier.contacts.length > 0 ? supplier.contacts : [{ name: '', role: '', phone: '', email: '' }]
    });
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleDelete = async (supplier_id: string) => {
    setDeleteConfirmId(supplier_id);
    setActiveMenu(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const response = await fetch(`/api/suppliers/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchSuppliers();
      }
    } catch (err) {
      console.error(err);
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="pt-20 md:pt-24 pb-12 px-4 md:px-10 max-w-7xl w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold tracking-widest uppercase mb-3">
            Directory & Network
          </div>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight leading-none mb-4">Material Suppliers</h2>
          <p className="text-on-surface-variant max-w-xl text-base md:text-lg leading-relaxed">
            Maintain your verified partner network. Manage categories, track ratings, and oversee organizational compliance at scale.
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingSupplier(null);
            setFormData({
              name: '',
              category: categories[0]?.name || '',
              status: 'active',
              contacts: [{ name: '', role: '', phone: '', email: '' }]
            });
            setIsModalOpen(true);
          }}
          className="group flex items-center justify-center gap-3 bg-gradient-to-br from-primary to-primary-dim text-white px-6 py-4 rounded-xl font-headline font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all w-full md:w-auto"
        >
          <UserPlus size={20} />
          Add Supplier
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/10 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-high">
              <tr>
                <th className="px-4 md:px-6 py-4 font-headline text-[10px] uppercase tracking-widest text-on-surface-variant">Supplier</th>
                <th className="hidden md:table-cell px-6 py-4 font-headline text-[10px] uppercase tracking-widest text-on-surface-variant">Category</th>
                <th className="px-4 md:px-6 py-4 font-headline text-[10px] uppercase tracking-widest text-on-surface-variant">Contacts</th>
                <th className="px-4 md:px-6 py-4 font-headline text-[10px] uppercase tracking-widest text-on-surface-variant text-center">Status</th>
                <th className="px-4 md:px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">Loading suppliers...</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">No suppliers found.</td>
                </tr>
              ) : (
                suppliers.map((s, index) => (
                  <tr key={s.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-4 md:px-6 py-5">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                          <Factory className="text-primary" size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-headline font-bold text-xs md:text-sm text-on-surface truncate max-w-[80px] md:max-w-none">{s.name}</p>
                          <p className="text-[9px] md:text-xs text-on-surface-variant">ID: {s.supplier_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-5">
                      <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider">{s.category}</span>
                    </td>
                    <td className="px-4 md:px-6 py-5">
                      <div className="space-y-2 md:space-y-3">
                        {s.contacts.slice(0, 1).map((contact, idx) => (
                          <div key={idx} className="border-l-2 border-primary/20 pl-2 md:pl-3">
                            <p className="text-[11px] md:text-sm font-bold text-on-surface truncate max-w-[100px] md:max-w-none">{contact.name}</p>
                            <div className="flex flex-col md:flex-row md:flex-wrap gap-x-4 gap-y-0.5">
                              <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                                <Phone size={10} className="text-primary/60" />
                                {contact.phone}
                              </div>
                            </div>
                          </div>
                        ))}
                        {s.contacts.length > 1 && (
                          <p className="text-[9px] text-primary font-medium pl-2 md:pl-3">+{s.contacts.length - 1} more</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-5 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider",
                        s.status === 'active' ? "bg-tertiary-container text-on-tertiary-container" : "bg-error-container text-on-error-container"
                      )}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-5 text-right relative">
                      <button 
                        onClick={() => setActiveMenu(activeMenu === s.id ? null : s.id)}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-container-high transition-all text-on-surface-variant hover:text-primary"
                      >
                        <MoreVertical size={20} />
                      </button>
                      <AnimatePresence>
                        {activeMenu === s.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: index >= suppliers.length - 2 ? 10 : -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: index >= suppliers.length - 2 ? 10 : -10 }}
                              className={cn(
                                "absolute right-6 w-32 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 z-20 overflow-hidden",
                                index >= suppliers.length - 2 ? "bottom-12" : "top-12"
                              )}
                            >
                              <button 
                                onClick={() => handleEdit(s)}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(s.supplier_id)}
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
      </div>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-surface rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low">
                <h3 className="text-xl font-headline font-bold text-on-surface">
                  {editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
                </h3>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingSupplier(null);
                  }} 
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Company Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                      placeholder="e.g. Global Steel Corp"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Primary Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Contact Persons</label>
                    <button
                      type="button"
                      onClick={handleAddContact}
                      className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                    >
                      <Plus size={14} />
                      Add Contact
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.contacts.map((contact, index) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={index} 
                        className="p-4 bg-surface-container-lowest border border-outline-variant/10 rounded-xl relative group"
                      >
                        {formData.contacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveContact(index)}
                            className="absolute top-2 right-2 p-1 text-on-surface-variant hover:text-error transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            required
                            placeholder="Full Name"
                            value={contact.name}
                            onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                            className="px-3 py-2 bg-surface-container-low border border-outline-variant/10 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                          />
                          <input
                            placeholder="Role (e.g. Sales Manager)"
                            value={contact.role}
                            onChange={(e) => handleContactChange(index, 'role', e.target.value)}
                            className="px-3 py-2 bg-surface-container-low border border-outline-variant/10 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                          />
                          <input
                            placeholder="Phone Number"
                            value={contact.phone}
                            onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                            className="px-3 py-2 bg-surface-container-low border border-outline-variant/10 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                          />
                          <input
                            type="email"
                            placeholder="Email Address"
                            value={contact.email}
                            onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                            className="px-3 py-2 bg-surface-container-low border border-outline-variant/10 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingSupplier(null);
                    }}
                    className="flex-1 px-6 py-4 border border-outline-variant/20 rounded-xl font-headline font-bold text-on-surface hover:bg-surface-container-high transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-gradient-to-br from-primary to-primary-dim text-white rounded-xl font-headline font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                  >
                    {editingSupplier ? 'Update Supplier' : 'Register Supplier'}
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
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This will remove them from your partner network."
      />
    </div>
  );
}
