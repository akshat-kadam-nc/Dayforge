import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * TEMP DIAGNOSTIC: capture and return the real load/runtime error so we can see
 * it via curl instead of Vercel's generic FUNCTION_INVOCATION_FAILED. Revert to
 * the plain wrapper once the cause is known.
 *
 * vercel.json rewrites all /api/* to this one function with the original URL
 * intact, so the Express router (its routes are /api-prefixed) matches as-is.
 */
let appPromise: Promise<(req: IncomingMessage, res: ServerResponse) => void> | undefined;

function loadApp() {
  if (appPromise) return appPromise;
  const p = (async () => {
    // Dynamic import so an import-time error is catchable here, not a hard crash.
    const { createApp } = await import('../server/src/app.js');
    const { connectDb } = await import('../server/src/db.js');
    const app = createApp();
    try {
      await connectDb();
    } catch (e) {
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
  } catch (e) {
    const err = e as Error;
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        diag: true,
        message: String(err?.message ?? err),
        stack: String(err?.stack ?? '').split('\n').slice(0, 10),
      }),
    );
  }
}
