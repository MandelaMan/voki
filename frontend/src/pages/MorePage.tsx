import { Link } from 'react-router-dom';
import {
  User, Building2, Tag, Truck, Bell,
  Moon, Sun, LogOut, ChevronRight, Shield, FileText, Sparkles, KeyRound,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthStore, usePremium } from '../stores';
import { toggleColorMode, useIsDark } from '../components/layout/ThemeToggle';
import { useLogout } from '../hooks/useLogout';

type MenuItem = {
  to: string;
  icon: typeof Sparkles;
  label: string;
  hint?: string;
  badge?: string;
};

const adminMenuItems: MenuItem[] = [
  { to: '/admin', icon: Sparkles, label: 'Overview' },
  { to: '/admin/subscribers', icon: User, label: 'Subscribers' },
  { to: '/admin/shops', icon: Building2, label: 'Shops' },
  { to: '/admin/stock', icon: Tag, label: 'Stock' },
  { to: '/admin/sales', icon: Truck, label: 'Sales' },
  { to: '/admin/purchases', icon: Truck, label: 'Purchases' },
  { to: '/admin/issues', icon: Bell, label: 'Issues' },
  { to: '/admin/pricing', icon: Sparkles, label: 'Pricing' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/privacy', icon: Shield, label: 'Privacy Policy' },
  { to: '/terms', icon: FileText, label: 'Terms and Conditions' },
];

function MenuLink({ to, icon: Icon, label, hint, badge }: MenuItem) {
  return (
    <Link to={to}>
      <Card className="flex items-center justify-between !p-3.5 active:scale-[0.99] transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/25 text-primary-600 flex items-center justify-center shrink-0">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-body-medium font-semibold text-slate-800 dark:text-slate-100">{label}</span>
              {badge && (
                <span className="text-micro px-1.5 py-0.5 rounded-md bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {badge}
                </span>
              )}
            </div>
            {hint && <p className="text-caption text-slate-500 mt-0.5 truncate">{hint}</p>}
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 shrink-0" />
      </Card>
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-heading text-slate-500 px-1">{title}</h3>
      {children}
    </section>
  );
}

export default function MorePage() {
  const { user } = useAuthStore();
  const isPremium = usePremium();
  const isDark = useIsDark();
  const { logout, pending } = useLogout();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="page-stack">
      <PageHeader title="Settings" subtitle="Account, shop setup, and integrations" />

      <Card className="flex items-center gap-4 !p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-body-medium font-bold">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="min-w-0">
          <p className="text-body-medium font-semibold truncate">{user?.firstName} {user?.lastName}</p>
          <p className="text-caption text-slate-500 mt-0.5 truncate">{user?.email}</p>
          <p className="text-caption font-medium text-primary-600 mt-0.5">
            {isAdmin ? 'Super admin' : isPremium ? 'Premium' : 'Free plan'}
          </p>
        </div>
      </Card>

      {isAdmin ? (
        <div className="space-y-2">
          {adminMenuItems.map((item) => (
            <MenuLink key={item.to} {...item} />
          ))}
        </div>
      ) : (
        <>
          <Section title="Account">
            <MenuLink to="/profile" icon={User} label="Profile" hint="Name, phone, password" />
            <MenuLink to="/businesses" icon={Building2} label="Businesses" hint="Switch or edit your shops" />
            <MenuLink
              to="/plan"
              icon={Sparkles}
              label="Premium"
              hint={isPremium ? 'Billing and plan status' : 'Upgrade for receipts, scan, and more'}
              badge={isPremium ? undefined : 'Upgrade'}
            />
          </Section>

          <Section title="Shop setup">
            <MenuLink to="/categories" icon={Tag} label="Categories" hint="Group your products" />
            <MenuLink to="/suppliers" icon={Truck} label="Suppliers" hint="Who you buy from" />
            <MenuLink
              to="/settings/configurations"
              icon={KeyRound}
              label="Configurations"
              hint="Daraja, Gemini, and photo API keys"
              badge={isPremium ? undefined : 'Premium'}
            />
          </Section>

          <Section title="Alerts & legal">
            <MenuLink to="/notifications" icon={Bell} label="Notifications" hint="Stock alerts" />
            <MenuLink to="/privacy" icon={Shield} label="Privacy Policy" />
            <MenuLink to="/terms" icon={FileText} label="Terms and Conditions" />
          </Section>
        </>
      )}

      <Card className="!p-1">
        <button
          onClick={toggleColorMode}
          className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-pressed={isDark}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-700 dark:bg-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <span className="text-body-medium font-semibold text-slate-800 dark:text-slate-100">
              {isDark ? 'Dark mode' : 'Light mode'}
            </span>
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
