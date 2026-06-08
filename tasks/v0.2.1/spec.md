# AgentMix v0.2.1 — 更新检查与版本号修正（patch）

## 定位

不在功能里程碑序列内的 patch，修复 v0.2.0 的三个已知问题，无新功能、范围不变。功能里程碑「复现与来源生态」顺延到 v0.2.2（见 `docs/ROADMAP.md`）。本次改动是 v0.2.0 发布后的 follow-up 修复，未走编号任务流，按 commit 记录。

## 范围内

1. 自动更新启动检查：从 `force=false`（命中 24h 缓存即短路）改为每次启动 `force=true` 联网检查，新发布版本下次启动即提示。检查 endpoint 仍是 release 资产 `latest.json`、非 GitHub API，本地缓存降级为「上次检查结果与时间」的记录。
2. 版本号显示：设置 footer 与欢迎页从写死字面量改为读取运行版本（Tauri `getVersion()`；非 Tauri 环境回退到构建期 package.json 版本，经 Vite `define` 注入）。
3. 单例运行：第二次启动把 argv 交给运行中的进程并聚焦已有 `main` 窗口，不再开新进程（`tauri-plugin-single-instance`，desktop-only，注册为第一个插件）。

## 范围外

- 任何 v0.2.2+ 功能（Git URL / Source Tracking / `.agentmix.lock` / Preset / Bundle / 矩阵远程刷新）。
- 更新通道选型不变（GitHub Releases 资产 `latest.json` + Tauri updater，见 `docs/decisions/0017`）。
- 已发布的 v0.1.5 / v0.2.0 二进制仍是旧逻辑，本次改动从 v0.2.1 起生效。

## 实现

- 自动更新：`src/stores/updateStore.ts` 的 `startupCheck` 改走 `check(true)`（commit `ec22ef7`）。
- 版本号：新增 `src/lib/appVersion.ts`（`readAppVersion()` + 构建期 `APP_VERSION` 兜底），`uiStore.appVersion` / `loadAppVersion`，footer i18n 改 `{{version}}` 插值（commit `d1b9e23`）。
- 单例：新增 `tauri-plugin-single-instance` 依赖；`src-tauri/src/lib.rs` 的 `run()` 以 `#[cfg(desktop)]` 把它注册为首个插件，回调里 `get_webview_window("main")` 后 unminimize / show / set_focus。

## 验收（DoD）

- [ ] `pnpm check:all` 全绿。
- [ ] release workflow 由 `v0.2.1` tag 触发，产出签名 draft（msi / exe / sig / latest.json 共 5 个资产）。
- [ ] 人工核验 0.2.0 → 0.2.1 自动更新流：旧 client 检测到 0.2.1，下载、签名校验、重启成功。
- [ ] 升级后设置面板与欢迎页显示 `v0.2.1`，不再出现旧版本号。
- [ ] 重复启动 / 双击只聚焦已有窗口，不再开新进程。
- [ ] CHANGELOG `[0.2.1]` 的 SHA-256 与体积由 CI 日志回填。
