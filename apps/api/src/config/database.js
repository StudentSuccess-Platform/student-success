import mongoose from "mongoose";

const READY_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

// Removes credentials from connection strings before anything is logged.
export function redactCredentials(text) {
  return String(text).replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, "$1***@");
}

export function getDatabaseStatus() {
  return READY_STATES[mongoose.connection.readyState] ?? "unknown";
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Connects to MongoDB without ever throwing: the API keeps serving (health reports the
// database state) when the database is missing or down. Returns true when connected.
export async function connectDatabase({
  uri = process.env.MONGODB_URI,
  retries = Number(process.env.DB_CONNECT_RETRIES ?? 5),
  retryDelayMs = 2000,
  logger = console,
} = {}) {
  if (!uri) {
    logger.warn("MONGODB_URI is not set; starting without a database connection.");
    return false;
  }

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      logger.log("MongoDB connected.");
      return true;
    } catch (error) {
      logger.error(
        `MongoDB connection failed (attempt ${attempt}/${retries}): ${redactCredentials(error.message)}`,
      );
      if (attempt < retries) await sleep(retryDelayMs);
    }
  }
  return false;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
