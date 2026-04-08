import { Search, Bell, Settings, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function TopBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 z-50 glass-nav border-b border-outline-variant/10 h-16 flex justify-between items-center px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={16} />
          <input 
            className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-on-surface-variant/40" 
            placeholder="Search Inventory..." 
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={toggleTheme}
          className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors">
          <Settings size={20} />
        </button>
        <button 
          onClick={logout}
          className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
        <div className="h-8 w-[1px] bg-outline-variant/20 mx-2"></div>
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface leading-none">{user?.full_name || 'The Curated Ledger'}</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">{user?.role === 'admin' ? 'Executive Profile' : 'Staff Profile'}</p>
          </div>
          <img 
            className="w-10 h-10 rounded-full object-cover border border-outline-variant/20" 
            src={user?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuDw8AYkcetbE2poSWx8-C-cRP8fhFXbpuJtb5gMdJvK87H_jsCcKGnlEFkMA4t3YvttTnZv9_1OxnHACvnsTfTP6w945UYpYKjgUMrvC16sPlx9964GSkNib1iN_iw6GuIA5cAwHRHfn184-XAuc_a-Pa0JV19xBhnx1oN-ZbveTKg8K6Q3gT-voyyHPiZe_nfNSRbRfQnzKDBRmVHHiYgvBBTRKqCxyuobJCFmtdeDhtKySpv2EK1h3jiEpPJDlBi1MN2w7zDuRi4"} 
            alt="Profile"
          />
        </div>
      </div>
    </header>
  );
}
