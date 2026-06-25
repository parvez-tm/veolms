import { JwtPayload } from './interface';

declare global {
  namespace Express {
    interface Request {
      /** Populated by auth_middleware after a valid JWT is verified. */
      user?: JwtPayload;
    }
  }
}

export {};
