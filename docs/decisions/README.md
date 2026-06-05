# 设计决策记录 (ADR) 索引

本目录是 AgentMix 的关键设计决策记录，由 `DESIGN.md` v0.6 §13 附录的 24 条决策拆分而来，一条一个文件。文件名 `NNNN-slug.md` 的 `NNNN` 对应原决策编号（补零）。正文逐字保留原决策内容，仅更新跨文件引用。

工程设计文档见 [`../DESIGN.md`](../DESIGN.md)，产品文档见 [`../PRD.md`](../PRD.md)，路线图见 [`../ROADMAP.md`](../ROADMAP.md)。

| 编号 | 标题 | 文件 |
|---|---|---|
| 1 | 为什么选择 Tauri 而非 Electron | [0001-tauri-vs-electron.md](0001-tauri-vs-electron.md) |
| 2 | 为什么不做 VS Code 扩展 | [0002-no-vscode-extension.md](0002-no-vscode-extension.md) |
| 3 | 扫描策略改为全局递归而非固定路径 | [0003-global-recursive-scan.md](0003-global-recursive-scan.md) |
| 4 | 合并工作台支持手动与 AI 辅助两种模式 | [0004-merge-workbench-manual-and-ai.md](0004-merge-workbench-manual-and-ai.md) |
| 5 | 合并工作台不限于冲突场景 | [0005-merge-workbench-beyond-conflicts.md](0005-merge-workbench-beyond-conflicts.md) |
| 6 | 健康度检查重点关注 description 质量 | [0006-health-check-description-quality.md](0006-health-check-description-quality.md) |
| 7 | 产品名称从 SkillMix 改为 AgentMix | [0007-rename-skillmix-to-agentmix.md](0007-rename-skillmix-to-agentmix.md) |
| 8 | MVP 范围收口到 Windows + Claude Code 项目级 | [0008-mvp-scope-windows-claude-code.md](0008-mvp-scope-windows-claude-code.md) |
| 9 | Asset 抽象作为架构红线 | [0009-asset-abstraction-red-line.md](0009-asset-abstraction-red-line.md) |
| 10 | API 密钥统一通过 OS keychain，不静默降级 | [0010-api-key-os-keychain.md](0010-api-key-os-keychain.md) |
| 11 | 备份位置统一在 `~/.agentmix/backups/` | [0011-backup-location-agentmix-home.md](0011-backup-location-agentmix-home.md) |
| 12 | 健康检查从字符长度阈值改为结构化校验 | [0012-health-check-structural-validation.md](0012-health-check-structural-validation.md) |
| 13 | 跨工具兼容性矩阵走社区维护，不追求实时同步 | [0013-compatibility-matrix-community.md](0013-compatibility-matrix-community.md) |
| 14 | AI 功能 v0.2 默认走 API，本地模型延后到 v0.3 opt-in | [0014-ai-features-api-first.md](0014-ai-features-api-first.md) |
| 15 | embedding provider 默认且仅用 Voyage AI | [0015-embedding-provider-voyage.md](0015-embedding-provider-voyage.md) |
| 16 | i18n 在 MVP 即支持中文 + 英文，作为架构红线 | [0016-i18n-zh-en-mvp.md](0016-i18n-zh-en-mvp.md) |
| 17 | 自动更新通道——GitHub Releases + Tauri Updater | [0017-auto-update-channel.md](0017-auto-update-channel.md) |
| 18 | AI 一键修复必须强制 diff 预览，永不自动应用 | [0018-ai-fix-forced-diff.md](0018-ai-fix-forced-diff.md) |
| 19 | v0.1 定位 alpha，自动更新延到 v0.1.5 | [0019-v0.1-alpha-auto-update-deferred.md](0019-v0.1-alpha-auto-update-deferred.md) |
| 20 | i18n 架构红线 vs 翻译完整度解耦 | [0020-i18n-architecture-vs-translation.md](0020-i18n-architecture-vs-translation.md) |
| 21 | ExportPlan 作为 Dry-run 红线的数据落地 | [0021-export-plan-dry-run-data.md](0021-export-plan-dry-run-data.md) |
| 22 | 双冲突模型——ExportConflict vs RuntimeConflict 分开建模 | [0022-dual-conflict-model.md](0022-dual-conflict-model.md) |
| 23 | `.agentmix.lock` 不包含 license / 元数据 | [0023-lock-excludes-metadata.md](0023-lock-excludes-metadata.md) |
| 24 | 安全契约边界——"风险可见"而非"安全保证" | [0024-security-contract-boundary.md](0024-security-contract-boundary.md) |
