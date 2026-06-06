// lint:asset-purity — architecture red line guard (DESIGN.md §8.2, §9.6).
//
// The composition pipeline (scanner orchestrator, conflict resolver, export
// coordinator) must stay transparent to two things: concrete asset types AND
// concrete export tools. No Skill-specific hard branches, and (v0.2.0) no
// per-tool hard branches — tool behavior comes from ToolAdapter data, never from
// `tool === 'claude-code'`-style checks. This greps for the forbidden patterns
// and fails if any appear.
//
// TypeScript pipeline code: `instanceof Skill`, `kind === 'skill'`, `as Skill`,
//   and comparing a value against a built-in tool id literal.
// Rust pipeline code: branching on `AssetKind::Skill` or a built-in `ToolId`.
//
// Exemptions: provider-internal modules ARE allowed to be type/tool-specific
// (the Skill provider; the `tool_adapters` baseline provider). Generated
// bindings, the type catalog, and i18n are not code. `custom` is not a built-in
// tool, so branching on it (it has a user-supplied path) is allowed.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const TS_PATTERNS = [
  { re: /instanceof\s+Skill\b/, label: "instanceof Skill" },
  { re: /kind\s*===\s*['"]skill['"]/, label: "kind === 'skill'" },
  { re: /\bas\s+Skill\b/, label: "as Skill" },
];
const RUST_PATTERNS = [{ re: /AssetKind::Skill\b/, label: "AssetKind::Skill branch" }];

// Built-in tool ids (DESIGN.md §1.4). `custom` is intentionally excluded: it is
// not a baseline tool and legitimately needs its own path handling.
const TOOL_IDS = "claude-code|cursor|codex|opencode|gemini-cli";
const TS_TOOL_PATTERNS = [
  { re: new RegExp(`(===|!==|==|!=)\\s*['"](${TOOL_IDS})['"]`), label: "per-tool id comparison" },
  { re: new RegExp(`['"](${TOOL_IDS})['"]\\s*(===|!==|==|!=)`), label: "per-tool id comparison" },
];
const RUST_TOOL_PATTERNS = [
  { re: /ToolId::(ClaudeCode|Cursor|Codex|OpenCode|GeminiCli)\b/, label: "ToolId per-tool branch" },
];

// Path fragments that are exempt (provider internals, generated/output, vendor).
const EXEMPT = [
  "node_modules",
  "target",
  `${sep}i18n${sep}`,
  "generated.ts",
  "provider",
  "tool_adapters", // the ToolAdapter baseline provider may be tool-specific
];

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
// Per-tool guard: tool behavior must be data-driven. The Rust pipeline lives in
// the core crate, so scan it too; tool_adapters (the provider) is exempt above.
scan(["src"], [".ts", ".tsx"], TS_TOOL_PATTERNS, violations);
scan(["src-tauri/src", "src-tauri/crates/agentmix-core/src"], [".rs"], RUST_TOOL_PATTERNS, violations);

if (violations.length > 0) {
  console.error("lint:asset-purity found asset-kind or per-tool hard branches in pipeline code:");
  for (const v of violations) console.error("  " + v);
  console.error(
    `\n${violations.length} violation(s). Pipeline code must work through the Asset and ToolAdapter abstractions.`,
  );
  process.exit(1);
}

console.log("lint:asset-purity OK — no asset-kind or per-tool hard branches in pipeline code.");
