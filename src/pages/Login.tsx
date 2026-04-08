import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Package, Lock, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('admin@ledger.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        login(data.token, data.user);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface-container-lowest p-8 rounded-2xl shadow-xl border border-outline-variant/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl primary-gradient flex items-center justify-center text-on-primary mb-4 shadow-lg shadow-primary/20">
            <Package size={32} />
          </div>
          <h1 className="font-headline font-black text-2xl text-blue-800 tracking-tight">The Curated Ledger</h1>
          <p className="text-on-surface-variant font-body text-sm">Precision Architect Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/40 transition-all"
                placeholder="name@company.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/40 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-error-container/20 text-error text-xs font-semibold rounded-lg border border-error/20">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full primary-gradient text-on-primary py-4 rounded-xl font-headline font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Ledger'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-outline-variant/10 text-center">
          <p className="text-xs text-on-surface-variant">
            © 2024 The Curated Ledger • Secure Access
          </p>
        </div>
      </motion.div>
    </div>
  );
}
