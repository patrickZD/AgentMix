// lint:i18n:keys — architecture red line guard.
//
// Contract (v0.1.5, DESIGN.md §6.17): en.json and zh.json carry the SAME key
// set. A key missing from either side fails — zh orphans would never resolve
// against en, and en keys absent from zh would silently render English in the
// Chinese UI. (v0.1 allowed zh ⊆ en; that subset contract is retired.)

import { readFileSync } from "node:fs";

function flatten(obj, prefix = "", out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out.add(path);
    }
  }
  return out;
}

const en = JSON.parse(readFileSync("src/i18n/en.json", "utf8"));
const zh = JSON.parse(readFileSync("src/i18n/zh.json", "utf8"));

const enKeys = flatten(en);
const zhKeys = flatten(zh);

const zhOrphans = [...zhKeys].filter((k) => !enKeys.has(k));
const enOrphans = [...enKeys].filter((k) => !zhKeys.has(k));

if (zhOrphans.length > 0 || enOrphans.length > 0) {
  if (zhOrphans.length > 0) {
    console.error("lint:i18n:keys found zh.json keys missing from en.json:");
    for (const k of zhOrphans) console.error("  " + k);
  }
  if (enOrphans.length > 0) {
    console.error("lint:i18n:keys found en.json keys missing from zh.json:");
    for (const k of enOrphans) console.error("  " + k);
  }
  console.error(
    `\n${zhOrphans.length + enOrphans.length} mismatched key(s). en.json and zh.json must carry the same key set.`,
  );
  process.exit(1);
}

console.log(`lint:i18n:keys OK — en: ${enKeys.size} keys, zh: ${zhKeys.size} keys (zh = en).`);
