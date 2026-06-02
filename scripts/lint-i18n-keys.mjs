// lint:i18n:keys — architecture red line guard.
//
// Contract: en.json is the complete catalog; zh.json is a critical-key subset
// that falls back to en at runtime. Every key present in zh.json MUST exist in
// en.json (no orphan translations, so fallback always resolves). en.json is the
// superset and is allowed to have keys zh.json omits.

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

const orphans = [...zhKeys].filter((k) => !enKeys.has(k));

if (orphans.length > 0) {
  console.error("lint:i18n:keys found zh.json keys missing from en.json:");
  for (const k of orphans) console.error("  " + k);
  console.error(`\n${orphans.length} orphan key(s). en.json must contain every zh.json key.`);
  process.exit(1);
}

console.log(`lint:i18n:keys OK — en: ${enKeys.size} keys, zh: ${zhKeys.size} keys (zh ⊆ en).`);
