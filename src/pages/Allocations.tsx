import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Allocation, Material, Project } from '../types';
import { ClipboardCheck, Plus, MoreVertical, Calendar, Download, ChevronLeft, ChevronRight, Layers, X, AlertCircle, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Allocations() {
  const { token } = useAuth();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [projectError, setProjectError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    project_name: '',
    material_id: '',
    quantity: 0,
    status: 'pending' as 'pending' | 'dispatched' | 'in_transit',
    person_responsible: ''
  });

  const fetchAllocations = async () => {
    try {
      const response = await fetch('/api/allocations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setAllocations(data);
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

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) setProjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllocations();
    fetchMaterials();
    fetchProjects();
  }, [token]);

  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const url = editingAllocation ? `/api/allocations/${editingAllocation.id}` : '/api/allocations';
      const method = editingAllocation ? 'PUT' : 'POST';
      
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
        throw new Error(data.message || 'Failed to save allocation');
      }

      await fetchAllocations();
      setIsModalOpen(false);
      setEditingAllocation(null);
      setFormData({
        project_name: '',
        material_id: materials[0]?.material_id || '',
        quantity: 0,
        status: 'pending',
        person_responsible: ''
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjectError('');
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newProjectName })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add project');
      }

      await fetchProjects();
      setFormData(prev => ({ ...prev, project_name: newProjectName }));
      setIsProjectModalOpen(false);
      setNewProjectName('');
    } catch (err: any) {
      setProjectError(err.message);
    }
  };

  const handleEdit = (a: Allocation) => {
    setEditingAllocation(a);
    setFormData({
      project_name: a.project_name,
      material_id: a.material_id,
      quantity: parseFloat(a.quantity),
      status: a.status as any,
      person_responsible: a.person_responsible
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
      const response = await fetch(`/api/allocations/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchAllocations();
      }
    } catch (err) {
      console.error(err);
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-surface">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 md:mb-12">
        <div>
          <span className="font-inter text-xs font-semibold tracking-widest text-primary uppercase mb-2 block">Supply Chain Intelligence</span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">Project Allocation Log</h2>
          <p className="text-sm md:text-base text-on-surface-variant mt-2 max-w-xl">A high-precision audit trail for capital assets and material distribution across active architectural sites.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({
              project_name: projects[0]?.name || '',
              material_id: materials[0]?.material_id || '',
              quantity: 0,
              status: 'pending',
              person_responsible: ''
            });
            setIsModalOpen(true);
          }}
          className="bg-gradient-to-br from-primary to-primary-dim text-white px-8 py-3 rounded-xl font-headline font-bold text-sm shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 w-full md:w-auto"
        >
          <Plus size={20} />
          Log Allocation
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/10 shadow-sm">
        <div className="px-6 py-4 bg-surface-container-high/40 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex gap-1">
              <button className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-semibold">All Records</button>
              <button className="text-on-surface-variant hover:bg-surface-container-high px-3 py-1.5 rounded-lg text-xs font-semibold">High Value</button>
              <button className="text-on-surface-variant hover:bg-surface-container-high px-3 py-1.5 rounded-lg text-xs font-semibold">Critical Supply</button>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant border border-outline-variant/30 px-3 py-1.5 rounded-lg hover:bg-surface">
              <Calendar size={14} />
              Date Range
            </button>
            <button className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant border border-outline-variant/30 px-3 py-1.5 rounded-lg hover:bg-surface">
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant/10">
                <th className="px-4 md:px-6 py-4 font-inter font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">Project</th>
                <th className="px-4 md:px-6 py-4 font-inter font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">Material</th>
                <th className="px-4 md:px-6 py-4 font-inter font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">Qty</th>
                <th className="px-4 md:px-6 py-4 font-inter font-bold text-[10px] text-on-surface-variant uppercase tracking-widest text-center">Status</th>
                <th className="hidden md:table-cell px-6 py-4 font-inter font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">Date</th>
                <th className="hidden md:table-cell px-6 py-4 font-inter font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">Responsible</th>
                <th className="px-4 md:px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-on-surface-variant">Loading allocations...</td></tr>
              ) : allocations.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-on-surface-variant">No allocations found.</td></tr>
              ) : (
                allocations.map((a, index) => (
                  <tr key={a.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-4 md:px-6 py-5">
                      <p className="font-headline font-bold text-xs md:text-sm text-on-surface truncate max-w-[80px] md:max-w-none">{a.project_name}</p>
                    </td>
                    <td className="px-4 md:px-6 py-5">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                          <Layers size={18} />
                        </div>
                        <p className="font-inter text-sm text-on-surface-variant font-medium">{a.material_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-headline text-sm font-extrabold text-on-surface">{a.quantity}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        a.status === 'dispatched' ? "bg-tertiary-container/30 text-tertiary" : 
                        a.status === 'in_transit' ? "bg-error-container/20 text-error" : 
                        "bg-surface-container-high text-on-surface-variant"
                      )}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-inter text-xs text-on-surface">{format(new Date(a.date_allocated), 'MMM dd, yyyy')}</p>
                      <p className="font-inter text-[10px] text-outline">{format(new Date(a.date_allocated), 'hh:mm a')}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center text-[10px] font-bold text-primary">
                          {a.person_responsible.split(' ').map(n => n[0]).join('')}
                        </div>
                        <p className="font-inter text-xs text-on-surface">{a.person_responsible}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right relative">
                      <button 
                        onClick={() => setActiveMenu(activeMenu === a.id ? null : a.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-on-surface-variant hover:text-primary rounded-lg hover:bg-primary/10"
                      >
                        <MoreVertical size={20} />
                      </button>
                      <AnimatePresence>
                        {activeMenu === a.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: index >= allocations.length - 2 ? 10 : -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: index >= allocations.length - 2 ? 10 : -10 }}
                              className={cn(
                                "absolute right-6 w-32 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 z-20 overflow-hidden",
                                index >= allocations.length - 2 ? "bottom-12" : "top-12"
                              )}
                            >
                              <button 
                                onClick={() => handleEdit(a)}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-primary/10 transition-colors border-b border-outline-variant/10"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(a.id)}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-error hover:bg-error/10 transition-colors"
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

      {/* Log Allocation Modal */}
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
                  {editingAllocation ? 'Edit Allocation' : 'Log New Allocation'}
                </h3>
                <button onClick={() => {
                  setIsModalOpen(false);
                  setEditingAllocation(null);
                }} className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-full transition-colors">
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
                    <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Project</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select 
                          required
                          className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all appearance-none"
                          value={formData.project_name}
                          onChange={e => setFormData({...formData, project_name: e.target.value})}
                        >
                          <option value="" disabled>Select a project</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                          <Plus size={14} />
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsProjectModalOpen(true)}
                        className="p-3 bg-surface-container-high text-primary hover:bg-primary/10 rounded-xl transition-colors"
                        title="Add New Project"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Material</label>
                    <select 
                      required
                      className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all appearance-none"
                      value={formData.material_id}
                      onChange={e => setFormData({...formData, material_id: e.target.value})}
                    >
                      {materials.map(m => (
                        <option key={m.id} value={m.material_id}>{m.name} (Stock: {m.current_stock})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Quantity</label>
                      <input 
                        required
                        type="number"
                        step="0.01"
                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all"
                        value={formData.quantity}
                        onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Status</label>
                      <select 
                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all appearance-none"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                      >
                        <option value="pending">Pending</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="in_transit">In Transit</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Person Responsible</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. John Doe"
                      className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all"
                      value={formData.person_responsible}
                      onChange={e => setFormData({...formData, person_responsible: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingAllocation(null);
                    }}
                    className="flex-1 px-6 py-4 rounded-xl font-headline font-bold text-sm bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 rounded-xl font-headline font-bold text-sm bg-primary text-on-primary shadow-xl shadow-primary/20 transition-all"
                  >
                    {editingAllocation ? 'Update Allocation' : 'Log Allocation'}
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
        title="Delete Allocation"
        message="Are you sure you want to delete this allocation record? This will remove it from the project log."
      />

      {/* Add Project Modal */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-outline-variant/20"
            >
              <div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-high/30">
                <h3 className="font-headline font-extrabold text-xl text-on-surface flex items-center gap-2">
                  <Building2 size={20} className="text-primary" />
                  Add New Project
                </h3>
                <button onClick={() => setIsProjectModalOpen(false)} className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddProject} className="p-6 space-y-4">
                {projectError && (
                  <div className="p-3 bg-error-container text-on-error-container rounded-lg text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={14} />
                    {projectError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Project Name</label>
                  <input 
                    required
                    autoFocus
                    type="text"
                    placeholder="e.g. Skyline Tower B"
                    className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsProjectModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-headline font-bold text-xs bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl font-headline font-bold text-xs bg-primary text-on-primary shadow-lg shadow-primary/20 transition-all"
                  >
                    Add Project
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
