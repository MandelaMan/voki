import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { adminService } from '../services/admin.service';

const ok = (res: Response, data: unknown) => res.json({ success: true, data });
const param = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);
const searchOf = (req: AuthRequest) => (typeof req.query.search === 'string' ? req.query.search : undefined);

export const adminController = {
  overview: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      ok(res, await adminService.overview(search));
    } catch (error) { next(error); }
  },
  setPrice: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await adminService.setPrice(req.user!.userId, req.body.priceKes)); }
    catch (error) { next(error); }
  },
  setPlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await adminService.setPlan(req.user!.userId, param(req.params.id), req.body)); }
    catch (error) { next(error); }
  },
  analytics: async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await adminService.analytics()); }
    catch (error) { next(error); }
  },
  setStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await adminService.setStatus(req.user!.userId, param(req.params.id), req.body.suspended)); }
    catch (error) { next(error); }
  },
  businesses: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await adminService.businesses(searchOf(req))); }
    catch (error) { next(error); }
  },
  inventory: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      ok(res, await adminService.inventory(searchOf(req), status));
    } catch (error) { next(error); }
  },
  sales: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await adminService.sales(searchOf(req))); }
    catch (error) { next(error); }
  },
  purchases: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await adminService.purchases(searchOf(req))); }
    catch (error) { next(error); }
  },
  records: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await adminService.records(param(req.params.kind), searchOf(req))); }
    catch (error) { next(error); }
  },
  issues: async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await adminService.issues()); }
    catch (error) { next(error); }
  },
  subscriber: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await adminService.subscriber(param(req.params.id))); }
    catch (error) { next(error); }
  },
};
