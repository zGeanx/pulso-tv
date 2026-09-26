import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync(".output/server/wrangler.json")) {
  console.error("missing .output/server/wrangler.json");
  process.exit(1);
}

const env = { ...process.env };
delete env.WRANGLER_CI_MATCH_TAG;

const result = spawnSync(
  "npx",
  ["wrangler", "deploy", "--config", ".output/server/wrangler.json", "--name", "pulso-tv"],
  { stdio: "inherit", env, shell: true },
);

process.exit(result.status ?? 1);
