import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp, Settings as SettingsIcon, Users, Building, Shield, UserPlus, Camera, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { User as UserType, Account, Project } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';

interface Category {
  id: number;
  name: string;
}

export default function Settings() {
  const { token, user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  
  // New User state
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'user', account_id: '' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  // New Account state
  const [newAccountName, setNewAccountName] = useState('');

  // Collapsible states
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; type: 'category' | 'user' | 'project' } | null>(null);

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
      }
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError(err.message || 'Could not load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setProjects(data);
        }
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchUsers = async () => {
    if (!token || (user?.role !== 'admin' && user?.role !== 'super_admin')) return;
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchAccounts = async () => {
    if (!token || user?.role !== 'super_admin') return;
    try {
      const response = await fetch('/api/accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProjects();
    fetchUsers();
    fetchAccounts();
  }, [token, user?.role]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setError('');
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

      setNewCategoryName('');
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editingName.trim()) return;
    setError('');
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editingName })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update category');
      }

      setEditingId(null);
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    setDeleteConfirm({ id, type: 'category' });
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setError('');
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

      setNewProjectName('');
      fetchProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteProject = async (id: number) => {
    setDeleteConfirm({ id, type: 'project' });
  };

  const handleDeleteUser = async (id: number) => {
    setDeleteConfirm({ id, type: 'user' });
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    try {
      let endpoint = '';
      if (type === 'category') endpoint = `/api/categories/${id}`;
      else if (type === 'project') endpoint = `/api/projects/${id}`;
      else endpoint = `/api/users/${id}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`Failed to delete ${type}`);
      
      if (type === 'category') fetchCategories();
      else if (type === 'project') fetchProjects();
      else fetchUsers();
      
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message);
      setDeleteConfirm(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.full_name) return;
    setError('');
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newUser,
          account_id: newUser.account_id ? parseInt(newUser.account_id) : undefined
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add user');
      }

      setNewUser({ email: '', password: '', full_name: '', role: 'user', account_id: '', avatar_url: '' } as any);
      setIsAddingUser(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: editingUser.full_name,
          role: editingUser.role,
          account_id: editingUser.account_id,
          password: (editingUser as any).newPassword || undefined,
          avatar_url: editingUser.avatar_url
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update user');
      }

      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    setError('');
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newAccountName })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add account');
      }

      setNewAccountName('');
      fetchAccounts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError('Image size must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isEditing && editingUser) {
        setEditingUser({ ...editingUser, avatar_url: base64String });
      } else {
        setNewUser({ ...newUser, avatar_url: base64String } as any);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 md:space-y-8 pt-20 md:pt-24">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight flex items-center gap-3">
          <SettingsIcon className="text-primary" size={32} />
          Settings
        </h1>
        <p className="text-sm md:text-base text-on-surface-variant font-medium mt-1">Manage system configurations, users, accounts, and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {/* User Management Section (Admin & Super Admin) */}
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden">
              <button 
                onClick={() => setIsUsersOpen(!isUsersOpen)}
                className="w-full p-6 flex items-center justify-between hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold text-on-surface">User Management</h2>
                    <p className="text-xs text-on-surface-variant">Manage staff and administrative access.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!isAddingUser && !editingUser && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAddingUser(true);
                      }}
                      className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold flex items-center gap-2 text-xs hover:bg-primary hover:text-on-primary transition-all"
                    >
                      <Plus size={16} />
                      Add User
                    </div>
                  )}
                  {isUsersOpen ? <ChevronUp size={20} className="text-on-surface-variant" /> : <ChevronDown size={20} className="text-on-surface-variant" />}
                </div>
              </button>

              <AnimatePresence>
              {isUsersOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 pt-0 border-t border-outline-variant/10">
                    {isAddingUser && (
                      <div className="mb-8 mt-6 p-6 bg-surface-container-low rounded-2xl border border-outline-variant/20">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold text-on-surface">Create New User</h4>
                          <button onClick={() => setIsAddingUser(false)} className="text-on-surface-variant/60 hover:text-on-surface">
                            <X size={20} />
                          </button>
                        </div>
                        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2 flex flex-col items-center gap-4 mb-4">
                            <div className="relative group">
                              <div className="w-24 h-24 rounded-full bg-surface-container-low border-2 border-primary/20 overflow-hidden">
                                {(newUser as any).avatar_url ? (
                                  <img src={(newUser as any).avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                                    <Users size={40} />
                                  </div>
                                )}
                              </div>
                              <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                                <Camera size={24} />
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, false)} />
                              </label>
                            </div>
                            <p className="text-xs text-on-surface-variant">Click to upload profile picture</p>
                          </div>
                          <input
                            type="text"
                            value={newUser.full_name}
                            onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                            placeholder="Full Name"
                            className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none text-on-surface"
                          />
                          <input
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            placeholder="Email Address"
                            className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none text-on-surface"
                          />
                          <input
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            placeholder="Password"
                            className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none text-on-surface"
                          />
                          <select
                            value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                            className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none text-on-surface"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            {user?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                          </select>
                          {user?.role === 'super_admin' && (
                            <select
                              value={newUser.account_id}
                              onChange={(e) => setNewUser({ ...newUser, account_id: e.target.value })}
                              className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none text-on-surface"
                            >
                              <option value="">Select Account</option>
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                              ))}
                            </select>
                          )}
                          <button
                            type="submit"
                            className="md:col-span-2 px-6 py-2 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                          >
                            <UserPlus size={18} />
                            Create User
                          </button>
                        </form>
                      </div>
                    )}

                    {editingUser && (
                      <div className="mb-8 mt-6 p-6 bg-primary/5 rounded-2xl border border-primary/20">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold text-primary">Edit User: {editingUser.email}</h4>
                          <button onClick={() => setEditingUser(null)} className="text-primary/60 hover:text-primary">
                            <X size={20} />
                          </button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2 flex flex-col items-center gap-4 mb-4">
                            <div className="relative group">
                              <div className="w-24 h-24 rounded-full bg-surface-container-low border-2 border-primary/20 overflow-hidden">
                                {editingUser.avatar_url ? (
                                  <img src={editingUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                                    <Users size={40} />
                                  </div>
                                )}
                              </div>
                              <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                                <Camera size={24} />
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
                              </label>
                            </div>
                            <p className="text-xs text-on-surface-variant">Click to upload profile picture</p>
                          </div>
                          <input
                            type="text"
                            value={editingUser.full_name}
                            onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                            placeholder="Full Name"
                            className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none text-on-surface"
                          />
                          <select
                            value={editingUser.role}
                            onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                            className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none text-on-surface"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            {user?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                          </select>
                          <input
                            type="password"
                            value={(editingUser as any).newPassword || ''}
                            onChange={(e) => setEditingUser({ ...editingUser, newPassword: e.target.value } as any)}
                            placeholder="New Password (leave blank to keep current)"
                            className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none text-on-surface"
                          />
                          {user?.role === 'super_admin' && (
                            <select
                              value={editingUser.account_id || ''}
                              onChange={(e) => setEditingUser({ ...editingUser, account_id: parseInt(e.target.value) })}
                              className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none text-on-surface"
                            >
                              <option value="">Select Account</option>
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                              ))}
                            </select>
                          )}
                          <button
                            type="submit"
                            className="md:col-span-2 px-6 py-2 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                          >
                            <Save size={18} />
                            Save Changes
                          </button>
                        </form>
                      </div>
                    )}

                    <div className="overflow-x-auto mt-6">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider border-b border-outline-variant/10">
                            <th className="pb-4 px-4">NAME</th>
                            <th className="pb-4 px-4">EMAIL</th>
                            <th className="pb-4 px-4">ROLE</th>
                            <th className="pb-4 px-4">ACCOUNT</th>
                            <th className="pb-4 px-4"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {users.map((u) => {
                            const canEdit = user?.role === 'super_admin' || (user?.role === 'admin' && u.role !== 'super_admin');
                            return (
                              <tr key={u.id} className="group hover:bg-surface-container-low/50 transition-colors">
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-surface-container-low overflow-hidden border border-outline-variant/10 flex-shrink-0">
                                      {u.avatar_url ? (
                                        <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40 bg-primary/5">
                                          <Users size={14} />
                                        </div>
                                      )}
                                    </div>
                                    <span className="font-semibold text-on-surface">{u.full_name}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-on-surface-variant">{u.email}</td>
                                <td className="py-4 px-4">
                                  {u.role === 'super_admin' ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/10 text-secondary uppercase w-fit">SUPER</span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/10 text-secondary uppercase w-fit">ADMIN</span>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">ADMIN</span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-on-surface-variant text-sm">
                                  {u.account_name || 'System'}
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    {canEdit && (
                                      <>
                                        <button
                                          onClick={() => setEditingUser(u)}
                                          className="p-2 text-on-surface-variant/60 hover:text-primary transition-colors"
                                        >
                                          <Edit2 size={16} />
                                        </button>
                                        {u.id !== user?.id && (
                                          <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="p-2 text-on-surface-variant/60 hover:text-error transition-colors"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Account Management Section (Super Admin Only) */}
        {user?.role === 'super_admin' && (
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <button 
              onClick={() => setIsAccountsOpen(!isAccountsOpen)}
              className="w-full p-6 flex items-center justify-between hover:bg-surface-container-low transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-tertiary/5 text-tertiary flex items-center justify-center">
                  <Building size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">Account Management</h2>
                  <p className="text-xs text-on-surface-variant">Create and manage top-level accounts.</p>
                </div>
              </div>
              {isAccountsOpen ? <ChevronUp size={20} className="text-on-surface-variant" /> : <ChevronDown size={20} className="text-on-surface-variant" />}
            </button>

            <AnimatePresence>
              {isAccountsOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0 border-t border-outline-variant/10">
                    <form onSubmit={handleAddAccount} className="flex gap-3 mb-6 mt-6">
                      <input
                        type="text"
                        value={newAccountName}
                        onChange={(e) => setNewAccountName(e.target.value)}
                        placeholder="New account name..."
                        className="flex-1 px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary outline-none text-on-surface"
                      />
                      <button
                        type="submit"
                        className="px-6 py-2 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Add Account
                      </button>
                    </form>

                    <div className="space-y-2">
                      {accounts.map((acc) => (
                        <div key={acc.id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                          <p className="font-medium text-on-surface">{acc.name}</p>
                          <p className="text-[10px] text-on-surface-variant/60 font-bold">ID: {acc.id}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Categories Section */}
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden">
          <button 
            onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
            className="w-full p-6 flex items-center justify-between hover:bg-surface-container-low transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/5 text-secondary flex items-center justify-center">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-on-surface">Material Categories</h2>
                <p className="text-xs text-on-surface-variant">Manage the categories available for materials and suppliers.</p>
              </div>
            </div>
            {isCategoriesOpen ? <ChevronUp size={20} className="text-on-surface-variant" /> : <ChevronDown size={20} className="text-on-surface-variant" />}
          </button>

          <AnimatePresence>
            {isCategoriesOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 pt-0 border-t border-outline-variant/10">
                  <form onSubmit={handleAddCategory} className="flex gap-3 mb-6 mt-6">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name..."
                      className="flex-1 px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-on-surface"
                    />
                    <button
                      type="submit"
                      className="px-6 py-2 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                  </form>

                  {error && (
                    <div className="mb-4 p-3 bg-error/5 text-error rounded-xl text-sm border border-error/20">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    {loading ? (
                      <div className="text-center py-8 text-on-surface-variant/60">Loading categories...</div>
                    ) : categories.length === 0 ? (
                      <div className="text-center py-8 text-on-surface-variant/60">No categories found.</div>
                    ) : (
                      categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 hover:border-outline-variant/30 transition-all group"
                        >
                          {editingId === category.id ? (
                            <div className="flex-1 flex gap-2 mr-4">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 px-3 py-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg focus:ring-2 focus:ring-primary outline-none text-on-surface"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateCategory(category.id)}
                                className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                              >
                                <Save size={18} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-2 text-on-surface-variant/60 hover:bg-surface-container-high rounded-lg transition-colors"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="font-medium text-on-surface">{category.name}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingId(category.id);
                                    setEditingName(category.name);
                                  }}
                                  className="p-2 text-on-surface-variant/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="p-2 text-on-surface-variant/60 hover:text-error hover:bg-error/10 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Projects Section */}
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden">
          <button 
            onClick={() => setIsProjectsOpen(!isProjectsOpen)}
            className="w-full p-6 flex items-center justify-between hover:bg-surface-container-low transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
                <Building size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-on-surface">Active Projects</h2>
                <p className="text-xs text-on-surface-variant">Manage the list of active architectural projects.</p>
              </div>
            </div>
            {isProjectsOpen ? <ChevronUp size={20} className="text-on-surface-variant" /> : <ChevronDown size={20} className="text-on-surface-variant" />}
          </button>

          <AnimatePresence>
            {isProjectsOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 pt-0 border-t border-outline-variant/10">
                  <form onSubmit={handleAddProject} className="flex gap-3 mb-6 mt-6">
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="New project name..."
                      className="flex-1 px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-on-surface"
                    />
                    <button
                      type="submit"
                      className="px-6 py-2 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                  </form>

                  <div className="space-y-2">
                    {projects.length === 0 ? (
                      <div className="text-center py-8 text-on-surface-variant/60">No projects found.</div>
                    ) : (
                      projects.map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 hover:border-outline-variant/30 transition-all group"
                        >
                          <span className="text-sm font-medium text-on-surface">{project.name}</span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                              title="Delete Project"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>

    <ConfirmationModal
      isOpen={deleteConfirm !== null}
      onClose={() => setDeleteConfirm(null)}
      onConfirm={confirmDeleteAction}
      title="Confirm Deletion"
      message={`Are you sure you want to delete this ${deleteConfirm?.type}? All associated data will be archived.`}
    />
  </div>
);
}
