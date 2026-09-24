import { createContext } from "./context.js";
import users from "./modules/users.js";
import courses from "./modules/courses.js";
import grades from "./modules/grades.js";
import attendance from "./modules/attendance.js";
import notes from "./modules/notes.js";
import goals from "./modules/goals.js";
import remediation from "./modules/remediation.js";
import reports from "./modules/reports.js";
import communications from "./modules/communications.js";

// Seed modules in dependency order. Each module owns a set of models and only reads data
// produced by modules before it. To add one: create modules/<name>.js and list it here.
export const MODULES = [users, courses, grades, attendance, notes, goals, remediation, reports, communications];

export const MODULE_NAMES = MODULES.map((m) => m.name);
// Insert order for a full seed (parents before children).
export const MODEL_NAMES = MODULES.flatMap((m) => m.models);

// Generates every module in memory. Because ids and Faker are deterministic, any subset can
// be inserted later and still reference records seeded by the other modules.
export function generateSeedData(options = {}) {
  const ctx = createContext({ ...options, modelNames: MODEL_NAMES });
  MODULES.forEach((module) => module.run(ctx));
  return ctx.data;
}

export function selectModules(only) {
  if (!only || only.length === 0) return MODULES;
  const unknown = only.filter((name) => !MODULE_NAMES.includes(name));
  if (unknown.length > 0) {
    throw new Error(`Unknown seed module(s): ${unknown.join(", ")}. Available: ${MODULE_NAMES.join(", ")}`);
  }
  return MODULES.filter((m) => only.includes(m.name));
}
