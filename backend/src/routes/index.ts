import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadImage, uploadReceipt } from '../middleware/upload';
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
import { createSaleSchema, saleQuerySchema, syncSalesSchema } from '../validators/sale.validator';

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

// Sales
router.get('/sales', authenticate, validate(saleQuerySchema, 'query'), saleController.list);
router.get('/sales/:id', authenticate, saleController.get);
router.post('/sales', authenticate, validate(createSaleSchema), saleController.create);
router.post('/sales/sync', authenticate, validate(syncSalesSchema), saleController.sync);

// Dashboard
router.get('/dashboard', authenticate, dashboardController.getStats);

// Reports
router.get('/reports/inventory', authenticate, reportController.inventory);
router.get('/reports/sales', authenticate, reportController.sales);
router.get('/reports/profit', authenticate, reportController.profit);
router.get('/reports/low-stock', authenticate, reportController.lowStock);
router.get('/reports/dead-stock', authenticate, reportController.deadStock);
router.get('/reports/purchases', authenticate, reportController.purchases);

// Notifications
router.get('/notifications', authenticate, notificationController.list);
router.put('/notifications/:id/read', authenticate, notificationController.markRead);
router.put('/notifications/read-all', authenticate, notificationController.markAllRead);

export default router;
