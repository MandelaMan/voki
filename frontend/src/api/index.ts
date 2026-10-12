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
  update: (id: string, data: Partial<Business>) => api.put(`/businesses/${id}`, data).then((r) => r.data.data),
  delete: (id: string) => api.delete(`/businesses/${id}`),
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
    api.get('/reports/profit', { params: { businessId, startDate, endDate } }).then((r) => r.data.data),
  lowStock: (businessId: string) => api.get('/reports/low-stock', { params: { businessId } }).then((r) => r.data.data),
  deadStock: (businessId: string, months?: number) =>
    api.get('/reports/dead-stock', { params: { businessId, months } }).then((r) => r.data.data),
  purchases: (businessId: string, startDate?: string, endDate?: string) =>
    api.get('/reports/purchases', { params: { businessId, startDate, endDate } }).then((r) => r.data.data),
};

export const notificationApi = {
  list: (businessId?: string) =>
    api.get('/notifications', { params: { businessId } }).then((r) => r.data.data as Notification[]),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};
