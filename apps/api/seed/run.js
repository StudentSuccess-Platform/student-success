import dotenv from "dotenv";
import * as models from "../src/models/index.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { generateSeedData, selectModules, MODULE_NAMES, MODEL_NAMES } from "./registry.js";
import { validateSeedData, loadSeedDataFromDatabase } from "./validate.js";

// Usage (from apps/api):
//   npm run db:seed                      seed every module (fails if data already exists)
//   npm run db:reset                     wipe the seeded collections, then seed
//   npm run db:seed -- --only grades     seed one or more modules (comma separated)
//   npm run db:check                     validate consistency of what is in the database
// Options: --reset  --check  --only a,b  --seed <number>

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", "mongo"];

function parseArgs(argv) {
  const args = { reset: false, check: false, only: [], seed: 42 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--reset") args.reset = true;
    else if (argv[i] === "--check") args.check = true;
    else if (argv[i] === "--only") args.only = String(argv[++i] ?? "").split(",").filter(Boolean);
    else if (argv[i] === "--seed") args.seed = Number(argv[++i]);
    else throw new Error(`Unknown option: ${argv[i]}`);
  }
  return args;
}

// Seeding wipes data with --reset, so refuse production and non-local databases by default.
function assertSafeTarget(uri) {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed when NODE_ENV=production.");
  if (process.env.ALLOW_REMOTE_SEED === "1") return;
  let host;
  try {
    host = new URL(uri).hostname;
  } catch {
    throw new Error("Cannot verify that MONGODB_URI is a local database. Set ALLOW_REMOTE_SEED=1 to override.");
  }
  if (!LOCAL_HOSTS.includes(host) && !LOCAL_HOSTS.includes(`[${host}]`)) {
    throw new Error(`Refusing to seed non-local host "${host}". Set ALLOW_REMOTE_SEED=1 to override.`);
  }
}

async function main() {
  dotenv.config();
  const args = parseArgs(process.argv.slice(2));
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (see apps/api/.env.example).");
  assertSafeTarget(uri);

  if (!(await connectDatabase({ uri, retries: 3 }))) throw new Error("Could not connect to MongoDB.");

  if (!args.check) {
    const selected = selectModules(args.only);
    const modelNames = selected.flatMap((m) => m.models);
    const counts = await Promise.all(modelNames.map((name) => models[name].estimatedDocumentCount()));
    const existing = modelNames.filter((_, i) => counts[i] > 0);

    if (existing.length > 0 && !args.reset) {
      throw new Error(`Collections already contain data (${existing.join(", ")}). Use --reset to wipe and reseed.`);
    }
    if (args.reset) {
      for (const name of [...modelNames].reverse()) await models[name].deleteMany({});
    }

    const data = generateSeedData({ seed: args.seed });
    for (const name of modelNames) {
      await models[name].init(); // build indexes (unique constraints) before inserting
      await models[name].insertMany(data[name]);
      console.log(`  ${name}: ${data[name].length}`);
    }
    console.log(`Seeded modules: ${selected.map((m) => m.name).join(", ")}`);
  }

  const problems = validateSeedData(await loadSeedDataFromDatabase());
  if (problems.length > 0) {
    console.error(`Consistency check found ${problems.length} problem(s):`);
    problems.slice(0, 20).forEach((p) => console.error(`  - ${p}`));
    process.exitCode = 1;
  } else {
    console.log(`Consistency check passed (${MODEL_NAMES.length} collections).`);
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    if (error.message.startsWith("Unknown")) console.error(`Modules: ${MODULE_NAMES.join(", ")}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
