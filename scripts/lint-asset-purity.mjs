// lint:asset-purity — architecture red line guard (DESIGN.md §8.2, §9.6).
//
// The composition pipeline (scanner orchestrator, conflict resolver, export
// coordinator) must stay transparent to concrete asset types: no Skill-specific
// hard branches. This greps for the forbidden patterns and fails if any appear.
//
// TypeScript pipeline code: `instanceof Skill`, `kind === 'skill'`, `as Skill`.
// Rust pipeline code: branching on `AssetKind::Skill`.
//
// Exemptions: provider-internal modules ARE allowed to be Skill-specific (the
// Skill provider). Generated bindings, the type catalog, and i18n are not code.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const TS_PATTERNS = [
  { re: /instanceof\s+Skill\b/, label: "instanceof Skill" },
  { re: /kind\s*===\s*['"]skill['"]/, label: "kind === 'skill'" },
  { re: /\bas\s+Skill\b/, label: "as Skill" },
];
const RUST_PATTERNS = [{ re: /AssetKind::Skill\b/, label: "AssetKind::Skill branch" }];

// Path fragments that are exempt (provider internals, generated/output, vendor).
const EXEMPT = ["node_modules", "target", `${sep}i18n${sep}`, "generated.ts", "provider"];

function walk(dir, exts, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "target") continue;
      walk(full, exts, files);
    } else if (exts.some((e) => entry.endsWith(e))) {
      files.push(full);
    }
  }
  return files;
}

function scan(roots, exts, patterns, violations) {
  for (const root of roots) {
    let files;
    try {
      files = walk(root, exts);
    } catch {
      continue; // root may not exist yet
    }
    for (const file of files) {
      if (EXEMPT.some((frag) => file.includes(frag))) continue;
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const { re, label } of patterns) {
          if (re.test(line)) {
            violations.push(`${relative(".", file)}:${i + 1}  [${label}]  ${line.trim()}`);
          }
        }
      });
    }
  }
}

const violations = [];
scan(["src"], [".ts", ".tsx"], TS_PATTERNS, violations);
scan(["src-tauri/src"], [".rs"], RUST_PATTERNS, violations);

if (violations.length > 0) {
  console.error("lint:asset-purity found Skill-specific hard branches in pipeline code:");
  for (const v of violations) console.error("  " + v);
  console.error(`\n${violations.length} violation(s). Pipeline code must work through the Asset abstraction.`);
  process.exit(1);
}

console.log("lint:asset-purity OK — no Skill-specific hard branches in pipeline code.");
