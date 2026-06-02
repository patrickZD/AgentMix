// lint:no-direct-write — architecture red line guard (DESIGN.md §8.2).
//
// Only ExportCoordinator.execute (agentmix-core/src/exporter.rs) may modify
// user files. Every other module must read only. This greps Rust production
// code for filesystem write APIs and fails if any appear outside the exporter.
//
// Test code legitimately writes to tempdirs, so it is excluded two ways: each
// file is scanned only up to its first `#[cfg(test)]` (the inline test module
// always sits at the end), and Cargo integration-test directories (`tests/`,
// which are entirely test code) are skipped during the walk.
// The frontend never writes files directly; we also flag tauri-plugin-fs write
// calls in TS so that stays true.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const RUST_WRITE_PATTERNS = [
  { re: /\bfs::write\b/, label: "fs::write" },
  { re: /\bfs::create_dir(_all)?\b/, label: "fs::create_dir" },
  { re: /\bfs::copy\b/, label: "fs::copy" },
  { re: /\bfs::rename\b/, label: "fs::rename" },
  { re: /\bfs::remove_(file|dir|dir_all)\b/, label: "fs::remove_*" },
  { re: /\bFile::create\b/, label: "File::create" },
  { re: /\bOpenOptions\b/, label: "OpenOptions" },
];
const TS_WRITE_PATTERNS = [
  { re: /@tauri-apps\/plugin-fs/, label: "tauri-plugin-fs import" },
  { re: /\bwriteTextFile\b|\bwriteFile\b/, label: "plugin-fs write call" },
];

// The sole sanctioned writer of user files (exporter.rs), the dev-time codegen
// binary (export_bindings.rs writes generated.ts, not user files), and
// non-source dirs.
const EXEMPT = ["exporter.rs", "export_bindings.rs", "node_modules", "target", "generated.ts"];

function walk(dir, exts, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Skip deps/build output and Cargo integration-test dirs (test-only code).
      if (entry === "node_modules" || entry === "target" || entry === "tests") continue;
      walk(full, exts, files);
    } else if (exts.some((e) => entry.endsWith(e))) {
      files.push(full);
    }
  }
  return files;
}

// Production code only: drop the inline `#[cfg(test)]` module (tests write to
// tempdirs, which is fine). Fragility: this truncates at the FIRST `#[cfg(test)]`,
// assuming the test module sits at the end of the file (the convention here). A
// `#[cfg(test)]` item placed above real code would hide writes after it.
function productionSource(content) {
  const idx = content.indexOf("#[cfg(test)]");
  return idx === -1 ? content : content.slice(0, idx);
}

function scan(roots, exts, patterns, violations) {
  for (const root of roots) {
    let files;
    try {
      files = walk(root, exts);
    } catch {
      continue;
    }
    for (const file of files) {
      if (EXEMPT.some((frag) => file.includes(frag))) continue;
      const lines = productionSource(readFileSync(file, "utf8")).split("\n");
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
scan(["src-tauri/src", "src-tauri/crates"], [".rs"], RUST_WRITE_PATTERNS, violations);
scan(["src"], [".ts", ".tsx"], TS_WRITE_PATTERNS, violations);

if (violations.length > 0) {
  console.error("lint:no-direct-write found file-write calls outside ExportCoordinator.execute:");
  for (const v of violations) console.error("  " + v);
  console.error(
    `\n${violations.length} violation(s). Only agentmix-core/src/exporter.rs may write user files.`,
  );
  process.exit(1);
}

console.log("lint:no-direct-write OK — only the export coordinator writes user files.");
