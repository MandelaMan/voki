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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadProfile } = useAuthStore();
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

  if (businessesLoaded && businesses.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

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

            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
            <Route path="/inventory/new" element={<ProtectedRoute><NewProductPage /></ProtectedRoute>} />
            <Route path="/inventory/:id/restock" element={<ProtectedRoute><RestockProductPage /></ProtectedRoute>} />
            <Route path="/inventory/:id/edit" element={<ProtectedRoute><EditProductPage /></ProtectedRoute>} />
            <Route path="/inventory/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
            <Route path="/sales/new" element={<ProtectedRoute><NewSalePage /></ProtectedRoute>} />
            <Route path="/sales/:id" element={<ProtectedRoute><SaleDetailPage /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute><PurchasesPage /></ProtectedRoute>} />
            <Route path="/purchases/new" element={<ProtectedRoute><NewPurchasePage /></ProtectedRoute>} />
            <Route path="/purchases/:id" element={<ProtectedRoute><PurchaseDetailPage /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/more" element={<ProtectedRoute><MorePage /></ProtectedRoute>} />
            <Route path="/businesses" element={<ProtectedRoute><BusinessesPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
