# UI e2e (WebdriverIO + tauri-driver)

Two WebDriver specs over the real packaged app on Windows:

- `golden-path.spec.ts` — scan a folder, add 3 skills, Dry-run preview, export; asserts the target `.claude/skills/` subdirectories on disk.
- `conflict-path.spec.ts` — two repos ship the same `code-review` skill, rename one to resolve the `NameCollision`, export; asserts both directories coexist and the renamed skill's frontmatter `name:` is synced.

The deterministic pipeline assertions also run headless (no GUI) in `src-tauri/crates/agentmix-core/tests/e2e_pipeline.rs` (`cargo test`); this suite adds the real UI click-through.

> Status: this suite is wired but has **not** been executed by the author (the dev sandbox has no GUI / WebView2 WebDriver session). Run it locally and adjust selectors/versions if your environment differs.

## Prerequisites (Windows)

1. **WebView2 runtime** (ships with Windows 11) and a matching `msedgedriver.exe` on `PATH`. Match the driver to your installed Edge/WebView2 version: <https://developer.microsoft.com/microsoft-edge/tools/webdriver/>.
2. **tauri-driver**: `cargo install tauri-driver` (installs to `~/.cargo/bin`).
3. **Node deps**: `pnpm install` (pulls the `@wdio/*`, `webdriverio`, `tsx` devDependencies).

## Run

```
pnpm test:e2e
```

`onPrepare` builds the e2e binary for you: `VITE_E2E=1 pnpm build` (frontend with the test hook embedded) then `cargo build --features e2e` (Rust binary with the test command). The spec drives `src-tauri/target/debug/agentmix.exe`.

## The native-dialog seam (why a test command exists)

WebDriver cannot drive the OS folder picker, so folder selection is fed in instead of clicked:

- Rust: `e2e_set_next_pick(path)` queues the path the next `pick_directory` returns. It is compiled **only** under `--features e2e` (default-off), so it is never in a production build.
- Frontend: `main.tsx` exposes `window.__agentmixE2E.setNextPick` **only** when built with `VITE_E2E` (dead-code-eliminated otherwise).
- Specs call `queuePick(dir)` (see `helpers.ts`) right before clicking the add-project / target buttons.

Both gates are off by default, so nothing in this seam reaches a shipped build.

## Selectors

Specs target stable `data-testid` / `data-project` attributes (inert in production):
`welcome-add-project`, `add-project`, `data-project="<name>"`, `skill-add`, `export-target`, `export-preview`, `export-run`, `combo-rename`, `combo-rename-input`, `combo-rename-confirm`.
