import 'dotenv/config';

/**
 * Centralised, typed access to environment config. The server boots even when
 * MONGODB_URI is absent so the skeleton runs out of the box; DB-backed routes
 * guard on `isDbConfigured` instead of crashing at startup.
 */
export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};

export const isDbConfigured = env.mongoUri.length > 0;
