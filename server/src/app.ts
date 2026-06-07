import express from 'express';
import cors from 'cors';
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
import { meRouter } from './routes/me.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
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

  app.use(errorHandler);

  return app;
}
