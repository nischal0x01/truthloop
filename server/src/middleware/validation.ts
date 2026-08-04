import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';

interface ValidationSchema {
  validate: (data: unknown) => { error?: { details: Array<{ message: string }> } };
}

export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(400, error.details[0].message);
    }
    next();
  };
};
