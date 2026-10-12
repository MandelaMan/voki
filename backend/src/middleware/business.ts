import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from './auth';
import { ForbiddenError, NotFoundError } from '../utils/errors';

export const requireBusiness = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const businessId = req.params.businessId || req.query.businessId || req.body.businessId;
  if (!businessId || typeof businessId !== 'string') {
    return next(new ForbiddenError('Business ID required'));
  }

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId: req.user!.userId, deletedAt: null },
  });

  if (!business) {
    return next(new NotFoundError('Business not found'));
  }

  (req as AuthRequest & { businessId: string }).businessId = businessId;
  next();
};
