import mongoose from 'mongoose';
import { env, isDbConfigured } from './config/env.js';

/**
 * Cache the connection promise on the global object so it survives module
 * re-evaluation. On a standalone server (Render/local) this just connects once
 * at boot. On a serverless host (Vercel) each warm invocation reuses the same
 * pool instead of dialing Atlas on every request; concurrent cold instances
 * each keep their own small pool.
 */
const globalForDb = globalThis as unknown as {
  __dayforgeDb?: Promise<typeof mongoose>;
};

export async function connectDb(): Promise<void> {
  if (!isDbConfigured) {
    console.warn(
      '[db] MONGODB_URI is not set. Running without a database. ' +
        'Auth and task routes will return 503 until you add a connection string to server/.env',
    );
    return;
  }

  if (!globalForDb.__dayforgeDb) {
    mongoose.set('strictQuery', true);
    globalForDb.__dayforgeDb = mongoose
      .connect(env.mongoUri, {
        // Small pool: many serverless instances may connect at once, and Atlas
        // caps total connections. The single Render process is fine with this too.
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 8000,
      })
      .then((m) => {
        console.log('[db] connected to MongoDB');
        return m;
      })
      .catch((err) => {
        // Don't cache a failed attempt — let the next request retry from scratch.
        globalForDb.__dayforgeDb = undefined;
        throw err;
      });
  }

  await globalForDb.__dayforgeDb;
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
