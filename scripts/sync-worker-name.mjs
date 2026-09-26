import { existsSync, readFileSync, writeFileSync } from "node:fs";

const generatedPath = ".output/server/wrangler.json";
const committedPath = "wrangler.jsonc";

if (!existsSync(generatedPath)) {
  console.error(`missing ${generatedPath}`);
  process.exit(1);
}

function committedName() {
  if (!existsSync(committedPath)) return undefined;
  const match = readFileSync(committedPath, "utf8").match(/"name"\s*:\s*"([^"]+)"/);
  return match?.[1];
}

const name =
  process.env.WRANGLER_CI_OVERRIDE_NAME ||
  process.env.CLOUDFLARE_WORKER_NAME ||
  process.env.CF_WORKER_NAME ||
  committedName();

const config = JSON.parse(readFileSync(generatedPath, "utf8"));

if (!name) {
  console.error("worker name missing: set wrangler.jsonc name");
  process.exit(1);
}

config.name = name;
writeFileSync(generatedPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`worker name: ${name}`);
