// lint:i18n — architecture red line guard.
//
// Rule: user-visible text must go through i18n t(key); no hardcoded localizable
// text in source. DESIGN.md phrases this as "no hardcoded non-ASCII strings",
// but a literal non-ASCII scan false-positives on typographic glyphs (…—·) and
// icon characters. The language this project localizes into is Chinese, so we
// detect CJK characters specifically — that captures the real risk (someone
// hardcoding Chinese UI text) without flagging punctuation or icon glyphs.
//
// Scope: src/**/*.{ts,tsx}, excluding src/i18n/ (the catalogs themselves).
// Note: this guards against hardcoded localized text going forward; it does not
// by itself prove every English literal was lifted into the catalog.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_DIR = "src";
const EXCLUDED_DIR = join("src", "i18n");
const CJK = /[一-鿿぀-ヿ가-힯]/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (full === EXCLUDED_DIR) continue;
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];
for (const file of walk(SRC_DIR)) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (CJK.test(line)) {
      violations.push(`${relative(".", file)}:${i + 1}  ${line.trim()}`);
    }
  });
}

if (violations.length > 0) {
  console.error("lint:i18n found hardcoded localizable (CJK) text outside src/i18n/:");
  for (const v of violations) console.error("  " + v);
  console.error(`\n${violations.length} violation(s). Move the text into src/i18n and use t(key).`);
  process.exit(1);
}

console.log("lint:i18n OK — no hardcoded CJK text in source.");
