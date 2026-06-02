# UI e2e (WebdriverIO + tauri-driver)

Two WebDriver specs over the real packaged app on Windows:

- `golden-path.spec.ts` — scan a folder, add 3 skills, Dry-run preview, export; asserts the target `.claude/skills/` subdirectories on disk.
- `conflict-path.spec.ts` — two repos ship the same `code-review` skill, rename one to resolve the `NameCollision`, export; asserts both directories coexist and the renamed skill's frontmatter `name:` is synced.

The deterministic pipeline assertions also run headless (no GUI) in `src-tauri/crates/agentmix-core/tests/e2e_pipeline.rs` (`cargo test`); this suite adds the real UI click-through.

> Status (2026-06-01): both suites pass — the headless `e2e_pipeline` suite
> (`cargo test`) and these two WebDriver UI specs (`pnpm test:e2e`), verified on
> Edge/WebView2 148.0.3967.96, tauri-driver 2.0.6, WDIO 9.27.

## How the e2e binary is built

`onPrepare` builds with the **Tauri CLI**, not raw `cargo`:

```
tauri build --debug --no-bundle --features e2e   # with VITE_E2E=1
```

This matters. A plain `cargo build` (debug) produces a binary that loads the
dev-server URL (`devUrl`, localhost:5173); with no Vite dev server running under
automation the webview lands on `chrome-error://chromewebdata/` and `#root`
stays empty. `tauri build` runs `beforeBuildCommand` (`pnpm build`), embeds the
fresh `frontendDist`, and builds in production mode so the binary loads the
embedded frontend. `--debug` keeps it a fast debug-profile build, `--no-bundle`
skips installers, `--features e2e` enables the test command, and `VITE_E2E`
embeds the folder-pick hook.

## CI

This suite needs a real display plus `tauri-driver` + `msedgedriver`, so it is
**not** part of `pnpm check:all` (that gate stays headless/unattended). Run it on
a machine with a desktop session, or a CI runner configured for WebView2
WebDriver. The headless `e2e_pipeline` suite covers the same golden/conflict
filesystem assertions in `check:all`.

## Prerequisites (Windows)

1. **WebView2 runtime** (ships with Windows 11) and a matching `msedgedriver.exe` on `PATH`. Match the driver to your installed Edge/WebView2 version: <https://developer.microsoft.com/microsoft-edge/tools/webdriver/>.
2. **tauri-driver**: `cargo install tauri-driver` (installs to `~/.cargo/bin`).
3. **Node deps**: `pnpm install` (pulls the `@wdio/*`, `webdriverio`, `tsx` devDependencies).

## Run

```
pnpm test:e2e
```

`onPrepare` builds the e2e binary for you via `tauri build --debug --no-bundle --features e2e` (see "How the e2e binary is built" above). The specs drive `src-tauri/target/debug/agentmix.exe`.

## The native-dialog seam

WebDriver cannot drive the OS folder picker, so folder selection is fed in instead of clicked:

- Rust: `e2e_set_next_pick(path)` queues the path the next `pick_directory` returns. It is compiled **only** under `--features e2e` (default-off), so it is never in a production build.
- Frontend: `main.tsx` exposes `window.__agentmixE2E.setNextPick` **only** when built with `VITE_E2E` (dead-code-eliminated otherwise).
- Specs call `queuePick(dir)` (see `helpers.ts`) right before clicking the add-project / target buttons.

Both gates are off by default, so nothing in this seam reaches a shipped build.

## Selectors

Specs target stable `data-testid` / `data-project` attributes (inert in production):
`welcome-add-project`, `add-project`, `data-project="<name>"`, `skill-add`, `export-target`, `export-preview`, `export-run`, `combo-rename`, `combo-rename-input`, `combo-rename-confirm`.
