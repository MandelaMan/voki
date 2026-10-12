import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

type ValidatedRequest = Request & {
  validated?: {
    query?: unknown;
    params?: unknown;
  };
};

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return next(new ValidationError(message));
    }

    if (source === 'body') {
      req.body = result.data;
    } else {
      const r = req as ValidatedRequest;
      r.validated = { ...r.validated, [source]: result.data };
    }

    next();
  };
};

export function getValidated<T>(req: Request, source: 'query' | 'params'): T {
  const validated = (req as ValidatedRequest).validated;
  if (validated?.[source] !== undefined) {
    return validated[source] as T;
  }
  return req[source] as T;
}
