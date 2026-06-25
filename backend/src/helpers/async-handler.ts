import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrap an async route handler so any thrown error / rejected promise is
 * forwarded to the centralized error middleware via next().
 */
export const asyncHandler =
  (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
