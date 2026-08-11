/**
 * Auth middleware — requireAuth and requireAdmin.
 */
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated?.()) {
    throw new AppError(401, 'You must be signed in to access this resource.');
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated?.()) {
    throw new AppError(401, 'You must be signed in to access this resource.');
  }
  const user = req.user as { isAdmin?: boolean } | undefined;
  if (!user?.isAdmin) {
    throw new AppError(403, 'Admin access required.');
  }
  next();
}
