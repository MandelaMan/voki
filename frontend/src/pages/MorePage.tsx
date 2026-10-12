import { Link } from 'react-router-dom';
import {
  User, Building2, Tag, Truck, BarChart3, Bell,
  Moon, Sun, LogOut, ChevronRight,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthStore } from '../stores';
import { toggleColorMode, useIsDark } from '../components/layout/ThemeToggle';
import { useLogout } from '../hooks/useLogout';

const menuItems = [
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/businesses', icon: Building2, label: 'Businesses' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/suppliers', icon: Truck, label: 'Suppliers' },
  { to: '/sales', icon: BarChart3, label: 'Sales History' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

export default function MorePage() {
  const { user } = useAuthStore();
  const isDark = useIsDark();
  const { logout, pending } = useLogout();

  return (
    <div className="page-stack">
      <PageHeader title="More" subtitle="Settings and account" />

      <Card className="flex items-center gap-4 !p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-body-medium font-bold">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <p className="text-body-medium font-semibold">{user?.firstName} {user?.lastName}</p>
          <p className="text-caption text-slate-500 mt-0.5">{user?.email}</p>
        </div>
      </Card>

      <div className="space-y-2">
        {menuItems.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to}>
            <Card className="flex items-center justify-between !p-3.5 active:scale-[0.99] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/25 text-primary-600 flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <span className="text-body-medium font-medium">{label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </Card>
          </Link>
        ))}
      </div>

      <Card className="!p-1">
        <button
          onClick={toggleColorMode}
          className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-pressed={isDark}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <span className="text-body-medium font-medium">{isDark ? 'Dark mode' : 'Light mode'}</span>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors shrink-0 ${isDark ? 'bg-primary-600' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform m-0.5 ${isDark ? 'translate-x-5' : ''}`} />
          </div>
        </button>
      </Card>

      <button
        type="button"
        onClick={logout}
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-red-600 text-body-medium font-semibold hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
      >
        <LogOut size={18} />
        {pending ? 'Logging out...' : 'Log out'}
      </button>
    </div>
  );
}
