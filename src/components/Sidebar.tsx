import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, 
  Factory, 
  FileText, 
  ClipboardCheck, 
  BarChart3, 
  Archive, 
  PlusCircle,
  Settings as SettingsIcon,
  Building,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Executive Summary', path: '/', icon: BarChart3 },
  { name: 'Inventory', path: '/inventory', icon: Package },
  { name: 'Suppliers', path: '/suppliers', icon: Factory },
  { name: 'Quotations', path: '/quotations', icon: FileText },
  { name: 'Allocations', path: '/allocations', icon: ClipboardCheck },
  { name: 'Settings', path: '/settings', icon: SettingsIcon },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  const sidebarContent = (
    <div className="h-full flex flex-col py-4 gap-2 bg-surface-container-low border-r border-outline-variant/30">
      <div className="px-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center text-on-primary">
            <Package size={20} />
          </div>
          <div>
            <h1 className="font-headline font-black text-primary dark:text-primary text-lg leading-tight">Procurement</h1>
            <p className="font-headline tracking-wide text-[10px] uppercase text-on-surface-variant">Precision Architect</p>
          </div>
        </div>
      </div>

      {user?.account_name && (
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 px-3 py-2 bg-primary-container/20 rounded-lg border border-primary-container/30">
            <Building size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary truncate">{user.account_name}</span>
          </div>
        </div>
      )}

      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 ease-in-out font-headline tracking-wide text-xs uppercase",
              isActive 
                ? "bg-surface text-primary shadow-sm font-semibold" 
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            )}
          >
            <item.icon size={18} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-4 space-y-4 pt-4">
        <button className="w-full primary-gradient text-on-primary py-3 rounded-lg font-headline font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
          <PlusCircle size={16} />
          New Request
        </button>
        <div className="border-t border-outline-variant/30 pt-4 pb-2">
          <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant font-headline tracking-wide text-xs uppercase hover:text-on-surface" href="#">
            <HelpCircle size={16} />
            <span>Support</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant font-headline tracking-wide text-xs uppercase hover:text-on-surface" href="#">
            <Archive size={16} />
            <span>Archive</span>
          </a>
          <button 
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-2 text-red-500 font-headline tracking-wide text-xs uppercase hover:bg-red-500/10 transition-colors mt-2"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-low border-t border-outline-variant/30 px-1 py-2 flex items-center justify-around shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-lg bg-opacity-90">
        <div className="flex w-full max-w-lg mx-auto justify-around items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 min-w-[64px]",
                isActive 
                  ? "text-primary bg-primary/10 scale-105" 
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={24} className={cn("transition-transform duration-300", isActive && "scale-110")} />
                  <span className={cn(
                    "text-[9px] font-headline font-bold uppercase tracking-tight transition-all duration-300",
                    isActive ? "opacity-100 translate-y-0" : "opacity-60 translate-y-0.5"
                  )}>
                    {item.name.split(' ')[0]}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
