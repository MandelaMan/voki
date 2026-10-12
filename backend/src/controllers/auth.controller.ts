import { Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

export const authController = {
  register: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      ok(res, result, 201);
    } catch (e) { next(e); }
  },

  login: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      ok(res, result);
    } catch (e) { next(e); }
  },

  refresh: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.refresh(req.body.refreshToken);
      ok(res, result);
    } catch (e) { next(e); }
  },

  logout: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.body.refreshToken);
      ok(res, { message: 'Logged out' });
    } catch (e) { next(e); }
  },

  forgotPassword: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.forgotPassword(req.body.email);
      ok(res, result);
    } catch (e) { next(e); }
  },

  resetPassword: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.resetPassword(req.body.token, req.body.password);
      ok(res, result);
    } catch (e) { next(e); }
  },

  getProfile: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.getProfile(req.user!.userId);
      ok(res, result);
    } catch (e) { next(e); }
  },

  updateProfile: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.updateProfile(req.user!.userId, req.body);
      ok(res, result);
    } catch (e) { next(e); }
  },
};
