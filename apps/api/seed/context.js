import { faker } from "@faker-js/faker";
import mongoose from "mongoose";

// Shared state and helpers for the seed modules. Everything is deterministic: the same
// seed yields the same records and the same ObjectIds, so any module can be re-run on its
// own and still line up with data seeded by the others.
// Nothing here is real: emails use the reserved ".test" domain, names come from Faker.

export const REF_DATE = new Date("2025-11-14T12:00:00Z");
export const DEFAULT_COUNTS = { teachers: 4, students: 24 };

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
export const round1 = (n) => Math.round(n * 10) / 10;
export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export const idKey = (v) => String(v);
export const indexBy = (list) => new Map(list.map((doc) => [idKey(doc._id), doc]));
// Groups docs (with a `section` field, e.g. assignments) by section id.
export function idBySection(list) {
  const groups = new Map();
  list.forEach((doc) => {
    const key = idKey(doc.section);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  });
  return groups;
}

export function createContext({ seed = 42, counts = {}, modelNames }) {
  faker.seed(seed);
  let counter = 0;
  return {
    faker,
    counts: { ...DEFAULT_COUNTS, ...counts },
    data: Object.fromEntries(modelNames.map((name) => [name, []])),
    ability: new Map(), // student profile id -> 0.5..1, shapes realistic grades (not stored)
    averageOf: new Map(), // enrollment id -> grade average 0..1 (set by the grades module)
    id: () => new mongoose.Types.ObjectId(String(++counter).padStart(24, "0")),
  };
}
