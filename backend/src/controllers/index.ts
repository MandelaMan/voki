export { authController } from './auth.controller';

import { Response, NextFunction } from 'express';
import { businessService } from '../services/business.service';
import { categoryService } from '../services/category.service';
import { supplierService } from '../services/supplier.service';
import { productService } from '../services/product.service';
import { purchaseService } from '../services/purchase.service';
import { saleService } from '../services/sale.service';
import { dashboardService } from '../services/dashboard.service';
import { reportService } from '../services/report.service';
import { notificationService } from '../services/notification.service';
import { mpesaService } from '../services/mpesa.service';
import { AuthRequest } from '../middleware/auth';
import { getValidated } from '../middleware/validate';

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

const param = (value: string | string[]): string => (Array.isArray(value) ? value[0] : value);

export const businessController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await businessService.list(req.user!.userId)); } catch (e) { next(e); }
  },
  get: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await businessService.get(param(req.params.id), req.user!.userId)); } catch (e) { next(e); }
  },
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await businessService.create(req.user!.userId, req.body), 201); } catch (e) { next(e); }
  },
  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await businessService.update(param(req.params.id), req.user!.userId, req.body)); } catch (e) { next(e); }
  },
  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await businessService.delete(param(req.params.id), req.user!.userId)); } catch (e) { next(e); }
  },
};

export const categoryController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await categoryService.list(req.query.businessId as string)); } catch (e) { next(e); }
  },
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await categoryService.create(req.body), 201); } catch (e) { next(e); }
  },
  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await categoryService.update(param(req.params.id), req.body.businessId, req.body)); } catch (e) { next(e); }
  },
  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await categoryService.delete(param(req.params.id), req.query.businessId as string)); } catch (e) { next(e); }
  },
};

export const supplierController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await supplierService.list(req.query.businessId as string)); } catch (e) { next(e); }
  },
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await supplierService.create(req.body), 201); } catch (e) { next(e); }
  },
  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await supplierService.update(param(req.params.id), req.body.businessId, req.body)); } catch (e) { next(e); }
  },
  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await supplierService.delete(param(req.params.id), req.query.businessId as string)); } catch (e) { next(e); }
  },
};

export const productController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await productService.list(getValidated(req, 'query'))); } catch (e) { next(e); }
  },
  get: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await productService.get(param(req.params.id), req.query.businessId as string)); } catch (e) { next(e); }
  },
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await productService.create(req.user!.userId, req.body), 201); } catch (e) { next(e); }
  },
  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await productService.update(param(req.params.id), req.body.businessId, req.body)); } catch (e) { next(e); }
  },
  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await productService.delete(param(req.params.id), req.query.businessId as string)); } catch (e) { next(e); }
  },
  search: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await productService.search(req.query.businessId as string, req.query.q as string)); } catch (e) { next(e); }
  },
  addImages: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      const paths = files.map((f) => `/uploads/images/${f.filename}`);
      ok(res, await productService.addImages(param(req.params.id), req.body.businessId, paths), 201);
    } catch (e) { next(e); }
  },
  restock: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      ok(res, await productService.restock(req.user!.userId, param(req.params.id), req.body), 201);
    } catch (e) { next(e); }
  },
};

export const purchaseController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await purchaseService.list(getValidated(req, 'query'))); } catch (e) { next(e); }
  },
  get: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await purchaseService.get(param(req.params.id), req.query.businessId as string)); } catch (e) { next(e); }
  },
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = { ...req.body };
      if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (files.receipt?.[0]) data.receiptPath = `/uploads/receipts/${files.receipt[0].filename}`;
        if (files.invoice?.[0]) data.invoicePath = `/uploads/receipts/${files.invoice[0].filename}`;
      }
      ok(res, await purchaseService.create(req.user!.userId, data), 201);
    } catch (e) { next(e); }
  },
};

export const saleController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await saleService.list(getValidated(req, 'query'))); } catch (e) { next(e); }
  },
  get: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await saleService.get(param(req.params.id), req.query.businessId as string)); } catch (e) { next(e); }
  },
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await saleService.create(req.user!.userId, req.body), 201); } catch (e) { next(e); }
  },
  sync: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await saleService.syncOffline(req.user!.userId, req.body.sales)); } catch (e) { next(e); }
  },
  receipt: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      ok(res, await saleService.receipt(req.user!.userId, param(req.params.id), req.query.businessId as string));
    } catch (e) { next(e); }
  },
  prompt: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      ok(res, await mpesaService.requestSalePayment(req.user!.userId, param(req.params.id), req.body.phone), 201);
    } catch (e) { next(e); }
  },
  markPaid: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      ok(res, await saleService.markPaid(
        req.user!.userId,
        param(req.params.id),
        req.body.businessId,
        req.body.mpesaReceipt
      ));
    } catch (e) { next(e); }
  },
};

export const dashboardController = {
  getStats: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await dashboardService.getStats(req.query.businessId as string)); } catch (e) { next(e); }
  },
};

export const reportController = {
  inventory: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await reportService.inventoryReport(req.query.businessId as string)); } catch (e) { next(e); }
  },
  sales: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await reportService.salesReport(req.query.businessId as string, req.query.startDate as string, req.query.endDate as string)); } catch (e) { next(e); }
  },
  profit: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await reportService.profitReport(req.query.businessId as string, req.query.startDate as string, req.query.endDate as string)); } catch (e) { next(e); }
  },
  lowStock: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await reportService.lowStockReport(req.query.businessId as string)); } catch (e) { next(e); }
  },
  deadStock: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await reportService.deadStockReport(req.query.businessId as string, Number(req.query.months) || 3)); } catch (e) { next(e); }
  },
  purchases: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await reportService.purchasesReport(req.query.businessId as string, req.query.startDate as string, req.query.endDate as string)); } catch (e) { next(e); }
  },
  cashUp: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      ok(res, await reportService.cashUp(req.user!.userId, req.query.businessId as string, req.query.date as string | undefined));
    } catch (e) { next(e); }
  },
  restock: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await reportService.restockSuggestions(req.user!.userId, req.query.businessId as string)); }
    catch (e) { next(e); }
  },
};

export const notificationController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await notificationService.list(req.user!.userId, req.query.businessId as string)); } catch (e) { next(e); }
  },
  markRead: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await notificationService.markRead(param(req.params.id), req.user!.userId)); } catch (e) { next(e); }
  },
  markAllRead: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await notificationService.markAllRead(req.user!.userId)); } catch (e) { next(e); }
  },
};
