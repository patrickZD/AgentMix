# 贡献指南

AgentMix v0.1 Alpha。改动前先读 `docs/DESIGN.md`（v0.1 范围与架构红线）与根目录 `CLAUDE.md`（编码与提交约定）。本文只补开发流程的操作细节。

## 环境

- Node.js 20+、pnpm（仓库锁定 `pnpm@9.15.9`）、Rust stable。
- 仅 Windows 目标（v0.1）。

```
pnpm install
```

## 常用命令

| 目的 | 命令 |
|---|---|
| 开发模式（起窗口） | `pnpm tauri dev` |
| 前端构建 | `pnpm build` |
| 类型检查 | `pnpm type-check` |
| ESLint | `pnpm lint` |
| 前端单测 | `pnpm test` |
| Rust 测试（含 headless e2e） | `cargo test --manifest-path src-tauri/Cargo.toml` |
| Rust lint / 格式 | `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` / `cargo fmt --manifest-path src-tauri/Cargo.toml --all` |
| 全部 gate | `pnpm check:all` |
| 性能基准（DoD-5，Release） | `pnpm perf` |
| 重新生成跨端类型 | `pnpm gen:types` |
| 打包安装包 | `pnpm tauri build` |

提交前 `pnpm check:all` 必须全绿。

## 架构红线（提交会被拦的几条）

- **Asset 抽象**：pipeline 不写 `Skill` 专属硬分支（`kind === 'skill'` / `as Skill` / `AssetKind::Skill`）。守护：`lint:asset-purity`。
- **唯一写入口**：只有 `agentmix-core::exporter::execute`（`ExportCoordinator.execute`）能改用户文件。守护：`lint:no-direct-write`（Cargo 集成测试目录 `tests/` 例外）。
- **i18n 全覆盖**：用户可见文案全部走 `t(key)`，`en.json` 为完整目录、`zh.json` 是其子集。守护：`lint:i18n` / `lint:i18n:keys`。
- **预览 = 执行**：Dry-run 预览与 `execute` 消费同一个 `ExportPlan`；备份只写 `~/.agentmix/backups/<project-hash>/`，不落目标项目树。

## 跨端类型

Rust struct/enum 是跨端数据模型的唯一来源（`src-tauri/crates/agentmix-types`）。改模型后跑 `pnpm gen:types` 重新生成 `src/types/generated.ts`，不要手改生成文件。该 crate 不依赖 Tauri，所以类型生成与 `cargo test` 都能 headless 跑。

## 测试约定

- 业务逻辑放在 tauri-free 的 `agentmix-core`，用 `tempfile` 写真实样本做单测 / 集成测试（headless）。
- golden / conflict 的端到端断言在 `src-tauri/crates/agentmix-core/tests/e2e_pipeline.rs`（`cargo test` 自动跑）。
- WebDriver UI e2e 在 `e2e/`，是独立手动 gate，当前存在 WebView2 自动化加载的已知限制（见 `e2e/README.md`），不进 `check:all`。
- 断言绑定业务行为（分类结果、冲突判定、导出后的文件与 frontmatter），不只校验数据结构。

## 提交

- 分支开发，`type(scope): description` 英文 commit message。
- 不要自动 push，等确认。
