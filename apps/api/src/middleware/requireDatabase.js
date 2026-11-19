import { connectDatabase } from "../config/database.js";
import { httpError } from "../utils/httpError.js";

export async function assertDatabaseReady() {
  if (await connectDatabase()) return;
  throw httpError(503, "Database is unavailable", { code: "DATABASE_UNAVAILABLE" });
}

export async function requireDatabase(req, res, next) {
  await assertDatabaseReady();
  next();
}
