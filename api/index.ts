import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Vercel serverless entry. vercel.json rewrites every /api/* request here with
 * the original URL intact, so the /api-prefixed Express routes match as-is.
 *
 * The server is imported *dynamically* (not a top-level static import) on
 * purpose: that's what lets @vercel/node bundle the cross-directory TypeScript
 * source into the function. A static `import` of ../server/src failed to load at
 * runtime (FUNCTION_INVOCATION_FAILED).
 *
 * The client (client/dist) is served by Vercel's CDN, so set SERVE_CLIENT=false
 * in the Vercel env to keep this function API-only.
 */
let appPromise: Promise<(req: IncomingMessage, res: ServerResponse) => void> | undefined;

function loadApp() {
  if (appPromise) return appPromise;
  const p = (async () => {
    const { createApp } = await import('../server/src/app.js');
    const { connectDb } = await import('../server/src/db.js');
    const app = createApp();
    try {
      await connectDb();
    } catch (e) {
      // Non-fatal: DB-guarded routes return 503 via requireDb; /api/health still responds.
      console.error('[api] db connect failed', e);
    }
    return app as unknown as (req: IncomingMessage, res: ServerResponse) => void;
  })();
  appPromise = p;
  p.catch(() => {
    appPromise = undefined; // allow retry on the next request
  });
  return p;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await loadApp();
    return app(req, res);
  } catch (err) {
    console.error('[api] handler failed', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
