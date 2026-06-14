import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/src/app.js';
import { connectDb } from '../server/src/db.js';

/**
 * Vercel serverless entry for the whole API. vercel.json rewrites every
 * /api/* request to this one function with the original URL preserved, so the
 * Express router (whose routes are /api-prefixed) matches as-is.
 *
 * We import the server *source*; Vercel's esbuild bundles it into the function
 * (resolving the NodeNext .js specifiers to .ts), so there's no dependency on a
 * separate server build step or on cross-directory compiled output.
 *
 * The client (client/dist) is served separately by Vercel's CDN, so set
 * SERVE_CLIENT=false in the Vercel env to keep this function API-only.
 */
const app = createApp();

// Established once per warm instance; db.ts caches the pool across invocations.
let dbReady: Promise<void> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    dbReady ??= connectDb();
    await dbReady;
  } catch (err) {
    // Retry on the next request; DB-guarded routes return 503 via requireDb and
    // /api/health still responds either way.
    dbReady = undefined;
    console.error('[api] database connection failed', err);
  }
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
