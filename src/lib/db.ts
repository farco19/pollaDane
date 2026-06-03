import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/polladane";

type GlobalMongoose = typeof globalThis & {
  mongoose?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};

const globalWithMongoose = globalThis as GlobalMongoose;

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (globalWithMongoose.mongoose?.conn) {
    return globalWithMongoose.mongoose.conn;
  }

  if (!globalWithMongoose.mongoose?.promise) {
    globalWithMongoose.mongoose!.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  globalWithMongoose.mongoose!.conn = await globalWithMongoose.mongoose!.promise;
  return globalWithMongoose.mongoose!.conn;
}
