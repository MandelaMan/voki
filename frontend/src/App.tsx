import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { useAuthStore, useThemeStore, applyTheme } from './stores';
import { useOfflineSync } from './hooks/useOfflineSync';
import { businessApi } from './api';
import { useBusinessStore } from './stores';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import ProductDetailPage from './pages/ProductDetailPage';
import EditProductPage from './pages/EditProductPage';
import RestockProductPage from './pages/RestockProductPage';
import NewProductPage from './pages/NewProductPage';
import SalesPage from './pages/SalesPage';
import SaleDetailPage from './pages/SaleDetailPage';
import NewSalePage from './pages/NewSalePage';
import PurchasesPage from './pages/PurchasesPage';
import PurchaseDetailPage from './pages/PurchaseDetailPage';
import NewPurchasePage from './pages/NewPurchasePage';
import SearchPage from './pages/SearchPage';
import ReportsPage from './pages/ReportsPage';
import MorePage from './pages/MorePage';
import BusinessesPage from './pages/BusinessesPage';
import ProfilePage from './pages/ProfilePage';
import CategoriesPage from './pages/CategoriesPage';
import SuppliersPage from './pages/SuppliersPage';
import NotificationsPage from './pages/NotificationsPage';
import PlanPage from './pages/PlanPage';
import AdminPage from './pages/AdminPage';
import AdminSubscribersPage from './pages/AdminSubscribersPage';
import AdminSubscriberPage from './pages/AdminSubscriberPage';
import AdminIssuesPage from './pages/AdminIssuesPage';
import AdminPricingPage from './pages/AdminPricingPage';
import {
  AdminPurchasesPage,
  AdminRecordsPage,
  AdminSalesPage,
  AdminShopsPage,
  AdminStockPage,
} from './pages/AdminBrowsePage';
import CustomersPage from './pages/CustomersPage';
import ReceiptPage from './pages/ReceiptPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function HomePage() {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
  return <DashboardPage />;
}

function ShopOrAdmin({ to, children }: { to: string; children: React.ReactNode }) {
  const role = useAuthStore((state) => state.user?.role);
  if (role === 'SUPER_ADMIN') return <Navigate to={to} replace />;
  return children;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadProfile, user } = useAuthStore();
  const { businesses, setBusinesses, setActiveBusiness, activeBusiness } = useBusinessStore();
  const [businessesLoaded, setBusinessesLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setBusinessesLoaded(false);
      return;
    }
    loadProfile();
    businessApi.list().then((list) => {
      setBusinesses(list);
      if (!activeBusiness && list.length > 0) {
        setActiveBusiness(list[0]);
      }
      setBusinessesLoaded(true);
    }).catch(() => setBusinessesLoaded(true));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (businessesLoaded && businesses.length === 0 && user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/onboarding" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function LegalRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return children;
  return <AppLayout>{children}</AppLayout>;
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  useOfflineSync();

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInitializer>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<LegalRoute><PrivacyPage /></LegalRoute>} />
            <Route path="/terms" element={<LegalRoute><TermsPage /></LegalRoute>} />

            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><ShopOrAdmin to="/admin/stock"><InventoryPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/inventory/new" element={<ProtectedRoute><ShopOrAdmin to="/admin/stock"><NewProductPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/inventory/:id/restock" element={<ProtectedRoute><ShopOrAdmin to="/admin/stock"><RestockProductPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/inventory/:id/edit" element={<ProtectedRoute><ShopOrAdmin to="/admin/stock"><EditProductPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/inventory/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute><ShopOrAdmin to="/admin/sales"><SalesPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/sales/new" element={<ProtectedRoute><ShopOrAdmin to="/admin/sales"><NewSalePage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/sales/:id/receipt" element={<ProtectedRoute><ReceiptPage /></ProtectedRoute>} />
            <Route path="/sales/:id" element={<ProtectedRoute><SaleDetailPage /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute><ShopOrAdmin to="/admin/purchases"><PurchasesPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/purchases/new" element={<ProtectedRoute><ShopOrAdmin to="/admin/purchases"><NewPurchasePage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/purchases/:id" element={<ProtectedRoute><PurchaseDetailPage /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><ShopOrAdmin to="/admin/subscribers"><SearchPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ShopOrAdmin to="/admin"><ReportsPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/more" element={<ProtectedRoute><MorePage /></ProtectedRoute>} />
            <Route path="/businesses" element={<ProtectedRoute><ShopOrAdmin to="/admin/shops"><BusinessesPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><ShopOrAdmin to="/admin/categories"><CategoriesPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute><ShopOrAdmin to="/admin/suppliers"><SuppliersPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><ShopOrAdmin to="/admin/issues"><NotificationsPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/plan" element={<ProtectedRoute><ShopOrAdmin to="/admin/pricing"><PlanPage /></ShopOrAdmin></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="/admin/subscribers/:id" element={<ProtectedRoute><AdminSubscriberPage /></ProtectedRoute>} />
            <Route path="/admin/subscribers" element={<ProtectedRoute><AdminSubscribersPage /></ProtectedRoute>} />
            <Route path="/admin/shops" element={<ProtectedRoute><AdminShopsPage /></ProtectedRoute>} />
            <Route path="/admin/stock" element={<ProtectedRoute><AdminStockPage /></ProtectedRoute>} />
            <Route path="/admin/sales" element={<ProtectedRoute><AdminSalesPage /></ProtectedRoute>} />
            <Route path="/admin/purchases" element={<ProtectedRoute><AdminPurchasesPage /></ProtectedRoute>} />
            <Route path="/admin/issues" element={<ProtectedRoute><AdminIssuesPage /></ProtectedRoute>} />
            <Route path="/admin/pricing" element={<ProtectedRoute><AdminPricingPage /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute><AdminRecordsPage kind="categories" title="Categories" subtitle="Categories across subscriber shops" placeholder="Search category or shop" /></ProtectedRoute>} />
            <Route path="/admin/suppliers" element={<ProtectedRoute><AdminRecordsPage kind="suppliers" title="Suppliers" subtitle="Suppliers subscribers buy from" placeholder="Search supplier, phone, or shop" /></ProtectedRoute>} />
            <Route path="/admin/customers" element={<ProtectedRoute><AdminRecordsPage kind="customers" title="Customers" subtitle="Customers recorded by subscribers" placeholder="Search customer, phone, or shop" /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><ShopOrAdmin to="/admin/customers"><CustomersPage /></ShopOrAdmin></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
