export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
}

export interface Business {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  currency: string;
  lowStockThreshold: number;
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
  totalAmount: number;
  totalProfit: number;
  notes?: string;
  customer?: Customer;
  items: SaleItem[];
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
  phone?: string;
  email?: string;
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
