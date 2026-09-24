// Test selector. Usage: node tests/run.js [--type T] [--module M] [--suite S]
//   --type   unit | integration | e2e   (a test level)
//   --module a feature folder, e.g. system, errors, auth   (a sub-suite)
//   --suite  smoke | full               (smoke = *.smoke.test.js only)
// Layout: tests/<type>/<module>/<name>[.smoke].test.js. No flags = full suite.
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const type = opt("type");
const module = opt("module");
const suite = opt("suite") ?? "full";

if (!["smoke", "full"].includes(suite)) {
  console.error(`Unknown suite "${suite}" (use smoke or full)`);
  process.exit(2);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

const files = walk(root)
  .filter((f) => f.endsWith(".test.js"))
  .filter((f) => {
    const [t, m] = relative(root, f).split(sep);
    return (!type || t === type) && (!module || m === module);
  })
  .filter((f) => suite !== "smoke" || f.endsWith(".smoke.test.js"));

if (files.length === 0) {
  console.log("No tests matched the selection.");
  process.exit(0);
}

const r = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(r.status ?? 1);
