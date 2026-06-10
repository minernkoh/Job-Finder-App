/**
 * MongoDB connection singleton for the app. Use connectDB() in API routes before using Mongoose models.
 * Reuses one connection and caches it across hot reloads in development so beginners don't have to manage connections.
 */

import mongoose from "mongoose";
import { User } from "@/lib/models/User";

/* Validated lazily in connectDB() (not at module load) so `next build` succeeds without env vars. */
function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please define MONGODB_URI in .env (e.g. mongodb://localhost:27017/jobfinder)"
    );
  }
  return uri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? {
  conn: null,
  promise: null,
};

if (process.env.NODE_ENV !== "production") {
  global.mongoose = cached;
}

/** Connects to MongoDB (or returns existing connection). Call this in API routes before using any Mongoose model. */
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) cached.promise = mongoose.connect(getMongoUri());
  cached.conn = await cached.promise;
  await User.syncIndexes();
  return cached.conn;
}
