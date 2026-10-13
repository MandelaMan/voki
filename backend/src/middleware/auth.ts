import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/tokens';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const requireSuperAdmin = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) return next(new ForbiddenError('Super admin only.'));
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, deletedAt: true },
    });
    if (!user || user.deletedAt || user.role !== 'SUPER_ADMIN') {
      return next(new ForbiddenError('Super admin only.'));
    }
    next();
  } catch (error) {
    next(error);
  }
};
