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

const override =
  process.env.WRANGLER_CI_OVERRIDE_NAME ||
  process.env.CLOUDFLARE_WORKER_NAME ||
  process.env.CF_WORKER_NAME;
const isWorkersCI = process.env.WORKERS_CI === "1";
const config = JSON.parse(readFileSync(generatedPath, "utf8"));

const relevant = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    /^(WRANGLER_|WORKERS_CI|CLOUDFLARE_|CF_WORKER)/.test(key),
  ),
);
console.log("cf env", JSON.stringify(relevant));

if (override) {
  config.name = override;
} else if (isWorkersCI) {
  delete config.name;
} else {
  const localName = committedName();
  if (!localName) {
    console.error("worker name missing: set wrangler.jsonc name");
    process.exit(1);
  }
  config.name = localName;
}

writeFileSync(generatedPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`worker name: ${config.name ?? "(ci override)"}`);
