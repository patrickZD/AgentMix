# Spec: AgentMix v0.2.0 — 多目标导出引擎

> 状态：草案，待评审。2026-06-03。技术实现拆分见同目录 `plan.md`，任务清单见 `todo.md`。

## 目标

把 AgentMix 的导出能力从"仅 Claude Code 项目级"扩展为多目标导出：用户一次组合，可同时导出到 Claude Code / Cursor / Codex / OpenCode / Gemini（及用户自填的 custom 工具），支持项目级与全局两种 scope，并在导出前显化运行时冲突与字段兼容性风险。

- **为什么先做这条**：多目标导出在 DESIGN.md 中已规划，v0.1–v0.1.5 均未落地。扩展点在现有 `ExportCoordinator` 之上，不新增依赖，可用 headless pipeline 测试。`RuntimeConflict` 检测和兼容性预检的实现依赖多目标 API，排在本条之后。
- **目标用户**：`PRD.md` 的开发者用户。直接服务场景 A（团队标准化：一套组合铺到成员各自所用的不同工具）与场景 B（个人多仓库组合）。

## 范围

v0.2.0 仅交付以下：

1. ToolAdapter 抽象 + 内嵌 baseline（claude-code / cursor / codex / opencode / gemini-cli + custom）
2. 多目标 ExportPlan / execute（一次导出 N 个目标）
3. 项目级 / 全局 scope 路径解析（全局自动解析 `~/.<tool>/skills/`，用户无需知道路径）
4. target-aware ExportConflict（按 tool / scope / destination root / exported_name 四维判定）
5. RuntimeConflict 显化，警告级不阻断
6. Capability Linter：内嵌 compatibility-matrix 逐字段校验，警告级不阻断
7. 多目标目标选择器 UI + Dry-run 分目标渲染
8. PR CI workflow

明确不在 v0.2.0，归入后续子里程碑（详见 plan.md 文末大纲）：

- AI 合并 / 健康检查 / 一键修复、OS keychain、语义聚类 → v0.2.2
- `.agentmix.lock`、Preset、Bundle、Source Tracking、Git URL 导入、矩阵远程刷新与新鲜度提示 → v0.2.1
- macOS / Linux、原生菜单栏 → v0.2.3
- Skill 编辑器、脚手架、引用检测、安全规则误报白名单 → v0.2.4

## 验收标准（DoD）

与 plan.md 验收标准逐条对应：

1. 单次导出到 ≥2 个工具（CC + Cursor），各目标内容与源逐字节一致——headless e2e 与人工各一遍。
2. 五个内置适配器 + custom 的 project / global 路径解析有单测覆盖。
3. execute 路径限制泛化：`..`、绝对路径、跨 destination root、symlink 逃逸用例全部被拒（单测）。
4. ExportConflict target-aware：同名导不同工具不冲突；同一 destination root 内同名阻断导出。
5. RuntimeConflict 与 Capability 两类警告在 Dry-run 正确显示且均不阻断；ExportConflict 仍阻断。
6. ExportPlan 为多目标唯一数据源，plan 与 execute 在所有目标上 path / byte 一致。
7. 零新外部依赖（无 reqwest / git2 / keyring）；矩阵内嵌。
8. pipeline 无 per-tool 硬分支（adapter purity 守卫与 review 通过）。
9. `pnpm check:all` 全绿（含新 headless e2e 与新守卫）；zh 与 en key 全等。
10. GitHub Release 由 CI 产出，资产含 `.sig`、`latest.json`、SHA-256。

## 边界

全局 Always / Ask first / Never 见 `CLAUDE.md` §5 / §1 / §3。本版新增或强调：

- **Always**：工具行为差异全部来自 ToolAdapter 数据；execute 写入前校验每个 path canonical-confined 于本次 plan 的 destination roots 之内。
- **Ask first**：改 `docs/DESIGN.md`（加注矩阵远程刷新延后）、改 `README.md`（边界更新）、引入任何新依赖（本版目标零新依赖，若发现必须引入先确认）。
- **Never**：在 pipeline 写 `tool == 'claude-code'` 之类硬分支；为适配某工具放宽 Skill 校验；绕过 ExportPlan 或 `ExportCoordinator.execute` 直接写目标目录；让 RuntimeConflict 或 Capability warning 阻断导出（仅 ExportConflict 阻断）。

## 已确认决策

2026-06-03 确认，原为开放问题：

1. 矩阵远程刷新延后到 v0.2.1，本版只内嵌 baseline 并标注数据日期；需在 DESIGN.md §1.4 / §1.10 加注，改前确认（T37）。
2. 多路径工具只写各工具原生主路径：OpenCode 写 `.opencode/skills/`，Gemini 写 `.gemini/skills/`，不写共享的 `.claude/` 或 `.agents/`。
3. custom 适配器纳入最小形态：用户自填路径，默认 last-wins 覆盖、同名报错。
4. 全局备份用 destination-root-hash，目录仍为 `~/.agentmix/backups/<hash>/`。
5. 加 PR CI，任务 T38。

## 开放问题

无。5 项原开放问题已决；唯一待执行确认项是 T37 改 `docs/DESIGN.md` 与 `README.md` 前的逐项确认。

## 工程约定

本 spec 只记录版本特定的目标、范围、验收（DoD）、边界增量与开放问题；Commands / 目录结构 / 代码风格 / 测试策略不随版本变，以 `CLAUDE.md` §3–§5（及 `docs/DESIGN.md` §3）为准。

## 关联

- 技术实现计划：同目录 `plan.md`
- 任务清单：同目录 `todo.md`
- 设计依据：`docs/DESIGN.md` §1.2 / §1.4 / §1.10 / §3.2；路线图见 `docs/ROADMAP.md`
- 决策依据（见 `docs/decisions/`）：决策 9（Asset 抽象）、22（双冲突模型）、13（兼容性矩阵社区维护）
