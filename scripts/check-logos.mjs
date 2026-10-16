import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const PULSO_ORIGIN = "https://api.pulso-tv.online";
const logosSource = readFileSync(new URL("../src/lib/team-logos.ts", import.meta.url), "utf8");
const assetsSource = readFileSync(new URL("../src/lib/pulso-assets.ts", import.meta.url), "utf8");

const entries = [];
for (const match of logosSource.matchAll(/^\s*(?:"([^"]+)"|([A-Za-z0-9]+)):\s*\n?\s*"([^"]+)"/gm)) {
  const name = match[1] || match[2];
  const url = match[3];
  if (url.startsWith("http") || url.startsWith("/logos/")) entries.push([name, url]);
}

const logoLiteral = assetsSource.match(/const LOGO_FILE = \/([\s\S]*?)\/i;/);
if (!logoLiteral) {
  console.error("LOGO_FILE regex not found");
  process.exit(1);
}
const logoFile = new RegExp(logoLiteral[1], "i");
const underscoreSamples = [
  "teams/sao_paulo.png",
  "teams/cerro_porteno.png",
  "teams/boca_juniors.png",
  "teams/coventry_city.png",
  "teams/newcastle_united.png",
  "teams/al_nassr.png",
];
const rejectedUnderscore = underscoreSamples.filter((file) => !logoFile.test(file));

function paeth(a, b, c) {
  const estimate = a + b - c;
  const toA = Math.abs(estimate - a);
  const toB = Math.abs(estimate - b);
  const toC = Math.abs(estimate - c);
  if (toA <= toB && toA <= toC) return a;
  if (toB <= toC) return b;
  return c;
}

function pngInfo(buf) {
  if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    return { png: false, transparent: false };
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let trns = false;
  const idats = [];
  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "tRNS") trns = true;
    else if (type === "IDAT") idats.push(data);
    else if (type === "IEND") break;
    offset += 12 + length;
  }
  if (bitDepth === 8 && (colorType === 6 || colorType === 4) && idats.length > 0) {
    const channels = colorType === 6 ? 4 : 2;
    const raw = inflateSync(Buffer.concat(idats));
    const rowLength = width * channels;
    const stride = rowLength + 1;
    if (raw.length < height * stride) return { png: true, transparent: false };
    const pixels = Buffer.alloc(height * rowLength);
    for (let y = 0; y < height; y++) {
      const filter = raw[y * stride];
      const src = y * stride + 1;
      const dst = y * rowLength;
      for (let i = 0; i < rowLength; i++) {
        const left = i >= channels ? pixels[dst + i - channels] : 0;
        const up = y > 0 ? pixels[dst - rowLength + i] : 0;
        const upLeft = y > 0 && i >= channels ? pixels[dst - rowLength + i - channels] : 0;
        const value = raw[src + i];
        if (filter === 1) pixels[dst + i] = (value + left) & 255;
        else if (filter === 2) pixels[dst + i] = (value + up) & 255;
        else if (filter === 3) pixels[dst + i] = (value + Math.floor((left + up) / 2)) & 255;
        else if (filter === 4) pixels[dst + i] = (value + paeth(left, up, upLeft)) & 255;
        else pixels[dst + i] = value;
      }
    }
    for (let index = channels - 1; index < pixels.length; index += channels) {
      if (pixels[index] < 250) return { png: true, transparent: true };
    }
    return { png: true, transparent: false };
  }
  return { png: true, transparent: trns };
}

const problems = [];
if (rejectedUnderscore.length > 0) {
  problems.push(`LOGO_FILE rejeita underscore: ${rejectedUnderscore.join(", ")}`);
}

const byUrl = new Map();
for (const [name, url] of entries) {
  const names = byUrl.get(url) ?? [];
  names.push(name);
  byUrl.set(url, names);
}
for (const [url, names] of byUrl) {
  if (names.length > 1) problems.push(`URL duplicada (${names.join(", ")}): ${url}`);
}

const byHash = new Map();

async function fetchCrest(url) {
  const headers = { "User-Agent": "pulso-tv-check-logos/1.0" };
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(url, { redirect: "follow", headers });
    if (response.status !== 429 && response.status !== 503) return response;
    await response.arrayBuffer();
    await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
  }
  return fetch(url, { redirect: "follow", headers });
}

let wikiInFlight = 0;
async function withWikiSlot(url, run) {
  const wiki = url.includes("upload.wikimedia.org");
  if (!wiki) return run();
  while (wikiInFlight >= 2) await new Promise((resolve) => setTimeout(resolve, 150));
  wikiInFlight += 1;
  try {
    return await run();
  } finally {
    wikiInFlight -= 1;
  }
}

const queue = [...entries];
const workers = Array.from({ length: 4 }, async () => {
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) return;
    const [name, raw] = next;
    const url = raw.startsWith("/logos/") ? `${PULSO_ORIGIN}${raw}` : raw;
    try {
      const response = await withWikiSlot(url, () => fetchCrest(url));
      const buf = Buffer.from(await response.arrayBuffer());
      const info = response.ok ? pngInfo(buf) : { png: false, transparent: false };
      if (!response.ok || !info.png || !info.transparent) {
        problems.push(
          `${name}: HTTP ${response.status}, png=${info.png}, transparência=${info.transparent}`,
        );
        continue;
      }
      const hash = createHash("sha256").update(buf).digest("hex");
      const names = byHash.get(hash) ?? [];
      names.push(name);
      byHash.set(hash, names);
    } catch (error) {
      problems.push(`${name}: ${error instanceof Error ? error.message : error}`);
    }
  }
});
await Promise.all(workers);

for (const [hash, names] of byHash) {
  if (new Set(names).size > 1) {
    problems.push(`mesma imagem (${names.join(", ")}): ${hash.slice(0, 12)}`);
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log(`${entries.length} escudos ok`);
