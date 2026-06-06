import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { isDbConnected } from './db.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { tasksRouter } from './routes/tasks.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', db: isDbConnected() ? 'connected' : 'disconnected' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/tasks', tasksRouter);

  app.use(errorHandler);

  return app;
}
