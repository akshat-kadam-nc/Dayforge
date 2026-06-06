import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../auth/jwt.js';
import { HttpError } from './error.js';

/** Adds `userId` to the request once a valid Bearer token is verified. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Missing or malformed Authorization header');
  }
  try {
    const { userId } = verifyToken(token);
    req.userId = userId;
    next();
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
}
