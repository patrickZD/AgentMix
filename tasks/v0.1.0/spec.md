# Spec: AgentMix v0.1.0 Alpha — 信任边界与单工具闭环

> 回溯整理（backfilled 2026-06-03）。本文在 v0.2.0 引入 spec 分层后补写，记录 v0.1.0 已发布（as-shipped）的目标与范围，来源为 `docs/CHANGELOG.md` [0.1.0]、同目录 `plan.md`、及当时 `docs/DESIGN.md` 的 v0.1 范围方框（重构后已迁出，范围以本文为准）。v0.1.0 当时未独立成文 spec，本文用于结构统一与历史归档，非开发前契约。

## 目标

"敢用"的最小闭环：Windows 单工具单 scope 跑通，所有架构红线第一天立起；alpha 用户能完成 导入来源 → 选择 Skills → 解决冲突 → 预览 → 导出到 Claude Code 项目。

## 范围

v0.1.0 实际交付 11 项：

1. Tauri + React + TypeScript 应用框架
2. 欢迎屏（空状态）+ 主界面两栏布局 + Toolbar
3. 本地目录拖入 + 递归 SKILL.md 扫描 + 三分类（portable / tool-specific / invalid）
4. 复选框选择 + ExportConflict 检测 + "重命名 / 保留一个"冲突解决
5. Dry-run 两阶段提交（preview → confirmation → execution）+ 基础备份到 `~/.agentmix/backups/`
6. 单目标导出：Claude Code 项目级（仅 `.claude/skills/`）
7. `scripts/` 安全预检（含完整威胁模型）
8. 健康检查确定性部分（frontmatter 合规、name 一致、触发动词存在、脚本依赖）
9. i18n 架构（`react-i18next` + `t()` 红线；en.json 完整、zh.json 关键 key stub）
10. Asset 抽象 + ExportPlan 数据模型作为架构红线落地
11. 静态发布到 GitHub Releases（无自动更新，手动升级）

明确不在 v0.1：见本文「范围」一节与 `docs/ROADMAP.md` Phase 1。

## 验收标准（DoD）

实测达标：

- DoD-1 golden path 全流程 < 60s（实测 29s）
- DoD-5 扫描 1000 个 SKILL.md < 5s（实测 0.105s）
- DoD-6 冷启动到欢迎屏可交互 < 2s（实测 < 0.5s）
- DoD-7 已知高危脚本零漏报
- 完整 DoD 见 `docs/DESIGN.md` §10 与 `docs/CHANGELOG.md` [0.1.0] 性能核验表

## 工程约定

Commands / 目录结构 / 代码风格 / 测试策略以 `CLAUDE.md` §3–§5 为准。

## 关联

- 计划 / 任务：同目录 `plan.md` / `todo.md`（T1–T18）
- 发布记录：`docs/CHANGELOG.md` [0.1.0]
- 路线图定位：`docs/ROADMAP.md` Phase 1
