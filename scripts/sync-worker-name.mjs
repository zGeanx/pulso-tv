import { existsSync, readFileSync, writeFileSync } from "node:fs";

const configPath = ".output/server/wrangler.json";

if (!existsSync(configPath)) {
  console.error(`missing ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
const name =
  process.env.WRANGLER_CI_OVERRIDE_NAME ||
  process.env.CLOUDFLARE_WORKER_NAME ||
  process.env.CF_WORKER_NAME;

if (!name || config.name === name) {
  console.log(`worker name: ${config.name}`);
  process.exit(0);
}

config.name = name;
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`set worker name to ${name}`);
