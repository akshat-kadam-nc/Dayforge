import mongoose from 'mongoose';
import { env, isDbConfigured } from './config/env.js';

let connected = false;

export async function connectDb(): Promise<void> {
  if (!isDbConfigured) {
    console.warn(
      '[db] MONGODB_URI is not set. Running without a database. ' +
        'Auth and task routes will return 503 until you add a connection string to server/.env',
    );
    return;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  connected = true;
  console.log('[db] connected to MongoDB');
}

export function isDbConnected(): boolean {
  return connected && mongoose.connection.readyState === 1;
}
