import { Response, NextFunction } from 'express';
import { planService } from '../services/plan.service';
import { AuthRequest } from './auth';

export const requirePremium = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    await planService.assertPremium(req.user!.userId);
    next();
  } catch (error) {
    next(error);
  }
};
