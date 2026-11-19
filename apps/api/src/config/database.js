import mongoose from "mongoose";

const READY_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

// Removes credentials from connection strings before anything is logged.
export function redactCredentials(text) {
  return String(text).replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, "$1***@");
}

export function getDatabaseStatus() {
  return READY_STATES[mongoose.connection.readyState] ?? "unknown";
}

export function describeMongoUri(uri) {
  if (!uri) return { configured: false };
  try {
    const parsed = new URL(uri);
    return {
      configured: true,
      scheme: parsed.protocol.replace(":", ""),
      host: parsed.hostname,
      database: parsed.pathname.slice(1).split("/")[0] || null,
      hasCredentials: Boolean(parsed.username || parsed.password),
    };
  } catch {
    return { configured: true, validFormat: false };
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let connectionPromise = null;

// Connects to MongoDB without ever throwing: the API keeps serving (health reports the
// database state) when the database is missing or down. Returns true when connected.
export async function connectDatabase({
  uri = process.env.MONGODB_URI,
  retries = Number(process.env.DB_CONNECT_RETRIES ?? (process.env.VERCEL ? 1 : 5)),
  retryDelayMs = 2000,
  logger = console,
} = {}) {
  if (mongoose.connection.readyState === 1) return true;
  if (connectionPromise) return connectionPromise;

  if (!uri) {
    logger.warn(JSON.stringify({ event: "database.connect.skipped", reason: "MONGODB_URI is not set" }));
    return false;
  }

  const config = describeMongoUri(uri);
  logger.log(JSON.stringify({ event: "database.connect.start", ...config, retries }));

  connectionPromise = (async () => {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        logger.log(JSON.stringify({ event: "database.connect.success", ...config }));
        return true;
      } catch (error) {
        logger.error(JSON.stringify({
          event: "database.connect.failure",
          ...config,
          attempt,
          retries,
          errorName: error.name,
          error: redactCredentials(error.message),
        }));
        if (attempt < retries) await sleep(retryDelayMs);
      }
    }
    return false;
  })();

  try {
    return await connectionPromise;
  } finally {
    connectionPromise = null;
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
