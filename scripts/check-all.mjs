// check:all — the single command that must pass before a v0.1 commit ships
// (CLAUDE.md §4). Runs every gate in order, fails fast, and prints a per-step
// summary with timings. Cheap frontend gates run first, then the slower Rust
// compile/clippy/test pass.
//
// The two v0.1 e2e specs (golden + conflict) are the headless integration tests
// in agentmix-core/tests/e2e_pipeline.rs; they run as part of `cargo test`. The
// WebdriverIO UI suite (`pnpm test:e2e`) is a separate manual gate and is not
// run here (see e2e/README.md).

import { spawnSync } from "node:child_process";

const MANIFEST = "src-tauri/Cargo.toml";

const steps = [
  ["type-check", "pnpm type-check"],
  ["eslint", "pnpm lint"],
  ["lint:asset-purity", "pnpm lint:asset-purity"],
  ["lint:no-direct-write", "pnpm lint:no-direct-write"],
  ["lint:i18n", "pnpm lint:i18n"],
  ["lint:i18n:keys", "pnpm lint:i18n:keys"],
  ["vitest", "pnpm test"],
  ["cargo fmt", `cargo fmt --all --check --manifest-path ${MANIFEST}`],
  ["cargo clippy", `cargo clippy --workspace --all-targets --manifest-path ${MANIFEST} -- -D warnings`],
  // Includes the golden + conflict headless e2e (tests/e2e_pipeline.rs).
  ["cargo test", `cargo test --workspace --manifest-path ${MANIFEST}`],
];

const results = [];
for (const [name, cmd] of steps) {
  process.stdout.write(`\n▶ ${name}: ${cmd}\n`);
  const start = Date.now();
  const r = spawnSync(cmd, { stdio: "inherit", shell: true });
  const secs = ((Date.now() - start) / 1000).toFixed(1);
  const ok = r.status === 0;
  results.push([name, ok, secs]);
  if (!ok) {
    process.stdout.write(`\n✖ ${name} failed (exit ${r.status}) after ${secs}s\n`);
    printSummary(results);
    process.exit(1);
  }
}

printSummary(results);
process.stdout.write("\ncheck:all OK — all gates passed.\n");

function printSummary(rows) {
  process.stdout.write("\n── check:all summary ──\n");
  for (const [name, ok, secs] of rows) {
    process.stdout.write(`  ${ok ? "✓" : "✖"} ${name} (${secs}s)\n`);
  }
}
