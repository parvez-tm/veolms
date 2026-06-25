import { RequestHandler } from 'express';
import { ApiError } from '../types/interface';

/** Validate that :id is present and a positive integer (BIGSERIAL primary key). */
export const id_checker_middleware: RequestHandler = (req, _res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new ApiError(400, 'ID is required'));
  }

  if (!/^\d+$/.test(id)) {
    return next(new ApiError(400, 'Invalid ID format'));
  }

  next();
};
