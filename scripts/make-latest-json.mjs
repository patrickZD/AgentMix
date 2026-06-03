// make-latest-json — assemble the Tauri updater manifest (latest.json) from
// the signed bundle artifacts (plan T22, DESIGN.md §6.16).
//
// The updater is pointed at the NSIS setup exe: Tauri recommends nsis over msi
// for updates (passive reinstall semantics); the msi + .sig are still uploaded
// for manual installs. Run after `pnpm tauri build` with:
//   TAG  — the release tag, e.g. v0.1.5 (defaults to v<version>)
//   GITHUB_REPOSITORY — owner/repo (defaults to patrickZD/AgentMix)
//   RELEASE_NOTES — optional notes override; falls back to the annotated tag
//   message, then to a generic line.
// Writes src-tauri/target/release/bundle/latest.json and prints it.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BUNDLE_DIR = "src-tauri/target/release/bundle";
const DEFAULT_REPO = "patrickZD/AgentMix";
// The updater platform key for the only v0.1.x target (Windows x64).
const PLATFORM_KEY = "windows-x86_64";

const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
const version = conf.version;
const tag = process.env.TAG || `v${version}`;
const repo = process.env.GITHUB_REPOSITORY || DEFAULT_REPO;

const nsisDir = path.join(BUNDLE_DIR, "nsis");
const exeName = readdirSync(nsisDir).find((f) => f.endsWith("-setup.exe"));
if (!exeName) {
  console.error(`make-latest-json: no *-setup.exe under ${nsisDir} — run \`pnpm tauri build\` first.`);
  process.exit(1);
}
let signature;
try {
  signature = readFileSync(path.join(nsisDir, `${exeName}.sig`), "utf8").trim();
} catch {
  console.error(
    `make-latest-json: missing ${exeName}.sig — the build was not signed ` +
      "(set TAURI_SIGNING_PRIVATE_KEY). Refusing to emit an unsigned manifest.",
  );
  process.exit(1);
}

function tagMessage() {
  try {
    const out = execFileSync("git", ["tag", "-l", "--format=%(contents)", tag], {
      encoding: "utf8",
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

const notes = process.env.RELEASE_NOTES || tagMessage() || `AgentMix ${version}`;

const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    [PLATFORM_KEY]: {
      signature,
      url: `https://github.com/${repo}/releases/download/${tag}/${exeName}`,
    },
  },
};

const outPath = path.join(BUNDLE_DIR, "latest.json");
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`make-latest-json: wrote ${outPath}`);
console.log(JSON.stringify(manifest, null, 2));
