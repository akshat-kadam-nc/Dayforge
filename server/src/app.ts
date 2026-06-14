import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { env } from './config/env.js';
import { isDbConnected } from './db.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { tasksRouter } from './routes/tasks.js';
import { areasRouter } from './routes/areas.js';
import { tracksRouter } from './routes/tracks.js';
import { goalsRouter } from './routes/goals.js';
import { interruptionsRouter } from './routes/interruptions.js';
import { timelogsRouter } from './routes/timelogs.js';
import { todayRouter } from './routes/today.js';
import { budgetRouter } from './routes/budget.js';
import { reconciliationsRouter } from './routes/reconciliations.js';
import { googleRouter } from './routes/google.js';
import { calendarRouter } from './routes/calendar.js';
import { teamRouter } from './routes/team.js';
import { reportsRouter } from './routes/reports.js';
import { meRouter } from './routes/me.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  // On a serverless host (Vercel) the platform may have already parsed the JSON
  // body and populated req.body, consuming the stream. Mark it so express.json()
  // below skips re-parsing (which would read an empty stream and clobber the
  // body). On a standalone server (Render/local) req.body is undefined here, so
  // this is a no-op and express.json() parses normally.
  app.use((req, _res, next) => {
    if ((req as { body?: unknown }).body !== undefined) {
      (req as { _body?: boolean })._body = true;
    }
    next();
  });
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', db: isDbConnected() ? 'connected' : 'disconnected' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api/areas', areasRouter);
  app.use('/api/tracks', tracksRouter);
  app.use('/api/goals', goalsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/interruptions', interruptionsRouter);
  app.use('/api/timelogs', timelogsRouter);
  app.use('/api/today', todayRouter);
  app.use('/api/budget', budgetRouter);
  app.use('/api/reconciliations', reconciliationsRouter);
  app.use('/api/google', googleRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/team', teamRouter);
  app.use('/api/reports', reportsRouter);

  // Single-origin production (Render): serve the built client and let the SPA
  // handle client-side routes. Unknown /api/* paths still fall through to the
  // error handler (404) rather than returning index.html.
  //
  // Guarded in try/catch: on Vercel the client is served by the CDN (SERVE_CLIENT
  // should be false), but when this code is bundled to CJS, `import.meta.url` is
  // empty and fileURLToPath() throws. That must never crash the whole API — the
  // catch leaves static serving off and the API keeps working.
  if (env.serveClient) {
    try {
      // Compiled location is server/dist/app.js → repo client/dist is two up.
      const clientDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
      app.use(express.static(clientDist));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        res.sendFile(resolve(clientDist, 'index.html'));
      });
    } catch (err) {
      console.warn('[app] static client serving disabled (no import.meta.url):', err);
    }
  }

  app.use(errorHandler);

  return app;
}
