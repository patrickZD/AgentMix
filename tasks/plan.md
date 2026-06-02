# AgentMix v0.1 Alpha 开发任务拆分

## Context

AgentMix 是本地开源桌面工具，从任意项目扫描 / 挑选 / 组合 Agent Skills 并导出到 AI 编程工具。`docs/DESIGN.md` 已冻结 v0.1 Alpha 范围（11 项交付），但代码侧只有一份 Pixso 导出的 React UI 初稿（在 `react/` 子目录），**Rust/Tauri 后端、Zustand store、i18n、测试、CI 全部为零**。本计划把 v0.1 范围拆成可独立验证的纵向切片，按依赖顺序排列，每个切片交付一条可跑通的路径，而非横向堆叠层。

目标终态（DESIGN.md DoD-1）：Windows 启动 → 拖入 / 选择 `agent-skills` 文件夹 → 勾选 3 个 Skill → 触发 ExportConflict → 重命名解决 → Dry-run 预览 → 导出到 `.claude/skills/` → 看到 3 个完整 Skill 子目录，全程 < 60 秒。

## 已确认决策

1. **目录结构**：把 `react/` 内容提升到仓库根，最终根布局为 `src/`、`src-tauri/`、`package.json`、`vite.config.ts`、`docs/`、`tasks/`，对齐 DESIGN.md 的 `agentmix/` 结构与 Tauri 默认布局。
2. **包管理器**：删除 `bun.lock`，改用 pnpm + Node 20，所有命令对齐 CLAUDE.md §4。

## 架构红线（贯穿所有任务，不可违反）

| 红线 | 含义 | 守护手段 |
|---|---|---|
| Asset 抽象 | pipeline 通过 `Asset`/`AssetProvider` 接口工作，禁止 `instanceof Skill` / `kind === 'skill'` / `as Skill` 硬分支 | `lint:asset-purity` |
| ExportCoordinator 独占写 | 只有 `ExportCoordinator.execute` 能修改用户文件 | `lint:no-direct-write` |
| ExportPlan 单一数据源 | Dry-run 预览与执行消费同一个 `ExportPlan` 对象 | DoD-3 集成测试 |
| 预览 → 确认 → 执行 | 任何导出 / 覆盖 / 删除三段式，ExportConflict 必须显式解决，禁止批量绕过 | UI + e2e |
| i18n 全覆盖 | 用户可见文本全部走 `t(key)`，`en.json` 100% 完整 | `lint:i18n` / `lint:i18n:keys` |
| 备份隔离 | 备份只写 `~/.agentmix/backups/<project-hash>/`，目标项目树内绝不出现 | DoD-8 测试 |
| Skill 校验不放宽 | 缺 `name`/`description`、name 与目录不一致、YAML 解析失败 → `invalid` | parser 单测 |

## 类型契约来源

DESIGN.md 第 716 行：**Rust struct/enum 经 `tauri-specta` 生成 TS 类型**，是跨端单一来源。现有手写的 `react/src/types.ts` 是 Pixso 草稿（`SkillStatus='healthy'|...`、`Skill` 无 Asset 抽象），与 DESIGN.md 模型不一致——按红线作废，仅保留纯 UI 类型（如 `AppView`）。后端权威模型：`Asset` / `Skill` / `SourceProject` / `HealthIssue` / `Composition` / `ExportConflict` / `ExportPlan` / `FileOperation` / `BackupPlan` / `ManagedManifest` / `ExecutionReport`（定义见 DESIGN.md §8）。

## 依赖图

```
T1 restructure+pnpm
   └─ T2 UI-kit 清理        (并行于 T3)
   └─ T3 Tauri 后端脚手架
         └─ T4 tauri-specta 数据模型 + 生成 TS + asset-purity lint
               ├─ T5 i18n 引导 + i18n lints
               ├─ T6 Zustand store 骨架
               └─ T7 Rust scanner+parser+classify (+scan command, 单测)
                     └─ T8 前端扫描接线 (SourcePanel, 按钮+拖拽, 筛选)
                           ├─ T9  health.rs 确定性检查 + HealthReport
                           └─ T10 composer.rs ExportConflict + 选择 + ConflictPanel
                                 └─ T11 exporter.rs buildPlan + ExportCoordinator.buildPlan
                                       └─ T12 Dry-run 预览 UI + 目标路径选择
                                             └─ T13 ExportCoordinator.execute + 备份 + no-direct-write
                                                   └─ T14 scripts/ 安全预检门禁
T15 欢迎屏 + 语言检测 + 设置  (依赖 T8 的扫描入口)
T16 e2e (golden + conflict)   (依赖 T13/T14)
T17 check:all + DoD 性能核验   (依赖 T16)
T18 打包 + README + Release    (依赖 T17)
```

实现顺序自底向上，每个切片留系统于可运行状态。

---

## Phase 0：地基与工具链

### T1 — 重构到根目录 + 迁移 pnpm
**描述：** 把 `react/` 内容提升到仓库根，删除 `bun.lock`，用 pnpm 重建 lockfile，补齐 CLAUDE.md §4 缺失脚本（`type-check`、`format`）。
**验收标准：**
- [ ] 根目录下 `pnpm install` / `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm type-check` 均可运行
- [ ] `bun.lock` 删除，`pnpm-lock.yaml` 生成；`index.css` 的 `--am-*` token 与现有组件保持可编译
**验证：** `pnpm install && pnpm type-check && pnpm build` 成功；`pnpm dev` 启动 Vite。
**依赖：** 无
**文件：** 根 `package.json`、`vite.config.ts`、`tsconfig*.json`、`eslint.config.js`、`src/`（移动）、`.gitignore`
**规模：** M

### T2 — 清理 Pixso 多余 UI 套件
**描述：** 移除 `@mui/material`、`@emotion/*`、`@arco-design/web-react`、`antd`、`tdesign-react` 等 Pixso 冗余依赖；现有 9 个组件里的 MUI `Tooltip`/`IconButton`/`Switch` 改用项目已装的 `@radix-ui/*` 或自建，去掉 Emotion 运行时；清理绝对定位、重复样式、无语义命名、未使用节点。
**验收标准：**
- [ ] `package.json` 不再含 MUI/Emotion/Arco/antd/tdesign
- [ ] 9 个组件编译通过，JSX 布局、Tailwind 类、`--am-*` token 保留，视觉与 Pixso 稿一致
**验证：** `pnpm type-check && pnpm build` 通过；逐一打开 `/preview/*` 路由目检无回归。
**依赖：** T1
**文件：** `package.json`、`src/components/*.tsx`（约 9 个）
**规模：** M

### T3 — Tauri 2.0 后端脚手架
**描述：** 新建 `src-tauri/`（`Cargo.toml`、`tauri.conf.json` 锁定 Windows、`frontendDist` 指向构建产物、`build.rs`、`src/main.rs`、`src/lib.rs`）；注册 `tauri-plugin-dialog`、`tauri-plugin-fs`；放一个 `ping` 命令验证 IPC。
**验收标准：**
- [ ] `pnpm tauri dev` 在 Windows 打开窗口并渲染 React 应用
- [ ] 前端调用 `ping` 命令拿到返回；`cargo build` / `cargo clippy -- -D warnings` / `cargo fmt --check` 通过
**验证：** `pnpm tauri dev` 起窗；DevTools 验证 `ping` IPC 往返。
**依赖：** T1
**文件：** `src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`src-tauri/build.rs`、`src-tauri/src/main.rs`、`src-tauri/src/lib.rs`
**规模：** M

### T4 — tauri-specta 数据模型 + 生成 TS 类型
**描述：** 在 Rust 侧定义 v0.1 全部数据模型 struct/enum（仅模型，无业务逻辑），用 `serde` + `specta` 标注；接入 `tauri-specta` 在构建时生成 `src/types/generated.ts`；前端改用生成类型，保留 `src/types/app.ts` 放纯 UI 类型（`AppView` 等）；废弃旧 `types.ts`。落地 `scripts/lint-asset-purity`（grep 检查无 Skill 硬分支）。
**验收标准：**
- [ ] 改 Rust struct 后重新生成，`src/types/generated.ts` 同步更新
- [ ] `AssetKind = 'skill'` 等枚举正确生成；`pnpm lint:asset-purity` 通过（当前应为 0 命中）
**验证：** 改一个字段跑生成命令确认 diff；`pnpm type-check` + `pnpm lint:asset-purity` 通过。
**依赖：** T3
**文件：** `src-tauri/src/models.rs`、`src-tauri/src/lib.rs`（specta 导出）、`src/types/generated.ts`（生成）、`src/types/app.ts`、`scripts/lint-asset-purity.mjs`
**规模：** M

### T5 — i18n 引导 + 文案外提
**描述：** 接入 `react-i18next`，建 `src/i18n/en.json`（覆盖现有组件全部 key）+ `src/i18n/zh.json`（关键 key stub，缺失回落 en）；启动读 `navigator.language` 检测语言；把现有组件硬编码文案全部改为 `t(key)`。落地 `scripts/lint-i18n`（无 `t()` 外硬编码非 ASCII 文本）与 `scripts/lint-i18n-keys`（en/zh key 集合一致性校验）。
**验收标准：**
- [ ] 所有用户可见文案走 `t(key)`，含按钮 / 错误 / 空状态 / tooltip / modal
- [ ] `pnpm lint:i18n` 与 `pnpm lint:i18n:keys` 通过；切换语言即时生效无需重启
**验证：** `pnpm lint:i18n && pnpm lint:i18n:keys` 通过；运行时切语言目检。
**依赖：** T4
**文件：** `src/i18n/index.ts`、`src/i18n/en.json`、`src/i18n/zh.json`、`src/components/*.tsx`（接 `t()`）、`scripts/lint-i18n.mjs`、`scripts/lint-i18n-keys.mjs`
**规模：** M

### T6 — Zustand store 骨架
**描述：** 建 `src/stores/`：`projectStore`（来源项目 + 扫描结果）、`compositionStore`（选择 / 冲突 / 解决）、`exportStore`（ExportPlan / 执行报告）、`uiStore`（view / 设置）。把现有组件从本地 hook + `mockData` 切到 store（暂用空初值或 mock 注入），业务逻辑与视图渲染分离。
**验收标准：**
- [ ] 4 个 store 建立，组件读写经 store，不再直接依赖 `mockData`
- [ ] Vitest 覆盖 store 的关键分支（如选择 / 取消选择切换）
**验证：** `pnpm test`（store 单测）通过；`pnpm type-check` 通过。
**依赖：** T4
**文件：** `src/stores/projectStore.ts`、`src/stores/compositionStore.ts`、`src/stores/exportStore.ts`、`src/stores/uiStore.ts`、对应 `*.test.ts`
**规模：** M

### Checkpoint A（T1–T6）
- [ ] `pnpm tauri dev` 在 Windows 起窗渲染 React，`ping` IPC 通
- [ ] `pnpm type-check` / `pnpm lint` / `cargo clippy` / `cargo fmt --check` / `pnpm test`（store）全绿
- [ ] `lint:asset-purity` / `lint:i18n` / `lint:i18n:keys` 通过
- [ ] **人工复核后再进入 Phase 1**

---

## Phase 1：扫描 → 展示（第一条真实纵向切片）

### T7 — Rust 扫描 + 解析 + 三分类
**描述：** `scanner.rs`：`walkdir` 递归（默认深度 5、上限 8 命名常量），跳过 `.git/`/`node_modules/`/`target/`，识别 `SKILL.md`，检测 symlink 但不跟随。`parser.rs`：`serde_yaml` 解析 frontmatter，校验 `name`/`description` 必填、`name` 与父目录名大小写不敏感一致、字符上限（name≤64、description≤1024）。三分类 portable / tool-specific（用了 `allowed-tools` 等实验字段）/ invalid。暴露 `scan_project` Tauri 命令返回 `SourceProject{ skills: Skill[] }`。
**验收标准：**
- [ ] 合规 Skill → portable；用实验字段 → tool-specific；缺字段 / name 不一致 / YAML 失败 → invalid
- [ ] 跳过指定目录、不跟随 symlink；命中 1000 文件场景的扫描在 Release 下 < 5s（DoD-5，本任务先建基准）
**验证：** `cargo test`（scanner/parser 单测，用真实 `tempdir` 造样本，覆盖三分类与边界）通过。
**依赖：** T4
**文件：** `src-tauri/src/scanner.rs`、`src-tauri/src/parser.rs`、`src-tauri/src/lib.rs`（注册命令）、`src-tauri/tests/scan_tests.rs`
**规模：** M

### T8 — 前端扫描接线
**描述：** `SourcePanel` + `SkillItem` 渲染真实扫描结果；"选择文件夹"按钮（`tauri-plugin-dialog`）与拖拽两条入口完全等价；invalid 默认隐藏 + 设置可切换"显示无效候选"；按健康度 / 关键词（name+description）/ 分类筛选；结果写入 `projectStore`。
**验收标准：**
- [ ] 选择真实文件夹后左栏出现分类后的 Skill 树；按钮入口与拖拽等价
- [ ] invalid 默认隐藏可切换；筛选生效
**验证：** `pnpm tauri dev` 选择 `agent-skills` 仓库目录，左栏正确渲染；Vitest 覆盖筛选 / 隐藏分支。
**依赖：** T7、T8 依赖 T6 store
**文件：** `src/components/SourceProjectPanel.tsx`、`src/components/SkillItem.tsx`、`src/stores/projectStore.ts`、相关 `*.test.ts`
**规模：** M

### Checkpoint B（T7–T8）
- [ ] 选择真实仓库目录 → 左栏出现 portable/tool-specific 分类、invalid 默认隐藏
- [ ] Rust 扫描 / 解析单测通过，断言绑定分类业务行为而非仅结构
- [ ] **人工复核**

---

## Phase 2：健康检查 + 选择 + 冲突

### T9 — 确定性健康检查
**描述：** `health.rs` 确定性检查：frontmatter 合规（YAML、name 格式 lowercase/digits/hyphens、字符上限）、name 与目录一致、触发场景动词存在（"when…"/"当…时使用" regex+关键词表）、脚本依赖（有 `scripts/` 必须有 `compatibility`）。返回 `HealthIssue{ level, field, message, suggestion }`，三级 ok/warning/error。结果接入 `SkillCard` 状态点与 `HealthReport` 面板。
**验收标准：**
- [ ] 四类检查各能命中并给出 field/level/suggestion；error 级在导出时需用户确认
- [ ] `HealthReport` 列出问题、跳转编辑入口占位（v0.2 编辑器，显式标注 deferred）
**验证：** `cargo test`（health 单测覆盖四类规则真阳/真阴）；UI 目检状态点与报告。
**依赖：** T7
**文件：** `src-tauri/src/health.rs`、`src-tauri/src/lib.rs`、`src/components/HealthCheckPanel.tsx`、`src-tauri/tests/health_tests.rs`
**规模：** M

### T10 — 选择 + ExportConflict 检测 + 解决
**描述：** `composer.rs` ExportConflict 检测：同一组合内同名（大小写不敏感）→ 冲突。前端复选框选择 → 构建 `Composition` 写入 `compositionStore`；`ComboListPanel` 显示已选 + 橙色冲突警告；`ConflictPanel` 提供"重命名 / 保留一个"两个 v0.1 动作（"合并工作台"按钮显式标注 v0.1.5 deferred）；`applyResolution` 改 store。
**验收标准：**
- [ ] 勾选两个同名 Skill → 立即橙色警告并阻止后续导出；重命名后共存、保留一个后只留其一
- [ ] 冲突判定大小写不敏感（"Code-Review" 与 "code-review" 视为冲突）
**验证：** `cargo test`（冲突检测单测）；Vitest 覆盖 store 选择 / 解决分支；UI 目检。
**依赖：** T8、T9
**文件：** `src-tauri/src/composer.rs`、`src/components/ComboListPanel.tsx`、`src/stores/compositionStore.ts`、相关 `*.test.ts`、`src-tauri/tests/conflict_tests.rs`
**规模：** M

### Checkpoint C（T9–T10）
- [ ] 健康状态在卡片与报告可见；勾选同名 Skill 触发冲突并可重命名 / 保留一个解决
- [ ] Rust 冲突单测 + 前端 store 分支单测通过
- [ ] **人工复核**

---

## Phase 3：导出计划 → 预览 → 执行 → 备份（核心闭环）

### T11 — exporter.rs 构建 ExportPlan
**描述：** `exporter.rs` + `ExportCoordinator.buildPlan`：解析 `.claude/skills/` 目标路径，计算 `FileOperation`（create / overwrite，命中目标已存在同名目录 → ExportConflict 阻止），生成 `BackupPlan`（`~/.agentmix/backups/<project-hash>/<timestamp>.zip`）与 `ManagedManifest`。暴露 `build_export_plan` 命令。**只产 plan，不写文件。**
**验收标准：**
- [ ] 同一 `Composition` + 目标目录 → 产出含完整 operations / conflicts / backups 的单个 `ExportPlan`
- [ ] 目标已存在同名目录 → 归类 ExportConflict（覆盖需预览页显式确认）
**验证：** `cargo test`（plan 构建单测，断言操作清单与字节数）；命令返回结构校验。
**依赖：** T10
**文件：** `src-tauri/src/exporter.rs`、`src-tauri/src/lib.rs`、`src-tauri/tests/export_plan_tests.rs`
**规模：** M

### T12 — Dry-run 预览 UI + 目标路径选择
**描述：** `ExportPanel` 渲染 `ExportPlan`：🟢create / 🟡overwrite(+diff) / 🔴delete 路径、备份压缩包位置与大小、受影响 Skill 与总字节数、冲突报告；目标项目路径选择器（dialog）；v0.1 仅 Claude Code 项目级，Cursor/Codex 等目标显式标注 deferred。**预览不触发任何写入。**
**验收标准：**
- [ ] 预览准确呈现 buildPlan 产出的 operations / 备份位置 / 冲突；未解决 ExportConflict 时禁用"执行"
- [ ] 仅暴露 Claude Code 项目级目标，其余标注 v0.2
**验证：** `pnpm tauri dev` 选目标目录看预览；Vitest 覆盖预览渲染 / 执行按钮禁用分支。
**依赖：** T11
**文件：** `src/components/ExportPanel.tsx`、`src/stores/exportStore.ts`、相关 `*.test.ts`
**规模：** M

### T13 — ExportCoordinator.execute + 备份 + 重命名同步
**描述：** `ExportCoordinator.execute` 消费**同一个** `ExportPlan`：先把备份 zip 写入 `~/.agentmix/backups/<project-hash>/`，再复制 Skill 完整目录到 `.claude/skills/`；重命名的 Skill 在单一事务里同时改目录名与 `SKILL.md` 的 `name` 字段；返回 `ExecutionReport`；UI 提供"打开备份目录"按钮。落地 `scripts/lint-no-direct-write`（协调器外无文件写调用）。
**验收标准：**
- [ ] 执行后目标 `.claude/skills/` 出现完整 Skill 子目录；重命名项目录名与 frontmatter `name` 同步
- [ ] 备份只出现在 `~/.agentmix/backups/<project-hash>/`，目标项目树内无备份（DoD-8）
- [ ] 预览展示的文件操作清单与执行实际结果 100% 一致（DoD-3）
**验证：** `cargo test`：①ExportPlan↔执行一致性集成测试 ②备份隔离测试；`pnpm lint:no-direct-write` 通过。
**依赖：** T12
**文件：** `src-tauri/src/exporter.rs`（execute）、`src-tauri/src/lib.rs`、`src-tauri/tests/execute_tests.rs`、`scripts/lint-no-direct-write.mjs`
**规模：** M

### Checkpoint D（T11–T13）
- [ ] **完整 golden path 手动跑通**：扫描 → 选择 → 冲突解决 → 预览 → 导出 → `.claude/skills/` 下出现完整 Skill 目录
- [ ] ExportPlan 一致性测试 + 备份隔离测试通过；`lint:no-direct-write` 通过
- [ ] **人工复核（核心里程碑）**

---

## Phase 4：安全预检门禁

### T14 — scripts/ 安全预检
**描述：** scanner 安全策略：单 Skill 2MB 上限（命名常量，超限红旗需确认）、不跟随 symlink（已具备）、二进制资产单独列出。`scripts/` 高危规则扫描（bash/python/powershell）：network-download-execute（`curl|sh`、`wget -O-|bash`、`Invoke-WebRequest|Invoke-Expression`）、敏感路径（`~/.ssh/`、`~/.aws/`、`.env`、`/etc/`）、动态执行（`eval`/`exec`/`Function(string)`）、reverse-shell / 挖矿特征。UI 高亮风险行 + 规则名，默认拒绝导入 / 导出，需逐个 Skill 显式确认"已审阅接受风险"，**禁止批量绕过**。
**验收标准：**
- [ ] 预标注样本（≥10 个已知高危脚本）真阳性率 100%（DoD-7，漏一个即不通过）
- [ ] 默认拒绝；逐 Skill 确认才放行；无批量覆盖入口；显式暴露"看见风险≠保证安全"
**验证：** `cargo test`（安全规则单测，标注样本全部命中）；UI 目检门禁与逐项确认。
**依赖：** T7（扫描）、T13（导出门禁）
**文件：** `src-tauri/src/scanner.rs`（安全策略）、`src-tauri/src/security.rs`（规则）、UI 风险确认组件、`src-tauri/tests/security_tests.rs`
**规模：** M

### Checkpoint E（T14）
- [ ] 高危脚本被标记、导出在逐项确认前被阻止；标注样本 100% 命中
- [ ] **人工复核**

---

## Phase 5：欢迎屏 + 设置

### T15 — 欢迎屏 + 语言检测 + 设置
**描述：** `WelcomeScreen` 接入真实入口：拖入 / 选择文件夹等价进入主界面；"Git URL 导入"、"新建 Skill" 显式 disabled 占位并标注 v0.2；启动语言检测 + 设置面板语言切换 + "显示无效候选"开关；`uiStore` 管理 `AppView` 在 welcome ↔ main 切换。
**验收标准：**
- [ ] 空状态 → 选择 / 拖入文件夹 → 进入主界面；deferred 入口禁用且标注版本
- [ ] 语言切换即时生效；"显示无效候选"联动 T8 行为
**验证：** `pnpm tauri dev` 走 welcome → main；Vitest 覆盖 view 切换分支。
**依赖：** T8
**文件：** `src/components/WelcomeScreen.tsx`、`src/pages/MainLayout.tsx`、`src/stores/uiStore.ts`、相关 `*.test.ts`
**规模：** M

---

## Phase 6：核验、e2e、打包、发布

### T16 — e2e（golden + conflict 两条 spec）
**描述：** 用 `tauri-driver` 写两条 e2e：①golden path（**按钮入口**导入 → 选 3 Skill → Dry-run 预览 → 导出 → 断言目标出现完整 Skill 子目录）②conflict path（选两个同名 → 触发 ExportConflict → 重命名 → 导出 → 断言两目录共存且 frontmatter `name` 已同步）。
**验收标准：**
- [ ] 两条 spec 通过；断言绑定文件系统真实结果与 frontmatter 同步，而非仅 UI 文本
**验证：** `pnpm test:e2e` 两条 spec 绿。
**依赖：** T13、T14
**文件：** `e2e/golden-path.spec.ts`、`e2e/conflict-path.spec.ts`、e2e 配置
**规模：** M

### T17 — check:all 编排 + DoD 性能核验
**描述：** `pnpm check:all` 串联 typecheck、ESLint、`cargo clippy`、`cargo fmt --check`、Vitest、`cargo test`、两条 e2e，及 `lint:asset-purity`/`lint:no-direct-write`/`lint:i18n`/`lint:i18n:keys`。核验并记录 DoD 性能项：扫描 1000 文件 < 5s、冷启动 < 2s、golden path < 60s。
**验收标准：**
- [ ] `pnpm check:all` 一条命令全绿
- [ ] 三项性能指标实测达标并记录；未达标显式标注而非隐藏
**验证：** `pnpm check:all`；Release 构建下实测性能并记入文档。
**依赖：** T16
**文件：** `package.json`（check:all）、`scripts/`、`docs/CHANGELOG.md`（性能记录）
**规模：** S

### T18 — 打包 + README + Release
**描述：** Tauri 配置 Windows x64 `.msi` + `.exe` 打包，产出 SHA-256；写 README（30 秒上手 GIF、安装步骤、v0.1 边界声明、已知不支持场景列表）、`docs/CHANGELOG.md`、`docs/CONTRIBUTING.md`；准备 GitHub Releases 草稿（v0.1 无自动更新，手动升级预期）。
**验收标准：**
- [ ] 产出 `.msi`/`.exe` + SHA-256；README 四部分齐全；CHANGELOG/CONTRIBUTING 存在
**验证：** 本地构建安装包并校验 SHA-256；README 目检四部分。
**依赖：** T17
**文件：** `src-tauri/tauri.conf.json`（bundle）、`README.md`、`docs/CHANGELOG.md`、`docs/CONTRIBUTING.md`
**规模：** S

### Checkpoint Complete（T16–T18）
- [ ] `pnpm check:all` 全绿（含两条 e2e 与四条架构红线 lint）
- [ ] DoD-1~DoD-11 全部满足或显式列出未达项
- [ ] 安装包 + README 就绪，可发 v0.1 Alpha

---

## Risks and Mitigations

| 风险 | 影响 | 缓解 |
|---|---|---|
| `tauri-specta` 类型生成与 React 19 / Vite 7 工具链兼容性未知 | 高 | T4 先做最小验证；若不可用，退化为手写共享类型 + 单测校验 Rust/TS 一致性，并先与用户确认 |
| Windows 拖拽事件无法驱动 Tauri webview，e2e 必须走按钮入口 | 中 | 按 DESIGN.md，按钮入口与拖拽等价；e2e 全用按钮入口（T8/T16 已含） |
| ExportPlan 预览与执行不一致（DoD-3）易因路径 / 字节计算偏差破功 | 高 | execute 严格消费同一 plan 对象，不重新计算；T13 集成测试自动校验一致性 |
| 安全预检漏报高危脚本（DoD-7 一票否决） | 高 | T14 用 ≥10 个标注样本做真阳性回归，漏一个即阻塞发布 |
| Pixso UI 套件清理引入视觉回归 | 中 | T2 保留 `--am-*` token 与 JSX 布局，逐组件 `/preview/*` 目检 |
| 多 store + i18n + 生成类型导致循环依赖 / 导入顺序问题 | 中 | 遵循 CLAUDE.md 导入顺序；store 不互相导入，经命令层通信 |

## Open Questions

当前无阻塞性问题。两项关键决策（目录重构、pnpm）已确认。`tauri-specta` 兼容性在 T4 验证，若失败将带方案回报用户后再继续。

## Backlog（alpha 测试反馈，超出 v0.1 范围）

v0.1 手动测试中发现/提出的优化点，**不在本计划 T1–T18 范围内**，按路线图节奏在后续版本实现。权威规划见 `docs/DESIGN.md §12`：

- 加入组合的"＋"按钮可发现性差（仅 hover 显形，新用户找不到）→ 常显或更明显入口（v0.1.5）。
- 目标项目选择器加"最近路径 / 已导入源项目"快捷项，省去每次重新浏览（v0.1.5）。
- 目标项目选择器加说明文案，解释"目标项目 = 把 Skill 装到哪个项目供 Claude Code 使用"（v0.1.5）。
- 全局 vs 项目级作用范围选择器，全局路径由 AgentMix 自动解析（v0.2，并入"全局路径导出"）。
- 界面字体本地打包，去掉 Google Fonts CDN 网络依赖，保证离线可用（v0.1.5）。

## End-to-End Verification

最终交付的验证方式：
1. `pnpm install && pnpm check:all` 全绿（typecheck / lint / clippy / fmt / vitest / cargo test / 2×e2e / 4×架构红线 lint）。
2. `pnpm tauri dev` 手动走完 golden path：拖入 `agent-skills` → 勾 3 个 → 制造同名冲突 → 重命名 → Dry-run 预览 → 导出 → 在目标 `.claude/skills/` 看到 3 个完整子目录，全程 < 60s。
3. 核对备份只在 `~/.agentmix/backups/<project-hash>/`，目标项目树内无备份 zip。
4. Release 构建实测：1000 文件扫描 < 5s、冷启动 < 2s。
5. 安全预检对标注样本 100% 命中。
6. 构建 `.msi`/`.exe`，校验 SHA-256，README 四部分齐全。

## 计划产物落盘

经批准后，本计划将另存为 `tasks/plan.md`，并生成 `tasks/todo.md` 任务清单（T1–T18 勾选项 + 5 个 checkpoint）。
