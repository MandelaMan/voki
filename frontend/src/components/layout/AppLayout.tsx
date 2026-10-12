import { useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Search,
  User,
  ChevronDown,
  WifiOff,
  Bell,
  BarChart3,
  Tag,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { VokiMark } from '../brand/VokiMark';
import { PageTransition } from './PageTransition';
import { InventoryFab } from './InventoryFab';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../../lib/utils';
import { useAuthStore, useBusinessStore } from '../../stores';
import { useOnlineStatus } from '../../hooks/useOfflineSync';
import { useLogout } from '../../hooks/useLogout';
import { offlineQueue } from '../../lib/offline';

const bottomNav = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/inventory', icon: Package, label: 'Stock' },
  { to: '/sales/new', icon: ShoppingCart, label: 'Sell' },
  { to: '/purchases', icon: Truck, label: 'Buy' },
  { to: '/more', icon: User, label: 'More' },
];

const sideItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Items' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/purchases', icon: Truck, label: 'Purchases' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/suppliers', icon: Users, label: 'Suppliers' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/more', icon: Settings, label: 'Settings' },
];

function isBottomActive(pathname: string, to: string) {
  if (to === '/') return pathname === '/';
  if (to === '/sales/new') return pathname.startsWith('/sales');
  if (to === '/inventory') return pathname.startsWith('/inventory');
  if (to === '/purchases') return pathname.startsWith('/purchases');
  if (to === '/more') {
    return (
      pathname === '/more'
      || pathname.startsWith('/profile')
      || pathname.startsWith('/businesses')
      || pathname.startsWith('/categories')
      || pathname.startsWith('/suppliers')
      || pathname.startsWith('/notifications')
      || pathname.startsWith('/reports')
      || pathname.startsWith('/privacy')
      || pathname.startsWith('/terms')
    );
  }
  return pathname.startsWith(to);
}

function isSideActive(pathname: string, to: string) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

function sectionLabel(pathname: string) {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/inventory/new')) return 'Add Product';
  if (pathname.includes('/restock')) return 'Restock';
  if (pathname.startsWith('/inventory/')) return 'Item';
  if (pathname.startsWith('/inventory')) return 'Items';
  if (pathname.startsWith('/sales/new')) return 'Record Sale';
  if (pathname.startsWith('/sales')) return 'Sales';
  if (pathname.startsWith('/purchases/new')) return 'Record Purchase';
  if (pathname.startsWith('/purchases')) return 'Purchases';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/search')) return 'Search';
  if (pathname.startsWith('/categories')) return 'Categories';
  if (pathname.startsWith('/suppliers')) return 'Suppliers';
  if (pathname.startsWith('/notifications')) return 'Notifications';
  if (pathname.startsWith('/businesses')) return 'Businesses';
  if (pathname.startsWith('/profile')) return 'Profile';
  if (pathname.startsWith('/privacy')) return 'Privacy Policy';
  if (pathname.startsWith('/terms')) return 'Terms and Conditions';
  if (pathname.startsWith('/more')) return 'Settings';
  return 'Home';
}

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="app-tabbar shrink-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
      <div className="grid grid-cols-5 px-1 pt-0.5">
        {bottomNav.map(({ to, icon: Icon, label }) => {
          const active = isBottomActive(pathname, to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl pb-0.5 pt-1"
            >
              <span
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center',
                  active
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/40'
                    : 'text-slate-400'
                )}
              >
                <Icon size={18} />
              </span>
              <span
                className={cn(
                  'text-[10px] leading-none truncate max-w-full',
                  active ? 'text-primary-600 font-semibold' : 'text-slate-400 font-medium'
                )}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function Sidebar() {
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  const { logout, pending } = useLogout();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Account';

  return (
    <aside className="hidden lg:flex w-[232px] shrink-0 sticky top-0 h-dvh flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-4">
      <div className="flex items-center gap-2.5 px-1 mb-4">
        <VokiMark size={36} />
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Voki</span>
      </div>

      <NavLink
        to="/search"
        className="flex items-center gap-2 h-10 px-3 mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-400"
      >
        <Search size={16} />
        Search
      </NavLink>

      <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">
        <div className="grid grid-cols-2 gap-2">
          {sideItems.map(({ to, icon: Icon, label }) => {
            const active = isSideActive(pathname, to);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-3 text-center transition-colors',
                  active
                    ? 'border-primary-300 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-200'
                    : 'border-slate-200/80 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <span
                  className={cn(
                    'w-10 h-10 rounded-xl border flex items-center justify-center',
                    active
                      ? 'border-primary-300 bg-white text-primary-600 dark:bg-slate-900'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className="text-[11px] font-medium leading-tight">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      <NavLink
        to="/profile"
        className="mt-3 flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 p-2.5 min-w-0"
      >
        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center shrink-0">
          {(user?.firstName?.[0] || 'V')}{(user?.lastName?.[0] || '')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{name}</p>
          <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
        </div>
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </NavLink>

      <button
        type="button"
        onClick={logout}
        disabled={pending}
        className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        <LogOut size={16} />
        {pending ? 'Logging out...' : 'Log out'}
      </button>
    </aside>
  );
}

function StatusCluster({ isOnline, pendingSync }: { isOnline: boolean; pendingSync: number }) {
  return (
    <>
      {!isOnline && (
        <span className="flex items-center gap-1 text-amber-700 bg-amber-50 dark:bg-amber-900/30 rounded-full px-2 py-1" aria-label="Offline">
          <WifiOff size={14} />
          <span className="hidden sm:inline text-[11px] font-semibold">Offline</span>
        </span>
      )}
      {pendingSync > 0 && (
        <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded-full">
          {pendingSync}
        </span>
      )}
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeBusiness } = useBusinessStore();
  const isOnline = useOnlineStatus();
  const pendingSync = offlineQueue.count();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const section = sectionLabel(pathname);
  const { logout, pending } = useLogout();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const viewport = window.visualViewport;

    const apply = (height: number, top: number) => {
      document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
      document.documentElement.style.setProperty('--app-top', `${Math.round(top)}px`);
    };

    const editing = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
      if (el.tagName !== 'INPUT') return false;
      const type = (el as HTMLInputElement).type;
      return !['button', 'checkbox', 'radio', 'file', 'submit', 'reset', 'range', 'color'].includes(type);
    };

    const scrollFieldIntoView = () => {
      const el = document.activeElement;
      const main = mainRef.current;
      if (!(el instanceof HTMLElement) || !main?.contains(el)) return;
      const current = window.visualViewport;
      const visibleTop = current?.offsetTop ?? 0;
      const visibleBottom = visibleTop + (current?.height ?? window.innerHeight);
      const rect = el.getBoundingClientRect();
      const margin = 16;
      if (rect.bottom > visibleBottom - margin) {
        main.scrollBy({ top: rect.bottom - (visibleBottom - margin) });
      } else if (rect.top < visibleTop + margin) {
        main.scrollBy({ top: rect.top - (visibleTop + margin) });
      }
    };

    let fullHeight = window.innerHeight;
    let fullTop = 0;

    const sync = () => {
      const current = window.visualViewport;
      const inner = window.innerHeight;
      const height = current?.height ?? inner;
      const top = Math.max(0, current?.offsetTop ?? 0);
      const keyboard = inner - height > 80 || (editing() && top > 0);
      // A short visual viewport is the keyboard. Keep the last full-screen size so the gap cannot stick.
      if (keyboard) {
        apply(fullHeight, fullTop);
        if (window.scrollY !== 0) window.scrollTo(0, 0);
        scrollFieldIntoView();
        return;
      }
      fullHeight = height;
      fullTop = top;
      apply(height, top);
    };

    const restoreAfterTyping = () => {
      [80, 400].forEach((delay) => {
        window.setTimeout(() => {
          if (editing()) return;
          const current = window.visualViewport;
          const inner = window.innerHeight;
          const height = current?.height ?? inner;
          const top = Math.max(0, current?.offsetTop ?? 0);
          if (inner - height > 80 || top > 24) {
            fullHeight = inner;
            fullTop = 0;
            apply(inner, 0);
            return;
          }
          fullHeight = height;
          fullTop = top;
          apply(height, top);
        }, delay);
      });
    };

    sync();
    viewport?.addEventListener('resize', sync);
    viewport?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    document.addEventListener('focusout', restoreAfterTyping);
    document.addEventListener('focusin', scrollFieldIntoView);
    return () => {
      viewport?.removeEventListener('resize', sync);
      viewport?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      document.removeEventListener('focusout', restoreAfterTyping);
      document.removeEventListener('focusin', scrollFieldIntoView);
    };
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app-shell min-h-svh bg-[#eef3f9] dark:bg-slate-950 lg:flex">
      <Sidebar />

      <div className="flex w-full min-w-0 flex-1 flex-col max-lg:min-h-0">
        <header className="safe-top z-30 shrink-0 bg-[#eef3f9]/95 backdrop-blur dark:bg-slate-950/95 lg:sticky lg:top-0">
          <div className="flex items-center gap-2 px-3 sm:px-4 lg:px-6 h-14">
            <button
              onClick={() => navigate('/businesses')}
              className="lg:hidden flex items-center gap-2 min-w-0 flex-1 text-left"
            >
              <VokiMark size={32} className="shrink-0" />
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {activeBusiness?.name || 'Select business'}
              </span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>

            <p className="hidden lg:flex items-center gap-2 text-sm min-w-0 flex-1">
              <span className="text-slate-400">Home</span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-800 dark:text-slate-100 truncate">{section}</span>
            </p>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => navigate('/businesses')}
                className="hidden lg:flex items-center gap-1.5 max-w-[180px] mr-1 px-2.5 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                <span className="truncate">{activeBusiness?.name || 'Business'}</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
              <StatusCluster isOnline={isOnline} pendingSync={pendingSync} />
              <button
                onClick={() => navigate('/search')}
                className="p-2 rounded-xl text-slate-500 hover:bg-white dark:hover:bg-slate-800 lg:hidden"
                aria-label="Search"
              >
                <Search size={18} />
              </button>
              <button
                onClick={() => navigate('/notifications')}
                className="p-2 rounded-xl text-slate-500 hover:bg-white dark:hover:bg-slate-800"
                aria-label="Notifications"
              >
                <Bell size={18} />
              </button>
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                disabled={pending}
                className="p-2 rounded-xl text-slate-500 hover:bg-white disabled:opacity-60 dark:hover:bg-slate-800"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main ref={mainRef} className="mx-auto w-full max-w-[1200px] px-3 pb-4 pt-1 sm:px-4 max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto lg:px-6 lg:pb-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <InventoryFab />
      <BottomNav />
    </div>
  );
}

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-x-hidden px-4 py-10">
      <ThemeToggle className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 bg-white/90 dark:bg-slate-900/90" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary-50/80 via-[#eef3f9] to-[#eef3f9] dark:from-primary-950/30 dark:via-slate-950 dark:to-slate-950" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200/30 dark:bg-primary-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-6">
          <div
            className="mx-auto mb-3 h-14 w-14 rounded-2xl"
            style={{ boxShadow: 'var(--shadow-primary)' }}
          >
            <VokiMark size={56} />
          </div>
          <h1 className="text-heading text-slate-900 dark:text-white">Voki</h1>
          <p className="text-caption text-slate-500 mt-1">Inventory & Sales Management</p>
        </div>
        <div className="surface-card p-5 rounded-2xl">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h2 className="text-display text-slate-900 dark:text-white">{title}</h2>}
              {subtitle && <p className="text-caption text-slate-500 mt-1.5 leading-relaxed">{subtitle}</p>}
            </div>
          )}
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </div>
  );
}
