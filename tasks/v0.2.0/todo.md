# AgentMix v0.2.0 — TODO（多目标导出引擎）

任务详情见同目录 `plan.md`（产品视角的范围与验收见同目录 `spec.md`）。每个任务含验收标准与验证命令；checkpoint 处人工复核后再继续。编号续接 v0.1.5（T1–T18 见 `tasks/v0.1.0/todo.md`，T19–T29 见 `tasks/v0.1.5/todo.md`）。

> **范围决策待复审**：v0.2.0 = 多目标导出引擎，是从 DESIGN.md v0.2（17 项功能，跨多发布）中按依赖与风险切出的第一条主线。其余子里程碑见同目录 `plan.md` 文末大纲。复审可改向。

## Phase 0：地基
- [x] **T30** ToolAdapter 抽象（types，含 custom 形态）+ 内嵌 baseline `tool-adapters.json`（5 工具，`include_str!`）+ `resolve_destination_roots`（project/global scope，Windows 规范化）+ per-tool 硬分支守卫 — 依赖：无 — M
- [ ] **T38** PR CI workflow（push/PR 跑 `check:all`，不构建/不签名，与 release.yml 区分）— 依赖：无（独立，建议早做）— S

### Checkpoint J（T30）— 地基就位
- [ ] adapter 数据与路径解析单测全过；TS 类型同步无漂移；硬分支守卫生效；人工复核

## Phase 1：管线改走 adapter（关键风险隔离）
- [x] **T31** 现有 Claude Code 导出改走 adapter（单目标，行为不变；现有 headless e2e 逐字节通过）+ execute 路径限制泛化（confined 于 destination roots，逃逸用例全拒）— 依赖：T30 — M

### Checkpoint K（T31）— 行为零回归换抽象
- [ ] Claude Code 导出零回归（headless 逐字节）；逃逸用例全拒；全门禁绿；人工复核

## Phase 2：多目标真实跑通
- [x] **T32** 多目标 plan/execute（`targets[]`，operations 关联 target）+ target-aware ExportConflict（四维）+ Cursor 第二适配器 + CC+Cursor headless e2e（建议 2 个 checkpoint commit）— 依赖：T31 — M–L
- [x] **T33** 目标选择器 UI（多选 + project/global scope）+ exportStore 多目标 + Dry-run 分目标渲染 + en/zh 文案 — 依赖：T32 — M

### Checkpoint L（T32–T33）— 多目标 golden path
- [x] 人工跑通：1 skill → 选 CC + Cursor → 分目标预览 → 导出 → 两目标内容一致；多目标 headless e2e + 全门禁绿；人工复核（2026-06-06 通过；预览 header 过紧已修，240d4be）

## Phase 3：scope 与其余适配器
- [x] **T34** 其余适配器（Codex / OpenCode / Gemini）+ 多路径工具默认只写主路径 + 全局 scope 解析（`~/.<tool>/skills/`）+ 全局备份（destination-root-hash）+ 覆盖显式确认 — 依赖：T33 — M

## Phase 4：冲突与兼容性显化
- [ ] **T35** RuntimeConflict 检测与显化（adapter behavior + 目标已有同名 + scope；警告级不阻断）+ UI — 依赖：T34 — M
- [ ] **T36** Capability Linter（内嵌 `compatibility-matrix.json` + 逐字段校验；警告级不阻断）+ UI — 依赖：T34（可与 T35 并行）— M

### Checkpoint M（T34–T36）— 全工具 + scope + 两类警告
- [ ] 五工具 + project/global 端到端可导出；两类警告正确显示且不阻断；ExportConflict 仍阻断；全门禁绿；人工复核

## Phase 5：收口与发布
- [ ] **T37** i18n 全等（zh=en，新增 key）+ 版本 bump + CHANGELOG 0.2.0 + DESIGN.md 加注（确认）+ README 边界更新（确认）+ tag → release workflow → draft → 核验 → publish + 0.1.5→0.2.0 自动更新流验证 — 依赖：全部 — M

### Checkpoint N（T37）— 发布
- [ ] v0.2.0 DoD 全绿；Release 发布；自动更新流验证；人工复核

---

## 已确认决策

2026-06-03 按建议执行，原为开放问题：
1. 矩阵远程刷新延后到 v0.2.1，v0.2.0 只内嵌 baseline；需在 DESIGN.md 加注（T37 改前确认）
2. 多路径工具只写各工具原生主路径（OpenCode→`.opencode/`，Gemini→`.gemini/`），不写共享 `.claude/`·`.agents/`（T34）
3. custom 适配器纳入最小形态：用户自填路径 + 默认 last-wins/同名报错（T30+T33）
4. 全局备份用 destination-root-hash，目录仍 `~/.agentmix/backups/<hash>/`（T34）
5. 加 PR CI，独立任务 T38

## 后续子里程碑大纲

各子里程碑的详细拆分见同目录 plan.md。

- v0.2.1 复现与来源生态（git2 / Git URL / Source Tracking / .agentmix.lock / Preset·Bundle + 矩阵远程刷新）
- v0.2.2 AI 增强套件（keyring + reqwest / AI 合并·健康·修复 / 语义聚类）
- v0.2.3 跨平台（macOS·Linux + 签名公证 + 原生菜单栏）
- v0.2.4 散件（Skill 编辑器 / 脚手架 / 引用检测 / 安全白名单）
