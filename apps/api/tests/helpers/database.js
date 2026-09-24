import { randomBytes } from "node:crypto";
import mongoose from "mongoose";

// Each test file that needs MongoDB gets its own throwaway database on the server named by
// MONGODB_URI, so files can run in parallel and never touch dev data. The name always ends
// in "_test"; dropTestDatabase refuses to drop anything else.

export function createTestDatabaseUri(base = process.env.MONGODB_URI) {
  if (!base) return null;
  const url = new URL(base);
  url.pathname = `/ss_${randomBytes(4).toString("hex")}_test`;
  return url.toString();
}

export async function dropTestDatabase() {
  const { name } = mongoose.connection;
  if (!name?.endsWith("_test")) throw new Error(`Refusing to drop non-test database "${name}"`);
  // Let background index builds finish first; otherwise one can recreate the database after the drop.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  await mongoose.connection.dropDatabase();
}
