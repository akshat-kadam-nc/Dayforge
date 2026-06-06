import type { NextFunction, Request, Response } from 'express';
import { isDbConnected } from '../db.js';
import { HttpError } from './error.js';

/** Guards DB-backed routes so they fail clearly when no database is connected. */
export function requireDb(_req: Request, _res: Response, next: NextFunction): void {
  if (!isDbConnected()) {
    throw new HttpError(503, 'Database not configured. Set MONGODB_URI in server/.env');
  }
  next();
}
