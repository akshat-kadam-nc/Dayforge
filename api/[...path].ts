import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/dist/app.js';
import { connectDb } from '../server/dist/db.js';

/**
 * Vercel serverless entry. Catch-all so every /api/* path reaches the one
 * function with its original URL intact, which the Express router matches as-is.
 *
 * The client (client/dist) is served separately by Vercel's CDN, so this
 * function runs API-only: set SERVE_CLIENT=false in the Vercel env so createApp
 * doesn't try to serve the static build from inside the function.
 */
const app = createApp();

// Established once per warm instance; db.ts caches the pool across invocations.
let dbReady: Promise<void> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    dbReady ??= connectDb();
    await dbReady;
  } catch (err) {
    // Retry the connection on the next request; DB-guarded routes still return
    // 503 via requireDb, and /api/health responds either way.
    dbReady = undefined;
    console.error('[api] database connection failed', err);
  }
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
