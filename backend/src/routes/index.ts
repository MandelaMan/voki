import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadImage, uploadReceipt, uploadSingleImage } from '../middleware/upload';
import { requirePremium } from '../middleware/premium';
import {
  authController,
  businessController,
  categoryController,
  supplierController,
  productController,
  purchaseController,
  saleController,
  dashboardController,
  reportController,
  notificationController,
} from '../controllers';
import {
  billingController,
  customerController,
  imageController,
  mpesaController,
  removeBackgroundLimiter,
} from '../controllers/premium.controller';
import { adminController } from '../controllers/admin.controller';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';
import { createBusinessSchema, updateBusinessSchema } from '../validators/business.validator';
import { createCategorySchema } from '../validators/category.validator';
import { createSupplierSchema } from '../validators/supplier.validator';
import { createProductSchema, productQuerySchema, restockProductSchema } from '../validators/product.validator';
import { createPurchaseSchema, purchaseQuerySchema } from '../validators/purchase.validator';
import { createSaleSchema, markSalePaidSchema, salePromptSchema, saleQuerySchema, syncSalesSchema } from '../validators/sale.validator';
import { adminPlanSchema, adminPriceSchema, adminStatusSchema, simulatePromptSchema, subscribeSchema } from '../validators/billing.validator';

const router = Router();

// Auth
router.post('/auth/register', validate(registerSchema), authController.register);
router.post('/auth/login', validate(loginSchema), authController.login);
router.post('/auth/refresh', validate(refreshTokenSchema), authController.refresh);
router.post('/auth/logout', validate(refreshTokenSchema), authController.logout);
router.post('/auth/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/auth/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/auth/profile', authenticate, authController.getProfile);
router.put('/auth/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

// Businesses
router.get('/businesses', authenticate, businessController.list);
router.get('/businesses/:id', authenticate, businessController.get);
router.post('/businesses', authenticate, validate(createBusinessSchema), businessController.create);
router.put('/businesses/:id', authenticate, validate(updateBusinessSchema), businessController.update);
router.delete('/businesses/:id', authenticate, businessController.delete);

// Categories
router.get('/categories', authenticate, categoryController.list);
router.post('/categories', authenticate, validate(createCategorySchema), categoryController.create);
router.put('/categories/:id', authenticate, categoryController.update);
router.delete('/categories/:id', authenticate, categoryController.delete);

// Suppliers
router.get('/suppliers', authenticate, supplierController.list);
router.post('/suppliers', authenticate, validate(createSupplierSchema), supplierController.create);
router.put('/suppliers/:id', authenticate, supplierController.update);
router.delete('/suppliers/:id', authenticate, supplierController.delete);

// Products
router.get('/products', authenticate, validate(productQuerySchema, 'query'), productController.list);
router.get('/products/search', authenticate, productController.search);
router.get('/products/:id', authenticate, productController.get);
router.post('/products', authenticate, validate(createProductSchema), productController.create);
router.put('/products/:id', authenticate, productController.update);
router.delete('/products/:id', authenticate, productController.delete);
router.post('/products/:id/images', authenticate, uploadImage.array('images', 10), productController.addImages);
router.post('/products/:id/restock', authenticate, validate(restockProductSchema), productController.restock);

// Purchases
router.get('/purchases', authenticate, validate(purchaseQuerySchema, 'query'), purchaseController.list);
router.get('/purchases/:id', authenticate, purchaseController.get);
router.post('/purchases', authenticate, validate(createPurchaseSchema), purchaseController.create);

// Billing and Premium
router.get('/billing', authenticate, billingController.summary);
router.post('/billing/subscribe', authenticate, validate(subscribeSchema), billingController.subscribe);
router.get('/billing/payments/:id', authenticate, billingController.payment);
router.post('/mpesa/callback', mpesaController.callback);
router.get('/mpesa/prompts/:id', authenticate, mpesaController.getPrompt);
router.post('/mpesa/prompts/:id/simulate', authenticate, validate(simulatePromptSchema), mpesaController.simulate);
router.post(
  '/images/remove-background',
  authenticate,
  requirePremium,
  removeBackgroundLimiter,
  uploadSingleImage.single('image'),
  imageController.removeBackground
);
router.get('/customers', authenticate, requirePremium, customerController.list);

router.get('/admin', authenticate, requireSuperAdmin, adminController.overview);
router.get('/admin/analytics', authenticate, requireSuperAdmin, adminController.analytics);
router.get('/admin/businesses', authenticate, requireSuperAdmin, adminController.businesses);
router.get('/admin/inventory', authenticate, requireSuperAdmin, adminController.inventory);
router.get('/admin/sales', authenticate, requireSuperAdmin, adminController.sales);
router.get('/admin/purchases', authenticate, requireSuperAdmin, adminController.purchases);
router.get('/admin/records/:kind', authenticate, requireSuperAdmin, adminController.records);
router.get('/admin/issues', authenticate, requireSuperAdmin, adminController.issues);
router.get('/admin/users/:id', authenticate, requireSuperAdmin, adminController.subscriber);
router.put('/admin/pricing', authenticate, requireSuperAdmin, validate(adminPriceSchema), adminController.setPrice);
router.put('/admin/users/:id/plan', authenticate, requireSuperAdmin, validate(adminPlanSchema), adminController.setPlan);
router.put('/admin/users/:id/status', authenticate, requireSuperAdmin, validate(adminStatusSchema), adminController.setStatus);

// Sales
router.get('/sales', authenticate, validate(saleQuerySchema, 'query'), saleController.list);
router.post('/sales/sync', authenticate, validate(syncSalesSchema), saleController.sync);
router.get('/sales/:id/receipt', authenticate, requirePremium, saleController.receipt);
router.post('/sales/:id/mpesa-prompt', authenticate, requirePremium, validate(salePromptSchema), saleController.prompt);
router.post('/sales/:id/payment', authenticate, requirePremium, validate(markSalePaidSchema), saleController.markPaid);
router.get('/sales/:id', authenticate, saleController.get);
router.post('/sales', authenticate, validate(createSaleSchema), saleController.create);

// Dashboard
router.get('/dashboard', authenticate, dashboardController.getStats);

// Reports
router.get('/reports/inventory', authenticate, reportController.inventory);
router.get('/reports/sales', authenticate, reportController.sales);
router.get('/reports/profit', authenticate, reportController.profit);
router.get('/reports/low-stock', authenticate, reportController.lowStock);
router.get('/reports/dead-stock', authenticate, reportController.deadStock);
router.get('/reports/purchases', authenticate, reportController.purchases);
router.get('/reports/cash-up', authenticate, requirePremium, reportController.cashUp);
router.get('/reports/restock', authenticate, requirePremium, reportController.restock);

// Notifications
router.get('/notifications', authenticate, notificationController.list);
router.put('/notifications/:id/read', authenticate, notificationController.markRead);
router.put('/notifications/read-all', authenticate, notificationController.markAllRead);

export default router;
