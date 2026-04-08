import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Stats } from '../types';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  PlusCircle, 
  Send, 
  CheckSquare,
  Factory,
  Zap,
  Microscope,
  Construction
} from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const chartData = [
  { name: 'Jan', value: 45 },
  { name: 'Feb', value: 60 },
  { name: 'Mar', value: 55 },
  { name: 'Apr', value: 85 },
  { name: 'May', value: 70 },
  { name: 'Jun', value: 95 },
];

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data && typeof data === 'object' && !data.message) {
          setStats(data);
        } else {
          console.error('Stats data is invalid:', data);
          setStats(null);
        }
      } catch (err) {
        console.error(err);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  if (loading) return <div className="p-4 md:p-8">Loading summary...</div>;

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-[1600px] mx-auto w-full p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl md:text-3xl font-bold text-on-surface leading-tight tracking-tight">Executive Summary</h2>
          <p className="text-sm md:text-base text-on-surface-variant font-body">Global Procurement Insights & Real-time Resource Allocation</p>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            Live Updates
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-semibold">
            Oct 24, 2023
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -4 }} className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-semibold text-tertiary flex items-center gap-0.5">
              <TrendingUp size={14} />
              12%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant font-semibold">Total Materials</p>
            <h3 className="font-headline text-4xl font-extrabold text-on-surface mt-1">{stats?.totalMaterials?.toLocaleString() || '0'}</h3>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-secondary-container text-on-secondary-container rounded-lg">
              <Clock size={20} />
            </div>
            <span className="text-xs font-semibold text-on-secondary-container flex items-center gap-0.5">
              <Clock size={14} />
              Awaiting
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant font-semibold">Pending Quotations</p>
            <h3 className="font-headline text-4xl font-extrabold text-on-surface mt-1">{stats?.pendingQuotes || '0'}</h3>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-error-container/20 text-error rounded-lg">
              <AlertTriangle size={20} />
            </div>
            <span className="px-2 py-0.5 bg-error-container text-on-error-container rounded-full text-[10px] font-bold">CRITICAL</span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant font-semibold">Low Stock Alerts</p>
            <h3 className="font-headline text-4xl font-extrabold text-on-surface mt-1">{stats?.criticalStock?.toString().padStart(2, '0') || '00'}</h3>
          </div>
        </motion.div>

        <div className="bg-primary p-6 rounded-xl flex flex-col gap-4 text-on-primary shadow-lg shadow-primary/20">
          <p className="text-[10px] font-label uppercase tracking-widest text-primary-fixed/80 font-bold">Quick Actions</p>
          <div className="flex flex-col gap-2">
            <button className="flex items-center justify-between w-full p-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs font-medium border border-white/10">
              Add Material <PlusCircle size={14} />
            </button>
            <button className="flex items-center justify-between w-full p-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs font-medium border border-white/10">
              New Quote Request <Send size={14} />
            </button>
            <button className="flex items-center justify-between w-full p-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs font-medium border border-white/10">
              Log Allocation <CheckSquare size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-8 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="font-headline text-xl font-bold">Allocation Trends</h4>
              <p className="text-sm text-on-surface-variant">Monthly procurement volume across all departments</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-xs font-medium bg-surface-container-high rounded-md shadow-sm text-on-surface">Monthly</button>
              <button className="px-3 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high rounded-md transition-colors">Quarterly</button>
            </div>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" opacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--color-on-surface-variant)' }} 
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'var(--color-surface-container-high)' }}
                  contentStyle={{ 
                    backgroundColor: 'var(--color-surface-container-lowest)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--color-outline-variant)', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    color: 'var(--color-on-surface)'
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? 'var(--color-primary)' : 'var(--color-primary-dim)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-outline-variant/10 pt-6">
            <div>
              <p className="text-[10px] font-label uppercase text-on-surface-variant">Total Value (Inventory)</p>
              <p className="text-xl font-headline font-bold">${stats?.totalValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-label uppercase text-on-surface-variant">Efficiency Score</p>
              <p className="text-xl font-headline font-bold">94.2%</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-headline text-lg font-bold">Recent Allocations</h4>
            <a className="text-primary text-xs font-semibold hover:underline" href="#">View All</a>
          </div>
          <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
            {[
              { name: 'Titanium Alloy T-800', div: 'Aerospace Div', qty: '450kg', val: '$12,450', time: '2h ago', icon: Microscope },
              { name: 'Structural Steel 20-A', div: 'Infra Unit', qty: '1,200kg', val: '$8,120', time: '5h ago', icon: Construction },
              { name: 'Copper Core Wiring', div: 'Power Grid', qty: '30 units', val: '$2,900', time: 'Yesterday', icon: Zap },
              { name: 'Composite Polymer', div: 'R&D Lab', qty: '12 liters', val: '$4,550', time: 'Yesterday', icon: Microscope },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl hover:bg-surface-container-low transition-colors flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                  <item.icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-on-surface">{item.name}</p>
                  <p className="text-xs text-on-surface-variant">{item.div} • {item.qty}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-on-surface">{item.val}</p>
                  <p className="text-[10px] text-on-surface-variant">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
