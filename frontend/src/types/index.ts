export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  plan?: 'FREE' | 'PREMIUM';
  isPremium?: boolean;
  planExpiresAt?: string | null;
  role?: 'USER' | 'SUPER_ADMIN';
}

export interface Business {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  currency: string;
  lowStockThreshold: number;
  mpesaType?: 'PAYBILL' | 'TILL' | null;
  mpesaShortCode?: string | null;
  mpesaAccount?: string | null;
  mpesaReady?: boolean;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  _count?: { products: number };
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  address?: string;
  products?: Array<Pick<Product, 'id' | 'name' | 'sku' | 'remainingQuantity' | 'status'>>;
}

export interface ProductImage {
  id: string;
  path: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductVariant {
  id: string;
  variantType: string;
  variantValue: string;
  sku?: string;
  buyingPrice: number;
  sellingPrice: number;
  quantityPurchased: number;
  quantitySold: number;
  remainingQuantity: number;
  status: string;
}

export interface ProductActivity {
  unitsSold: number;
  saleCount: number;
  lastSoldAt: string | null;
  lastSoldPrice: number | null;
  lastSoldQty: number | null;
  avgSoldPrice: number | null;
  recentSales: Array<{ date: string; quantity: number; price: number }>;
  buyCount: number;
  lastBoughtAt: string | null;
  saleEveryDays: number | null;
  buyEveryDays: number | null;
  sellThrough: number | null;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  sku: string;
  barcode?: string;
  brand?: string;
  description?: string;
  buyingPrice: number;
  sellingPrice: number;
  quantityPurchased: number;
  quantitySold: number;
  remainingQuantity: number;
  status: string;
  hasVariants: boolean;
  createdAt?: string;
  category?: Category;
  supplier?: Supplier;
  images: ProductImage[];
  variants?: ProductVariant[];
  purchase?: Purchase;
  purchaseItems?: PurchaseItem[];
  saleItems?: SaleItem[];
  activity?: ProductActivity;
}

export interface Purchase {
  id: string;
  businessId: string;
  supplierId?: string;
  purchaseDate: string;
  receiptNumber?: string;
  receiptPath?: string;
  invoicePath?: string;
  notes?: string;
  totalCost: number;
  supplier?: Supplier;
  items?: PurchaseItem[];
  products?: Product[];
}

export interface PurchaseItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  createdAt?: string;
  purchase?: Purchase;
  product?: Product;
}

export interface Sale {
  id: string;
  businessId: string;
  saleDate: string;
  paymentMethod: string;
  paymentStatus?: 'PAID' | 'PENDING' | 'FAILED';
  totalAmount: number;
  totalProfit: number;
  notes?: string;
  receiptNumber?: string | null;
  mpesaReceipt?: string | null;
  customer?: Customer;
  items: SaleItem[];
  mpesaPrompts?: MpesaPrompt[];
  mpesaPrompt?: MpesaPrompt | null;
  promptError?: string | null;
}

export interface SaleItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  sellingPrice: number;
  buyingPrice: number;
  profit: number;
  createdAt?: string;
  product?: Product;
  variant?: ProductVariant;
  sale?: Sale;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  salesCount?: number;
  totalSpent?: number;
  lastSaleAt?: string | null;
}

export interface MpesaPrompt {
  id: string;
  purpose: 'SALE' | 'SUBSCRIPTION';
  phone: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  simulated: boolean;
  saleId?: string | null;
  mpesaReceipt?: string | null;
  resultDesc?: string | null;
  createdAt: string;
}

export interface BillingSummary {
  plan: 'FREE' | 'PREMIUM';
  isPremium: boolean;
  planExpiresAt?: string | null;
  priceKes: number;
  periodDays: number;
  currency: string;
  simulate: boolean;
  features: Array<{ id: string; name: string; description: string }>;
  businessMpesa: {
    type: 'PAYBILL' | 'TILL' | null;
    shortCode: string | null;
    account: string | null;
    ready: boolean;
  } | null;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: 'USER' | 'SUPER_ADMIN';
  plan: 'FREE' | 'PREMIUM';
  isPremium: boolean;
  planExpiresAt?: string | null;
  createdAt: string;
  suspended: boolean;
  businesses: Array<{ id: string; name: string }>;
  stats: {
    businesses: number;
    products: number;
    sales: number;
    revenue: number;
  };
}

export interface AdminOverview {
  pricing: { priceKes: number; periodDays: number; currency: string };
  users: AdminUser[];
}

export interface AdminAnalytics {
  accounts: {
    total: number;
    active: number;
    suspended: number;
    premium: number;
    free: number;
    admins: number;
    newThisMonth: number;
  };
  businesses: number;
  products: number;
  sales: {
    count: number;
    revenue: number;
    profit: number;
    todayCount: number;
    todayRevenue: number;
    monthCount: number;
    monthRevenue: number;
    monthProfit: number;
  };
  purchases: { count: number; spend: number };
  subscriptions: { count: number; revenue: number };
  signups: Array<{ day: string; count: number }>;
  salesTrend: Array<{ day: string; count: number; revenue: number; profit: number }>;
  topBusinesses: Array<{
    id: string;
    name: string;
    owner: string;
    ownerId?: string | null;
    sales: number;
    revenue: number;
    profit: number;
  }>;
}

export interface AdminBusiness {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  products: number;
  sales: number;
  owner: { id: string; name: string; email: string; phone?: string | null; suspended: boolean };
}

export interface AdminProduct {
  id: string;
  name: string;
  sku: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  remainingQuantity: number;
  sellingPrice: number;
  businessId: string;
  businessName: string;
  currency: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string | null;
}

export interface AdminSaleRow {
  id: string;
  saleDate: string;
  totalAmount: number;
  totalProfit: number;
  paymentMethod: string;
  paymentStatus: string;
  receiptNumber?: string | null;
  businessName: string;
  currency: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  items: Array<{ name: string; quantity: number }>;
}

export interface AdminPurchaseRow {
  id: string;
  purchaseDate: string;
  totalCost: number;
  supplierName: string;
  itemCount: number;
  businessName: string;
  currency: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
}

export interface AdminRecord {
  id: string;
  name: string;
  detail?: string | null;
  businessName: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
}

export interface AdminIssues {
  counts: { lowStock: number; outOfStock: number; payments: number; suspended: number };
  stock: Array<{
    id: string;
    name: string;
    sku: string;
    status: string;
    remainingQuantity: number;
    businessName: string;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone?: string | null;
  }>;
  payments: Array<{
    id: string;
    purpose: string;
    phone: string;
    amount: number;
    status: string;
    resultDesc?: string | null;
    createdAt: string;
    businessName?: string | null;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
  }>;
  accounts: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    suspendedAt?: string | null;
  }>;
}

export interface AdminSubscriber {
  account: AdminUser;
  stock: Array<{ id: string; name: string; status: string; remainingQuantity: number; business: { name: string } }>;
  sales: Array<{
    id: string;
    saleDate: string;
    totalAmount: number;
    paymentStatus: string;
    paymentMethod: string;
    businessName: string;
    currency: string;
  }>;
  payments: Array<{
    id: string;
    purpose: string;
    amount: number;
    status: string;
    resultDesc?: string | null;
    createdAt: string;
    phone: string;
  }>;
}

export interface Receipt {
  receiptNumber: string;
  saleDate: string;
  paymentMethod: string;
  paymentStatus: string;
  mpesaReceipt?: string | null;
  business: {
    name: string;
    logo?: string | null;
    currency: string;
    mpesaType?: 'PAYBILL' | 'TILL' | null;
    mpesaShortCode?: string | null;
    mpesaAccount?: string | null;
  };
  customer: { name: string; phone?: string | null } | null;
  items: Array<{
    name: string;
    variant?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  total: number;
}

export interface CashUp {
  date: string;
  salesCount: number;
  paidTotal: number;
  pendingTotal: number;
  profit: number;
  byMethod: Array<{ method: string; count: number; paid: number; pending: number }>;
}

export interface RestockSuggestion {
  id: string;
  name: string;
  sku: string;
  remainingQuantity: number;
  status: string;
  soldLast30: number;
  dailyRate: number;
  daysOfCover: number | null;
  suggestedOrder: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  todaySales: { count: number; revenue: number; profit: number };
  monthSales: { revenue: number; profit: number };
  inventory: { totalProducts: number; totalItems: number; totalValue: number };
  stockAlerts: { lowStock: number; outOfStock: number };
  recentPurchases: Purchase[];
  recentSales: Sale[];
  topProducts: Array<Product & { totalSold?: number; totalProfit?: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number; profit: number }>;
}

export interface PaginatedResponse {
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string; code: string };
}
