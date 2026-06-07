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
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4000/api/google/callback',
};

export const isDbConfigured = env.mongoUri.length > 0;
/** Google Calendar sync activates only once an OAuth client is configured. */
export const isGoogleConfigured = env.googleClientId.length > 0 && env.googleClientSecret.length > 0;
