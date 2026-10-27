import api from './client';
import type {
  User,
  Business,
  Category,
  Supplier,
  Product,
  Purchase,
  Sale,
  DashboardStats,
  Notification,
  PaginatedResponse,
  BillingSummary,
  AdminOverview,
  AdminAnalytics,
  AdminUser,
  AdminBusiness,
  AdminProduct,
  AdminSaleRow,
  AdminPurchaseRow,
  AdminRecord,
  AdminIssues,
  AdminSubscriber,
  MpesaPrompt,
  Receipt,
  Customer,
  CashUp,
  ProfitReport,
  RestockSuggestion,
  ListOcrKind,
  ListOcrResult,
} from '../types';

export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
    api.post('/auth/register', data).then((r) => r.data.data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data.data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }).then((r) => r.data.data),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }).then((r) => r.data.data),
  getProfile: () => api.get('/auth/profile').then((r) => r.data.data as User),
  updateProfile: (data: Partial<User>) => api.put('/auth/profile', data).then((r) => r.data.data as User),
};

export const businessApi = {
  list: () => api.get('/businesses').then((r) => r.data.data as Business[]),
  get: (id: string) => api.get(`/businesses/${id}`).then((r) => r.data.data as Business),
  create: (data: Partial<Business>) => api.post('/businesses', data).then((r) => r.data.data as Business),
  update: (id: string, data: Partial<Business> & {
    mpesaConsumerKey?: string;
    mpesaConsumerSecret?: string;
    mpesaPasskey?: string;
    clearMpesaCredentials?: boolean;
  }) => api.put(`/businesses/${id}`, data).then((r) => r.data.data as Business),
  delete: (id: string) => api.delete(`/businesses/${id}`),
};

export type IntegrationSummary = {
  businessId: string;
  businessName: string;
  mpesa: {
    type: 'PAYBILL' | 'TILL' | null;
    shortCode: string | null;
    account: string | null;
    ready: boolean;
  };
  gemini: { configured: boolean; usingPlatformFallback: boolean };
  removeBg: { configured: boolean; usingPlatformFallback: boolean };
};

export const integrationApi = {
  summary: (businessId: string) =>
    api.get('/integrations', { params: { businessId } }).then((r) => r.data.data as IntegrationSummary),
  update: (data: {
    businessId: string;
    mpesaType?: 'PAYBILL' | 'TILL';
    mpesaShortCode?: string;
    mpesaAccount?: string;
    mpesaConsumerKey?: string;
    mpesaConsumerSecret?: string;
    mpesaPasskey?: string;
    clearMpesaCredentials?: boolean;
    geminiApiKey?: string;
    clearGeminiApiKey?: boolean;
    removeBgApiKey?: string;
    clearRemoveBgApiKey?: boolean;
  }) => api.put('/integrations', data).then((r) => r.data.data as IntegrationSummary),
};

export const categoryApi = {
  list: (businessId: string) => api.get('/categories', { params: { businessId } }).then((r) => r.data.data as Category[]),
  create: (data: Partial<Category> & { businessId: string }) => api.post('/categories', data).then((r) => r.data.data),
  update: (id: string, data: Partial<Category> & { businessId: string }) => api.put(`/categories/${id}`, data).then((r) => r.data.data),
  delete: (id: string, businessId: string) => api.delete(`/categories/${id}`, { params: { businessId } }),
};

export const supplierApi = {
  list: (businessId: string) => api.get('/suppliers', { params: { businessId } }).then((r) => r.data.data as Supplier[]),
  create: (data: Partial<Supplier> & { businessId: string }) => api.post('/suppliers', data).then((r) => r.data.data),
  update: (id: string, data: Partial<Supplier> & { businessId: string }) => api.put(`/suppliers/${id}`, data).then((r) => r.data.data),
  delete: (id: string, businessId: string) => api.delete(`/suppliers/${id}`, { params: { businessId } }),
};

export const productApi = {
  list: (params: Record<string, unknown>) =>
    api.get('/products', { params }).then((r) => r.data.data as { products: Product[]; pagination: PaginatedResponse['pagination'] }),
  get: (id: string, businessId: string) =>
    api.get(`/products/${id}`, { params: { businessId } }).then((r) => r.data.data as Product),
  create: (data: Record<string, unknown>) => api.post('/products', data).then((r) => r.data.data as Product),
  update: (id: string, data: Record<string, unknown>) => api.put(`/products/${id}`, data).then((r) => r.data.data),
  delete: (id: string, businessId: string) => api.delete(`/products/${id}`, { params: { businessId } }),
  search: (businessId: string, q: string) =>
    api.get('/products/search', { params: { businessId, q } }).then((r) => r.data.data as Product[]),
  uploadImages: (id: string, businessId: string, files: File[]) => {
    const form = new FormData();
    form.append('businessId', businessId);
    files.forEach((f) => form.append('images', f));
    return api.post(`/products/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data);
  },
  removeBackground: async (file: File, businessId?: string) => {
    const form = new FormData();
    form.append('image', file);
    if (businessId) form.append('businessId', businessId);
    try {
      const response = await api.post('/images/remove-background', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });
      const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
      return new File([response.data], `${base}.png`, { type: 'image/png' });
    } catch (error) {
      const data = (error as { response?: { data?: unknown } }).response?.data;
      if (data instanceof Blob) {
        const text = await data.text();
        try {
          const parsed = JSON.parse(text) as { error?: { message?: string } };
          if (parsed.error?.message) throw new Error(parsed.error.message);
        } catch (parseError) {
          if (parseError instanceof SyntaxError) throw error;
          throw parseError;
        }
      }
      throw error;
    }
  },
  restock: (id: string, data: Record<string, unknown>) =>
    api.post(`/products/${id}/restock`, data).then((r) => r.data.data as { product: Product; purchase: Purchase }),
};

export const purchaseApi = {
  list: (params: Record<string, unknown>) =>
    api.get('/purchases', { params }).then((r) => r.data.data as { purchases: Purchase[]; pagination: PaginatedResponse['pagination'] }),
  get: (id: string, businessId: string) =>
    api.get(`/purchases/${id}`, { params: { businessId } }).then((r) => r.data.data as Purchase),
  create: (data: Record<string, unknown>) => api.post('/purchases', data).then((r) => r.data.data as Purchase),
};

export const saleApi = {
  list: (params: Record<string, unknown>) =>
    api.get('/sales', { params }).then((r) => r.data.data as { sales: Sale[]; pagination: PaginatedResponse['pagination'] }),
  get: (id: string, businessId: string) =>
    api.get(`/sales/${id}`, { params: { businessId } }).then((r) => r.data.data as Sale),
  create: (data: Record<string, unknown>) => api.post('/sales', data).then((r) => r.data.data as Sale),
  sync: (sales: Record<string, unknown>[]) => api.post('/sales/sync', { sales }).then((r) => r.data.data),
  receipt: (id: string, businessId: string) =>
    api.get(`/sales/${id}/receipt`, { params: { businessId } }).then((r) => r.data.data as Receipt),
  promptMpesa: (id: string, phone: string) =>
    api.post(`/sales/${id}/mpesa-prompt`, { phone }).then((r) => r.data.data as MpesaPrompt),
  markPaid: (id: string, businessId: string, mpesaReceipt?: string) =>
    api.post(`/sales/${id}/payment`, { businessId, mpesaReceipt }).then((r) => r.data.data as Sale),
};

export const dashboardApi = {
  getStats: (businessId: string) =>
    api.get('/dashboard', { params: { businessId } }).then((r) => r.data.data as DashboardStats),
};

export const reportApi = {
  inventory: (businessId: string) => api.get('/reports/inventory', { params: { businessId } }).then((r) => r.data.data),
  sales: (businessId: string, startDate?: string, endDate?: string) =>
    api.get('/reports/sales', { params: { businessId, startDate, endDate } }).then((r) => r.data.data),
  profit: (businessId: string, startDate?: string, endDate?: string) =>
    api.get('/reports/profit', { params: { businessId, startDate, endDate } }).then((r) => r.data.data as ProfitReport),
  lowStock: (businessId: string) => api.get('/reports/low-stock', { params: { businessId } }).then((r) => r.data.data),
  deadStock: (businessId: string, months?: number) =>
    api.get('/reports/dead-stock', { params: { businessId, months } }).then((r) => r.data.data),
  purchases: (businessId: string, startDate?: string, endDate?: string) =>
    api.get('/reports/purchases', { params: { businessId, startDate, endDate } }).then((r) => r.data.data),
  cashUp: (businessId: string, date?: string) =>
    api.get('/reports/cash-up', { params: { businessId, date } }).then((r) => r.data.data as CashUp),
  restock: (businessId: string) =>
    api.get('/reports/restock', { params: { businessId } }).then((r) => r.data.data as RestockSuggestion[]),
};

export const billingApi = {
  summary: (businessId?: string) =>
    api.get('/billing', { params: { businessId } }).then((r) => r.data.data as BillingSummary),
  subscribe: (phone: string) =>
    api.post('/billing/subscribe', { phone }).then((r) => r.data.data as { paymentId: string; prompt: MpesaPrompt }),
  payment: (id: string) =>
    api.get(`/billing/payments/${id}`).then((r) => r.data.data as {
      paymentId: string;
      status: MpesaPrompt['status'];
      simulated: boolean;
      prompt: MpesaPrompt | null;
      plan: 'FREE' | 'PREMIUM';
      isPremium: boolean;
      planExpiresAt?: string | null;
    }),
};

export const listOcrApi = {
  scan: (businessId: string, kind: ListOcrKind, image: File) => {
    const form = new FormData();
    form.append('businessId', businessId);
    form.append('kind', kind);
    form.append('image', image);
    return api.post('/ocr/list', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90_000,
    }).then((r) => r.data.data as ListOcrResult);
  },
};

export const mpesaApi = {
  getPrompt: (id: string) => api.get(`/mpesa/prompts/${id}`).then((r) => r.data.data as MpesaPrompt),
  simulate: (id: string, action: 'SUCCESS' | 'CANCELLED' = 'SUCCESS') =>
    api.post(`/mpesa/prompts/${id}/simulate`, { action }).then((r) => r.data.data as MpesaPrompt),
};

export const adminApi = {
  overview: (search?: string) =>
    api.get('/admin', { params: { search: search || undefined } }).then((r) => r.data.data as AdminOverview),
  analytics: () => api.get('/admin/analytics').then((r) => r.data.data as AdminAnalytics),
  setPrice: (priceKes: number) =>
    api.put('/admin/pricing', { priceKes }).then((r) => r.data.data as AdminOverview['pricing']),
  setPlan: (userId: string, plan: 'FREE' | 'PREMIUM', days?: number) =>
    api.put(`/admin/users/${userId}/plan`, { plan, days }).then((r) => r.data.data as AdminUser),
  setStatus: (userId: string, suspended: boolean) =>
    api.put(`/admin/users/${userId}/status`, { suspended }).then((r) => r.data.data as AdminUser),
  businesses: (search?: string) =>
    api.get('/admin/businesses', { params: { search: search || undefined } }).then((r) => r.data.data as AdminBusiness[]),
  inventory: (search?: string, status?: string) =>
    api.get('/admin/inventory', { params: { search: search || undefined, status: status || undefined } }).then((r) => r.data.data as AdminProduct[]),
  sales: (search?: string) =>
    api.get('/admin/sales', { params: { search: search || undefined } }).then((r) => r.data.data as AdminSaleRow[]),
  purchases: (search?: string) =>
    api.get('/admin/purchases', { params: { search: search || undefined } }).then((r) => r.data.data as AdminPurchaseRow[]),
  records: (kind: 'categories' | 'suppliers' | 'customers', search?: string) =>
    api.get(`/admin/records/${kind}`, { params: { search: search || undefined } }).then((r) => r.data.data as AdminRecord[]),
  issues: () => api.get('/admin/issues').then((r) => r.data.data as AdminIssues),
  subscriber: (userId: string) => api.get(`/admin/users/${userId}`).then((r) => r.data.data as AdminSubscriber),
};

export const customerApi = {
  list: (businessId: string) =>
    api.get('/customers', { params: { businessId } }).then((r) => r.data.data as Customer[]),
};

export const notificationApi = {
  list: (businessId?: string) =>
    api.get('/notifications', { params: { businessId } }).then((r) => r.data.data as Notification[]),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};
