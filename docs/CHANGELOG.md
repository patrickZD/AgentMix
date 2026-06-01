# Changelog

本文件记录 AgentMix 的版本变更。格式参考 Keep a Changelog，版本号遵循语义化版本。

## [Unreleased] — v0.1.0 Alpha

v0.1 Alpha 的范围与边界以 `docs/DESIGN.md` 为准；完整发布说明在打包发布（T18）时补齐。

### 性能核验（DESIGN.md DoD-5 / DoD-6 / DoD-1）

实测环境：Windows 11，Release 构建。

| 指标 | 目标 | 实测 | 结论 |
|---|---|---|---|
| 扫描 1000 个 SKILL.md（DoD-5） | < 5s | **0.105s** | 达标。`pnpm perf`（`agentmix-core` 的 `perf_scan` 基准，Release） |
| 冷启动到欢迎屏可交互（DoD-6） | < 2s | 待手动实测 | GUI 指标，无法 headless 测量；需在 Release 安装包上人工计时 |
| Golden path 全流程（DoD-1） | < 60s | 待手动实测 | 人机流程指标；需人工走完 扫描 → 组合 → 预览 → 导出 并计时 |

> DoD-6 / DoD-1 依赖真实窗口与人工操作，无法在无头环境测量。T18 产出 Release 安装包后人工核验并回填实测值；在此之前不以推测值充数。
