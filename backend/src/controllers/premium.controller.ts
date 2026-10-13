import { Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthRequest } from '../middleware/auth';
import { planService } from '../services/plan.service';
import { mpesaService } from '../services/mpesa.service';
import { backgroundService } from '../services/background.service';
import { customerService } from '../services/customer.service';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

const param = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

export const removeBackgroundLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).user?.userId || 'anonymous',
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    error: { message: 'Background removal limit reached. Try again in an hour.', code: 'RATE_LIMIT' },
  },
});

export const billingController = {
  summary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const businessId = typeof req.query.businessId === 'string' ? req.query.businessId : undefined;
      ok(res, await planService.summary(req.user!.userId, businessId));
    } catch (error) { next(error); }
  },
  subscribe: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await mpesaService.subscribe(req.user!.userId, req.body.phone), 201); }
    catch (error) { next(error); }
  },
  payment: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await mpesaService.getSubscription(req.user!.userId, param(req.params.id))); }
    catch (error) { next(error); }
  },
};

export const mpesaController = {
  callback: async (req: AuthRequest, res: Response) => {
    try {
      await mpesaService.handleCallback(req.body);
    } catch (error) {
      logger.error('M-Pesa callback failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  },
  getPrompt: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await mpesaService.getPrompt(req.user!.userId, param(req.params.id))); }
    catch (error) { next(error); }
  },
  simulate: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      ok(res, await mpesaService.simulate(req.user!.userId, param(req.params.id), req.body.action));
    } catch (error) { next(error); }
  },
};

export const imageController = {
  removeBackground: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new ValidationError('Choose a photo first.');
      const png = await backgroundService.remove(req.file.buffer, req.file.originalname);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-store');
      res.send(png);
    } catch (error) { next(error); }
  },
};

export const customerController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { ok(res, await customerService.list(req.user!.userId, req.query.businessId as string)); }
    catch (error) { next(error); }
  },
};
