# AgentMix v0.2.0 开发任务拆分——多目标导出引擎

## Context

v0.1.5 Beta 已于 2026-06-03 发布（`pnpm check:all` 全绿，自动更新 / 手动合并工作台 / i18n 全等 / CSP 收紧 / 字体本地化均上线）。按 `docs/ROADMAP.md`，下一站是 **Phase 2 / v0.2**。

**关键判断：DESIGN.md 的 v0.2 不是一个阶段。** 它把 17 项功能塞进同一版本——跨平台、整套 AI 增强、复现生态、多目标导出——实际是 3–5 个发布的工作量。强行写成一份 17 功能大计划会违反垂直切片与阶段检查点原则，也不符合项目一贯的范围纪律。因此把 v0.2 拆为可独立发布的子里程碑，本计划**详细规划第一条主线 v0.2.0 = 多目标导出引擎**，其余子里程碑在文末给低分辨率大纲。

**为什么 v0.2.0 选多目标导出引擎**（而非 AI / 复现 / 跨平台）：

- 兑现产品核心定位。当前只导出 Claude Code 项目级；"导出到 Cursor / Codex / OpenCode / Gemini"是产品名与定位的最大未兑现承诺。
- 风险最低。纯确定性 Rust + React，扩展已验证的导出管线，**零新外部依赖**（不引入 reqwest / git2 / keyring），可 headless 测试。
- 解锁下游。RuntimeConflict 显化与 Capability Linter 都依赖多目标先落地。
- 契合团队已验证的工作模式（v0.1 / v0.1.5 的确定性管线与 headless e2e）。

> **范围决策待复审**：本计划尝试用交互问题确认 v0.2 优先级，工具调用被批准流程拒绝，遂按上述推荐默认推进。若复审时倾向先做 AI 套件 / 复现生态 / 跨平台，本计划整体可改向，文末大纲即备选主线。

仓库现状核实（2026-06-03，源自实际代码）：

| 项 | 现状 | 代码位置 |
|---|---|---|
| 导出目标 | 单一 `target_dir`，硬定为 `<path>/.claude/skills`；`execute` 校验路径以 `/.claude/skills` 结尾 | `agentmix-core/src/exporter.rs`（约 :100 / :321） |
| ToolAdapter | **无**。仅 Claude Code 项目级 | — |
| Asset 抽象 | 真实透明，pipeline 走 `ExportRequestItem` / `ConflictCandidate`，无 `kind == skill` 硬分支，`lint:asset-purity` 守卫 | `composer.rs`、`exporter.rs` |
| 外部依赖 | 无 `reqwest` / `git2` / `keyring`；`tauri-plugin-updater` 已在 | `src-tauri/Cargo.toml` |
| ExportPlan | 单目标：`target_dir` + `operations` + `conflicts` + `backups` + `security_reports` + `managed_manifest` + `total_bytes` | `agentmix-types/src/lib.rs` |
| 类型同步 | specta `export-bindings` bin → `src/types/generated.ts`（`pnpm gen:types`） | `agentmix-types/src/bin/export_bindings.rs` |
| 发布 | `.github/workflows/release.yml`，tag `v*` 触发，签名 + draft + `latest.json` | `.github/workflows/release.yml` |

## 架构决策

1. **范围切分**：v0.2 拆为子里程碑；v0.2.0 = 多目标导出引擎。AI 套件 / 复现生态 / 跨平台 / 散件作为后续子里程碑（文末大纲）。
2. **ToolAdapter 来源 = 内嵌 baseline**：`tool-adapters.json` 经 `include_str!` 编译进二进制（数据取自 §6.4 表，标注数据日期）。v0.2.0 **不**做远程刷新与新鲜度 UI（需网络 reqwest）——延后到引入网络的子里程碑。这是相对 DESIGN §6.4 / §6.10 的有意收窄，需在 DESIGN.md 加注（改文档前确认，见开放问题 1）。
3. **零新外部依赖**：v0.2.0 不引入 reqwest / git2 / keyring；matrix 内嵌，行为数据驱动。
4. **行为数据驱动，无 per-tool 硬分支**：planner / execute / conflict 的工具差异全部来自 ToolAdapter 数据；禁止 `tool == 'claude-code'` 之类硬分支（扩展 asset-purity 同源精神）。
5. **execute 路径限制泛化**：从单一 `ends_with "/.claude/skills"` 改为"每个 operation path 必须 canonical-confined 于本次 plan 解析出的 destination roots 集合之内"，保留 path-traversal 防护。这是**安全关键**改动。
6. **ExportPlan 单一数据源扩展到多目标**：plan 与 execute 在所有目标上 path / byte 一致（DoD-3 的多目标版）。
7. **ExportConflict 四维化**：按 (tool, scope, destination root, exported_name) 判定（§6.2 决策 22）——同名 skill 导到不同 destination root 不算冲突；同一 root 内同名才算。
8. **警告不阻断、冲突阻断**：RuntimeConflict 与 Capability warning 均为警告级，不阻断导出；唯一阻断仍是 ExportConflict。
9. **全局 scope 备份**：全局位置（`~/.<tool>/skills/`）覆盖风险更高，备份仍强制；backup hash 从 project-hash 扩为 destination-root-hash，统一写 `~/.agentmix/backups/<root-hash>/`，预览明示全局写入位置。

## 架构红线

继承 v0.1 / v0.1.5 全部红线（asset-purity / no-direct-write / ExportPlan 单一数据源 / 预览→确认→执行 / i18n `t(key)` / 备份隔离 / Skill 校验不放宽 / i18n key 全等 / 更新签名不降级），本里程碑新增四条：

| 红线 | 含义 | 守护手段 |
|---|---|---|
| ToolAdapter 数据驱动 | pipeline 内无 per-tool 硬分支，工具行为差异全部来自 adapter 数据 | 扩展 `lint:asset-purity`（或新增 `lint:adapter-purity`）+ code review（T30） |
| 多目标 plan/execute 一致 | 所有目标的 path / byte 在 plan 与 execute 间逐一致 | T32 单测 + 多目标 headless e2e |
| execute 路径限制泛化不降级 | 每个写入路径必须 canonical-confined 于 plan 的 destination roots，拒绝逃逸 | T31 安全单测矩阵（`..` / 绝对路径 / 跨 root 注入 / symlink） |
| 警告不阻断、冲突阻断 | RuntimeConflict / Capability 仅警告；ExportConflict 阻断导出 | T35 / T36 单测 + UI 门禁测试 |

## 依赖图

```
T30 ToolAdapter 抽象 + 内嵌 baseline + scope 路径解析（headless）   ← 地基
   └─ T31 现有 Claude Code 导出改走 adapter（单目标，行为不变；execute 路径限制泛化）  ← 关键风险，排前
         └─ T32 多目标 plan/execute + target-aware ExportConflict + Cursor 第二适配器 + headless e2e
               └─ T33 目标选择器 UI（多选 + scope）+ exportStore 多目标 + Dry-run 分目标渲染
                     └─ T34 其余适配器（Codex / OpenCode / Gemini）+ 多路径 + 全局 scope + 全局备份
                           ├─ T35 RuntimeConflict 检测与显化（警告级）+ UI
                           └─ T36 Capability Linter（内嵌 matrix + 逐字段校验）+ UI
                                 └─ T37 i18n 全等 + 文档 + v0.2.0 发布
```

高风险项（ExportPlan 结构变更、execute 路径限制泛化）刻意排在 T31，先用"同一行为换抽象"的切片隔离验证，再在 T32 引入多目标。

T38（PR CI）独立于主线，可在任意时点并行，建议早做以便后续 PR 自动门禁。

---

## Phase 0：地基

### T30 — ToolAdapter 抽象 + 内嵌 baseline + scope 路径解析
**描述：** 在 `agentmix-types` 定义 `ToolAdapter`（对齐 §6.4：`id` / `displayName` / `projectPaths` / `userPaths` / `adminPaths` / `precedence` / `duplicateNameBehavior` / `reloadBehavior`）与 `ExportTarget`（`tool` + `scope: project|global` + `customPath?`）。在 `agentmix-core` 新增 `tool_adapters` 模块，内嵌 baseline `tool-adapters.json`（claude-code / cursor / codex / opencode / gemini-cli，数据取自 §6.4 表并标注数据日期），`include_str!` 编译进二进制；提供纯函数 `resolve_destination_roots(adapter, scope, target_project_path, home_dir) -> Vec<PathBuf>`（project → projectPaths 相对 `target_project_path`；global → userPaths 相对 home）。本任务**不改导出管线**，仅落地数据与解析逻辑 + 单测。同步扩展 lint 守卫禁止 pipeline 内 per-tool 硬分支。
**验收标准：**
- [ ] 五个内置 adapter 反序列化成功，关键路径字段与 §6.4 表一致（单测断言）
- [ ] `resolve_destination_roots` 对 project / global 两 scope、单 / 多路径工具均返回正确绝对路径（含 Windows 路径规范化）
- [ ] lint 守卫能命中"pipeline 内 `tool == 'claude-code'` 硬分支"反例（加反例验证后移除）
**验证：** `cargo test`（adapter 反序列化 + 路径解析单测）；`pnpm gen:types && pnpm type-check` 无漂移；`pnpm lint:asset-purity`。
**依赖：** 无
**文件：** `src-tauri/crates/agentmix-types/src/lib.rs`、`src-tauri/crates/agentmix-core/src/tool_adapters.rs`（新建）、`src-tauri/crates/agentmix-core/src/tool-adapters.json`（新建）、`src-tauri/crates/agentmix-core/src/lib.rs`、`scripts/lint-asset-purity.mjs`、`src/types/generated.ts`（生成）
**规模：** M

### T38 — PR CI workflow（独立，建议早做）
**描述：** 新建 `.github/workflows/ci.yml`：push 与 PR 触发，windows-latest，pnpm install → `pnpm check:all` 门禁（不构建安装包、不签名，与 release workflow 区分）。让回归在合入前暴露，而非等打 tag 才发现。
**验收标准：**
- [ ] push / PR 触发的 run 跑完整 `check:all` 并在失败时阻断
- [ ] 与 `release.yml` 互不干扰（CI 不产安装包、不触碰签名 secret）
**验证：** 在一个临时分支 push 触发 run 全绿；故意引入一处 lint 错误验证 run 变红后复原。
**依赖：** 无（与主线并行）
**文件：** `.github/workflows/ci.yml`
**规模：** S

### Checkpoint J（T30）— 地基就位
- [ ] ToolAdapter 数据与路径解析单测全过；TS 类型同步无漂移
- [ ] per-tool 硬分支守卫生效；人工复核

---

## Phase 1：管线改走 adapter（关键风险隔离）

### T31 — 现有 Claude Code 导出改走 ToolAdapter（单目标，行为不变）
**描述：** 把 `build_export_plan` / `execute` 中硬编码的 `.claude/skills` 目标改为 adapter 驱动——以 claude-code project adapter 解析出的 destination root 替代。**用户可见行为零变化**：现有 golden / conflict / merged headless e2e 必须逐字节通过。同步把 `execute` 的路径限制从 `ends_with "/.claude/skills"` 泛化为"每个 operation path 必须 canonical-confined 于本次 plan 解析出的 destination roots 集合之内"，保留 path-traversal 防护。ExportPlan 暂仍单目标，多目标在 T32 引入；本切片只做"同一行为换抽象"，隔离风险。
**验收标准：**
- [ ] 现有全部 headless e2e（golden / conflict / merged）通过，目标产物逐字节不变
- [ ] 路径限制泛化单测：`..` 穿越、绝对路径注入、跨 destination-root 注入、symlink 逃逸全部被拒
- [ ] `lint:no-direct-write` / `lint:asset-purity` 仍 0 命中
**验证：** `cargo test`；`pnpm lint:no-direct-write && pnpm lint:asset-purity`；`pnpm gen:types && pnpm type-check`。
**依赖：** T30
**文件：** `src-tauri/crates/agentmix-core/src/exporter.rs`、`src-tauri/crates/agentmix-core/tests/e2e_pipeline.rs`、`src-tauri/crates/agentmix-types/src/lib.rs`（ExportPlan 如需带 destination roots 字段）、`src-tauri/src/lib.rs`（命令如需透传 adapter）
**规模：** M（关键风险，排前 fail fast）

### Checkpoint K（T31）— 行为零回归换抽象
- [ ] Claude Code 导出经新 ToolAdapter 抽象行为零回归（headless 逐字节比对）
- [ ] execute 路径限制泛化后逃逸用例全部被拒
- [ ] 全门禁绿；人工复核

---

## Phase 2：多目标真实跑通

### T32 — 多目标 plan/execute + target-aware ExportConflict + Cursor 第二适配器
**描述：** ExportPlan 升级为多目标（`targets: Vec<{ adapter, scope, destination_roots }>`，operations 关联到具体 target；对齐 §8.2 `ExportPlan.targets`）。`build_export_plan` 对每个选定 target 产出该 target 的 FileOperation 与 BackupPlan；`execute` 顺序消费所有 target 的 operations，单一入口不变。ExportConflict 检测改为 **target-aware**：按 (tool, scope, destination root, exported_name) 四维判定——同名 skill 导到不同 destination root 不冲突，同一 root 内同名才冲突（§6.2 决策 22）。端到端接入 **Cursor**（project `.cursor/skills/`）作为第二个具体适配器。新增 headless e2e：同一组 skill 同时导出到 claude-code + cursor，断言两 destination 各自正确且与源逐字节一致。
**验收标准：**
- [ ] 单测：同名 skill 导 CC + Cursor 不触发 ExportConflict；同一 root 内同名触发并阻断
- [ ] headless e2e：CC + Cursor 双目标导出，两侧内容逐字节一致；plan == execute 在所有 target 上 path / byte 一致
- [ ] backups 对每个 target / destination root 各自生成，预览汇总正确
**验证：** `cargo test`（含新多目标 e2e）；`pnpm gen:types && pnpm type-check`；`pnpm lint:no-direct-write`。
**依赖：** T31
**文件：** `agentmix-core/src/exporter.rs`、`composer.rs`、`agentmix-types/src/lib.rs`、`agentmix-core/tests/e2e_pipeline.rs`、`src-tauri/src/lib.rs`（命令签名如变）、`src/types/generated.ts`（生成）
**规模：** M–L（建议 2 个 checkpoint commit：(1) 多目标 plan/execute；(2) target-aware conflict + Cursor e2e）

### T33 — 目标选择器 UI（多选 + scope）+ exportStore 多目标 + Dry-run 分目标渲染
**描述：** ExportPanel 目标选择从单一 Claude Code 改为多选适配器列表（每项可选 project / global scope），沿用 v0.1.5 的"最近用过目标路径 / 已导入源项目"快捷项语义（用于 project scope 的 `target_project_path`）。`exportStore` 由单 `targetPath` 扩为 `selectedTargets: ExportTarget[]` + 各自 path / scope；buildPlan 传多目标。Dry-run UI 按 target 分组渲染 operations（绿 / 黄 / 红）、各 target 备份位置、受影响数与字节汇总。所有新文案走 `t(key)`，en / zh 同步。
**验收标准：**
- [ ] 选 ≥2 个 target 后预览分组展示，每组路径 / 操作正确；未选 target 时导出禁用
- [ ] Vitest 覆盖 exportStore 多目标分支：增删 target、scope 切换、plan 失效重建
- [ ] `lint:i18n` 0 命中（无硬编码文案）
**验证：** `pnpm test`；`pnpm lint:i18n`；`pnpm tauri dev` 人工多目标预览。
**依赖：** T32
**文件：** `src/components/ExportPanel.tsx`、`src/stores/exportStore.ts`、`src/lib/exporter.ts`、`src/i18n/en.json`、`src/i18n/zh.json`
**规模：** M

### Checkpoint L（T32–T33）— 多目标 golden path
- [ ] 人工跑通：勾选 1 个 skill → 选 Claude Code + Cursor（project）→ 预览分目标展示 → 导出 → `.claude/skills` 与 `.cursor/skills` 均出现该 skill 且内容一致
- [ ] 多目标 headless e2e + 全门禁绿
- [ ] 人工复核

---

## Phase 3：scope 与其余适配器

### T34 — 其余适配器（Codex / OpenCode / Gemini）+ 多路径 + 全局 scope + 全局备份
**描述：** 补齐 Codex CLI（project `.agents/skills/`、user `~/.agents/skills/`、admin `/etc/codex/skills/`，merge-all / show-both）、OpenCode（多 projectPaths）、Gemini CLI（多 projectPaths）三个 baseline 适配器并端到端接入。多路径工具的导出目标策略：默认只写各工具**主 projectPath** 一处（见开放问题 2），策略在代码与文档显式记录，不静默写多份。全局 scope（见 `ROADMAP.md`：scope=global 时路径自动解析为 `~/.<tool>/skills/`，用户无需知道路径）端到端打通；全局位置覆盖风险更高，备份 hash 改为 destination-root-hash，覆盖 `~/.agentmix/backups/<root-hash>/`，预览明示全局写入位置；覆盖全局已有 skill 需显式确认（后端强制，沿用 v0.1）。
**验收标准：**
- [ ] 五个内置适配器 project / global 解析与导出端到端单测 / 集成覆盖
- [ ] 多路径工具默认只写主路径，单测断言不产生多份副本
- [ ] 全局 scope 导出生成备份且预览明示位置；覆盖全局已有 skill 需显式确认
**验证：** `cargo test`；`pnpm tauri dev` 对临时 HOME / 临时项目人工验证全局与多工具。
**依赖：** T33
**文件：** `agentmix-core/src/tool_adapters.rs`、`tool-adapters.json`、`exporter.rs`、`agentmix-core/tests/e2e_pipeline.rs`
**规模：** M

---

## Phase 4：冲突与兼容性显化

### T35 — RuntimeConflict 检测与显化（警告级）
**描述：** 按 §6.2 / 决策 22 落地 RuntimeConflict：导出前由 adapter behavior（`precedence` / `duplicateNameBehavior`）+ 目标位置已存在的同名 skill + scope（项目 / 全局）联合计算，作为 `runtimeWarnings` 进入 ExportPlan。文案数据驱动按 adapter 行为渲染（如 Claude Code project-first / last-wins 覆盖提示；Codex show-both 共存提示）。**警告级，不阻断导出**（唯一阻断仍是 ExportConflict）。Dry-run UI 以警告样式展示，明确告知运行时可能行为。
**验收标准：**
- [ ] 单测：global + project 同名（project-first）产生 runtime warning；Codex 同名产生 show-both 提示；均不阻断
- [ ] UI 展示 runtime warnings 且不禁用导出；ExportConflict 仍禁用导出
- [ ] Vitest 覆盖警告渲染与导出门禁分支
**验证：** `cargo test`；`pnpm test`；`pnpm tauri dev` 人工构造同名场景。
**依赖：** T34
**文件：** `agentmix-core/src/composer.rs`（或新增 `runtime_conflict` 模块）、`exporter.rs`、`agentmix-types/src/lib.rs`、`src/components/ExportPanel.tsx`、`src/i18n/*.json`、`src/types/generated.ts`（生成）
**规模：** M

### T36 — Capability Linter（内嵌 compatibility-matrix + 逐字段校验）
**描述：** 按 §6.10 落地兼容性预检：`agentmix-core` 内嵌 baseline `compatibility-matrix.json`（每工具对各 SKILL.md 字段的 `supported` / `ignored` / `error` / `experimental` 状态，扁平 PR 友好 schema，标注数据日期），`include_str!` 编译进二进制。导出前对每个选定 skill × 目标工具比对其使用的字段（如 `allowed-tools`），命中 ignored / error / experimental 生成警告（如"此 Skill 使用 `allowed-tools`，在 Cursor 中会被忽略"）。**警告级，不阻断**。v0.2.0 不做远程刷新与新鲜度 UI（开放问题 1）。
**验收标准：**
- [ ] 单测：使用 `allowed-tools` 的 skill 导到 Cursor 触发 ignored 警告；导到 Claude Code 不触发
- [ ] 警告进入 ExportPlan 并在 Dry-run 展示，不阻断导出
- [ ] matrix 反序列化单测；schema 与 §6.10 一致
**验证：** `cargo test`；`pnpm test`；`pnpm tauri dev` 人工验证。
**依赖：** T34（可与 T35 并行）
**文件：** `agentmix-core/src/capability.rs`（新建）、`compatibility-matrix.json`（新建）、`exporter.rs`、`agentmix-types/src/lib.rs`、`src/components/ExportPanel.tsx`、`src/i18n/*.json`、`src/types/generated.ts`（生成）
**规模：** M

### Checkpoint M（T34–T36）— 全工具 + scope + 两类警告
- [ ] 五工具 + project / global scope 端到端可导出
- [ ] RuntimeConflict 与 Capability 两类警告正确显示、均不阻断；ExportConflict 仍阻断
- [ ] 全门禁绿；人工复核

---

## Phase 5：收口与发布

### T37 — i18n 全等 + 文档 + v0.2.0 发布
**描述：** zh.json 补齐至与 en.json key 全等（本里程碑 T33 / T35 / T36 新增 key），`lint:i18n:keys` 维持全等校验；版本号 bump（`package.json` / `tauri.conf.json` / `Cargo.toml` workspace 各 crate）；CHANGELOG 0.2.0 条目（新增多目标导出 / project & global scope / RuntimeConflict / 兼容性预检；已知限制注明 AI / 复现 / 跨平台 / 远程矩阵刷新仍在后续；SHA-256 由 CI 回填）；DESIGN.md 加注"v0.2.0 内嵌 baseline 矩阵、远程刷新延后"（改 DESIGN 前确认）；README 边界更新——多目标导出已可用（改 README 前确认）；实现与 DESIGN 偏离处先改文档再合入；推 `v0.2.0` tag 走现有 release workflow 产 draft → 人工核验资产与 `latest.json` → publish；发布后用 0.2.0 安装包对临时 prerelease 验证 0.1.5 → 0.2.0 自动更新流，验证后删临时 release。
**验收标准：**
- [ ] `pnpm check:all` 全绿（含新多目标 headless e2e、adapter purity 守卫、zh = en）
- [ ] Release 资产含 `.msi` / `.exe` / `.sig` / `latest.json`，SHA-256 回填 CHANGELOG
- [ ] 0.1.5 → 0.2.0 自动更新流人工验证通过，结果记录 CHANGELOG
**验证：** CI run 全绿；资产目检；更新流人工实测。
**依赖：** 全部（T30–T36）
**文件：** `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`（及各 crate）、`docs/CHANGELOG.md`、`docs/DESIGN.md`（确认）、`README.md`（确认）、`src/i18n/zh.json`
**规模：** M

### Checkpoint N（T37）— 发布
- [ ] v0.2.0 DoD 全绿
- [ ] Release 发布，自动更新流验证
- [ ] 人工复核

---

## 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| ExportPlan 结构破坏性变更波及前端所有导出 UI 与 generated 类型 | 高 | T30 / T31 先定型 type，`pnpm gen:types` 后 `type-check` 守 drift；T31 "行为不变"切片先验证再上多目标 |
| execute 路径限制泛化引入逃逸漏洞 | 高 | T31 安全单测矩阵（`..` / 绝对路径 / symlink / 跨 root），security review；canonical 化后再比对 root |
| 全局 scope 覆盖用户级 skills 误删 | 高 | 强制备份（destination-root-hash）+ 预览明示 + 覆盖显式确认（后端强制） |
| ToolAdapter baseline 路径数据过期（各工具改路径） | 中 | 内嵌 baseline + 文档注明数据日期；远程刷新延后子里程碑承接（开放问题 1） |
| 多路径工具（OpenCode 多 projectPaths）导出语义歧义 | 中 | T34 明确"默认只写主路径"，代码与文档记录，不静默写多份 |
| Codex show-both / merge-all 与 last-wins 的 RuntimeConflict 文案差异 | 低 | 文案数据驱动按 adapter behavior 渲染，T35 单测覆盖各行为 |

## 已确认决策

2026-06-03 用户确认按建议执行，原为开放问题：

1. **矩阵远程刷新延后**：v0.2.0 只内嵌 baseline（标注数据日期）；tool-adapters.json / compatibility-matrix.json 的远程刷新与新鲜度 UI 延到引入网络的 v0.2.1。**需在 DESIGN.md §6.4 / §6.10 加注此收窄——改 DESIGN 前单独确认（T37）。**
2. **多路径工具只写主路径**：OpenCode / Gemini 等多 projectPath 工具，默认只写各工具原生主路径（OpenCode → `.opencode/skills/`，Gemini → `.gemini/skills/`），不写共享的 `.claude/` / `.agents/`，避免副本与跨工具撞车。主路径在代码与文档写死记录（T34）。
3. **custom 适配器纳入**：v0.2.0 纳入最小形态——用户自填路径，默认 last-wins 覆盖 / 同名报错（T30 类型 + T33 UI）。
4. **全局备份用 destination-root-hash**：项目级与全局级统一按目标根目录算 hash，备份目录仍为 `~/.agentmix/backups/<hash>/`（T34）。
5. **加 PR CI**：新增 push / PR 跑 `check:all` 的 workflow，作为独立小任务 T38（不阻塞主线）。

## v0.2.0 验收标准（阶段 DoD）

1. 多目标 golden path：单次导出到 Claude Code + Cursor（≥2 工具），两目标 destination 内容与源逐字节一致，headless e2e + 人工各一遍。
2. 五个内置适配器（claude-code / cursor / codex / opencode / gemini-cli）+ custom 路径解析单测覆盖；project / global scope 均可解析。
3. execute 路径限制泛化：逃逸用例（`..` / 绝对路径 / 跨 root / symlink）全部被拒，单测覆盖。
4. ExportConflict target-aware：同名导不同工具不冲突；同 destination root 同名阻断导出。
5. RuntimeConflict + Capability warning 在 Dry-run 正确显示、均为警告级不阻断；ExportConflict 仍阻断。
6. ExportPlan 为多目标唯一数据源，plan == execute 在所有目标上 path / byte 一致。
7. 零新外部依赖（无 reqwest / git2 / keyring 引入）；matrix 内嵌。
8. pipeline 无 per-tool 硬分支（adapter purity 守卫 / review 通过）。
9. `pnpm check:all` 全绿（含新 headless e2e 与新守卫）；zh = en key 全等。
10. GitHub Release 由 CI 产出（沿用 v0.1.5 流水线），资产含 `.sig` + `latest.json` + SHA-256。

## 明确不做（v0.2.0 范围外，后续子里程碑）

AI 全家桶（合并 / 健康检查 / 一键修复）/ OS keychain / 语义聚类、`.agentmix.lock` / Preset / Bundle / Source Tracking / Git URL 导入、跨平台 macOS / Linux + 原生菜单栏、Skill 编辑器（CodeMirror）/ 脚手架 / 引用检测、安全规则误报白名单、tool-adapters / compatibility-matrix 远程刷新与新鲜度 UI。

---

## 后续子里程碑大纲（v0.2.x roadmap，低分辨率，顺序非锁定）

> 复审时可调整顺序或合并。每条到时再做与本计划同等粒度的拆分。

- **v0.2.1 复现与来源生态**：引入 `git2` → Git URL 导入（§6.8）→ Source Tracking 更新检测（§6.8）→ `.agentmix.lock`（7 字段，§6.9 / 附录 A）→ Preset / Bundle 配置集（§6.7）。引入网络后顺带做 tool-adapters / compatibility-matrix 远程刷新 + 新鲜度 UI（承接开放问题 1）。
- **v0.2.2 AI 增强套件**：`keyring`（OS keychain 统一密钥入口，§9.7 / 决策 10）+ `reqwest` → AI 合并模式（§6.3）→ AI 健康检查（语义重合 / 内容质量 / 脚本行为，§6.5）→ AI 一键修复（强制 diff 预览，决策 18）→ 语义聚类与颜色高亮（Voyage + HDBSCAN，§6.18）。红线：AI 依赖路径唯一、强制 diff、密钥不静默降级。
- **v0.2.3 跨平台**：macOS / Linux 构建 + 签名 / 公证 + 原生菜单栏（macOS 文化要求）+ 各平台路径 / 拖拽 / 权限长尾。
- **v0.2.4 散件**：Skill 编辑器（CodeMirror 6，含合并工作台 Markdown 实时预览回填，§6.6）+ Skill 脚手架（内嵌 skill-creator 方法论，§6.13）+ Skill 引用关系检测（§6.14）+ `scripts/` 安全规则误报白名单（§6.11）。

---

## 备注：文档分层与命名

版本工作记录按版本分目录组织：`tasks/<version>/{spec,plan,todo}.md`（v0.2.0 起；v0.1.0 / v0.1.5 已回溯迁入，并补 thin spec 记录 as-shipped 范围）。`spec` / `plan` / `todo` 对应 spec-driven 的 SPECIFY / PLAN / TASKS 三阶段，门禁评审落在文件之间。跨版本的产品愿景（PRD）、架构当前真相（`docs/DESIGN.md`）、决策记录（ADR）留在 `docs/`；项目级稳定 spec（Commands / Code Style / Testing / 全局 Always·AskFirst·Never）留在 `CLAUDE.md`。任务编号跨版本连续（v0.1 T1–T18、v0.1.5 T19–T29、v0.2.0 T30+），与 CHANGELOG 引用一致避免歧义。

这与触发本规划的 slash command 字面要求（写入 `tasks/plan.md` / `tasks/todo.md`）有偏离——刻意为之，以适配多版本增量结构，并保留历史不被覆盖。
