import { existsSync, readFileSync, writeFileSync } from "node:fs";

const generatedPath = ".output/server/wrangler.json";

if (!existsSync(generatedPath)) {
  console.error(`missing ${generatedPath}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(generatedPath, "utf8"));
config.name = "pulso-tv";
writeFileSync(generatedPath, `${JSON.stringify(config, null, 2)}\n`);
console.log("worker name: pulso-tv");
