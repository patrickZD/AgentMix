# AgentMix v0.1 Alpha — TODO

任务详情见 `tasks/plan.md`。每个任务含验收标准与验证命令；checkpoint 处人工复核后再继续。

## Phase 0：地基与工具链
- [x] **T1** 重构到根目录 + 迁移 pnpm（删 `bun.lock`，补 `type-check` 脚本；`format` 待选 formatter）— 依赖：无 — M
- [x] **T2** 清理 Pixso 多余 UI 套件（移除 MUI/Emotion/Arco/antd/tdesign，MUI 组件换 Radix/自建）— 依赖：T1 — M
- [x] **T3** Tauri 2.0 后端脚手架（`src-tauri/`、dialog/fs 插件、`ping` 命令）— 依赖：T1 — M
  - cargo build/clippy/fmt + 前端门禁全绿；`pnpm tauri dev` 窗口已人工验证 OK
- [x] **T4** 数据模型 + 生成 TS 类型 + `lint:asset-purity`（**改用 specta** 而非 tauri-specta：headless 导出，详见 DESIGN.md；仅定义 scan/health 核心模型，export-pipeline 模型留到 T11+）— 依赖：T3 — M
- [x] **T5** i18n 引导 + 文案外提 + `lint:i18n` / `lint:i18n:keys`（活跃组件已转；MergeWorkbench=v0.1.5 deferred 未转；设置语言开关在 T15）— 依赖：T4 — M
- [x] **T6** Zustand store 骨架（project/composition/export/ui）+ store 单测（13 tests；MainLayout 已迁入 store，mock 仅在 store 内做 interim 种子）— 依赖：T4 — M

### Checkpoint A（T1–T6）
- [x] `pnpm tauri dev` 起窗渲染 React（人工验证 OK）
- [x] typecheck / lint / clippy / fmt / vitest（13 store 单测）全绿
- [x] `lint:asset-purity` / `lint:i18n` / `lint:i18n:keys` 通过
- [ ] 人工复核（check:all 编排器在 T17 落地）

## Phase 1：扫描 → 展示
- [x] **T7** Rust scanner + parser + 三分类 + `scan_project` 命令 + 单测（14 headless 测试；逻辑放 tauri-free `agentmix-core` crate 以便 cargo test 不被 wry 崩溃；1000 文件 <5s 基准留到 T17 perf 核验）— 依赖：T4 — M
- [x] **T8** 前端扫描接线（SourcePanel、按钮+拖拽等价、筛选、invalid 隐藏）— 依赖：T6, T7 — M
  - 3 个 checkpoint commit：(1) 全量迁移 UI 到 generated 域类型（弃 Pixso view-model，单一 Skill 类型）；(2) `pick_directory` Rust 命令 + `lib/scan` IPC seam + `projectStore.scanAndAdd`（按 normalizePath 去重/替换、失败显式入 `scanError`）+ 折叠按钮/拖拽等价 webview 监听；(3) 分类树 + keyword/category 筛选 + `showInvalid` 隐藏（`lib/skillFilter` 纯函数+单测）
  - 偏差：dialog/fs JS 插件包未装，folder picker 改用已有 `tauri-plugin-dialog` Cargo 依赖的 Rust 命令（零新 npm 依赖）；changeTag/displayName/frontmatter.tags 等 Pixso 装饰按 v0.1 范围去除；health 筛选逻辑已实现+测试，UI 控件留到 T9（届时才有真实健康度数据）
  - 自动化门禁全绿（type-check / eslint / 29 前端测试 / asset-purity / i18n / i18n:keys / build / 14 Rust 测试 / clippy / fmt）；`pick_directory` 与拖拽为 Tauri 原生入口，需 `pnpm tauri dev` 人工验证

### Checkpoint B（T7–T8）
- [x] Rust 扫描/解析单测通过（14 headless 测试）
- [x] 选真实目录 → 左栏出现分类后的 Skill 树（`pnpm tauri dev` 人工验证：拖拽 + 展示正常）
- [x] 人工复核

## Phase 2：健康检查 + 选择 + 冲突
- [x] **T9** `health.rs` 确定性检查 + HealthReport + 状态点 + 单测 — 依赖：T7 — M
  - 四类确定性检查（frontmatter 合规 / name 一致 / 触发动词 / 脚本依赖），三级 ok/warning/error；error 集合与 `invalid` 分类一致
  - 健康度在扫描时算好并挂在 `Skill.healthStatus`/`healthIssues` 上：SkillItem 状态点、SourcePanel 健康度筛选（T8 deferred 的控件本任务补齐）、HealthReport 三处复用同一份数据
  - HealthReport 重写为消费 `Skill.healthIssues`（弃 Pixso 的 `HealthCheckResult{checks}` interim 类型），含 v0.2 编辑器 deferred 占位
  - 偏差：health 逻辑放 tauri-free `agentmix-core/src/health.rs`（沿用 T7 规避 wry headless 崩溃）；`HealthIssue.message`/`suggestion` 承载 i18n key（形状不变），前端 `t(key)` 本地化，守住 i18n 红线；HealthReport 展示全部已扫描 Skill（DESIGN「所选 Skill」语义留到 T12 导出前门禁细化）
  - 12 个 health 单测（真阳/真阴，含中文触发短语）；门禁全绿（26 Rust 测试 / clippy / fmt / 29 前端测试 / 全 lint / build / 类型无漂移）
- [x] **T10** `composer.rs` ExportConflict + 选择→Composition + ConflictPanel 重命名/保留一个 — 依赖：T8, T9 — M
  - 2 个 checkpoint commit：(1) `agentmix-core/composer.rs` 大小写不敏感 ExportConflict 检测（7 单测）+ `ConflictCandidate`/`ExportConflict` 域类型 + `detect_conflicts` 命令；(2) compositionStore 重构（`ComboItem.exportedName`，去掉 Pixso 精确同名 flag）+ `refreshConflicts` 调 Rust + ComboListPanel 行内重命名/保留一个 + ExportPanel 冲突阻断
  - 单一冲突逻辑：检测只在 Rust 实现一次，前端经 `lib/composer` IPC 调用（T11 ExportPlan 复用同一函数），UI 实时预警与导出门禁不会漂移
  - 偏差：冲突解决 UI 内联进 ComboListPanel（对齐 DESIGN mockup 与 plan 文件清单，不单建 ConflictPanel 组件）；合并工作台按钮 disabled 标注 v0.1.5；HealthReport 的「所选 Skill」语义留到 T12
  - 门禁全绿（33 Rust 测试 / clippy / fmt / 30 前端测试 / 全 lint / build / 类型无漂移）

### Checkpoint C（T9–T10）
- [x] Rust 冲突单测（7）+ 前端 store 选择/解决分支单测通过
- [ ] 健康状态可见；同名 Skill 触发冲突并可解决（需 `pnpm tauri dev` 人工验证 UI）
- [ ] 人工复核

## Phase 3：导出计划 → 预览 → 执行 → 备份
- [x] **T11** `exporter.rs` 构建 ExportPlan + `build_export_plan` 命令 + 单测（只产 plan）— 依赖：T10 — M
  - `agentmix-core/exporter.rs::build_export_plan`：逐 Skill 走源目录，每文件产一条 create/overwrite `FileOperation` → `<project>/.claude/skills/<exportedName>/`；产 BackupPlan / ManagedManifest / total_bytes；**不写任何文件**（execute 在 T13）。backups_root 注入，headless 可测
  - 冲突复用单一 composer 规则：组合内 `NameCollision` + 目标已存在同名目录 `TargetExists`；`ExportConflict` 加 `kind` 区分，二者都阻断导出
  - 备份仅当存在 overwrite 时规划，且只落 `~/.agentmix/backups/<target-hash>/`，绝不进目标项目
  - 偏差：`targets`/`runtimeWarnings`/`ToolAdapter`/`FileOperationKind::Delete` 等多目标/反向同步字段 v0.1 不接入；u64 字节字段 schema 覆写为 TS `number`（字段仍 u64，求和不溢出）
  - 4 个 exporter 单测（clean→全 create+字节数、plan 不写文件、已存在→overwrite+TargetExists+backup、同名 NameCollision）；37 Rust 测试 + 全门禁绿 + 类型无漂移
- [x] **T12** Dry-run 预览 UI（ExportPanel）+ 目标路径选择（预览不写文件）— 依赖：T11 — M
  - ExportPanel 从 Pixso 多目标 toggle 改为 v0.1 单目标：Claude Code (project) active + 目标项目选择器（复用 pick_directory），Cursor/Codex/OpenCode disabled 标 v0.2
  - 「生成预览 (Dry-run)」调 `build_export_plan` 渲染 ExportPlan：create/overwrite 计数、受影响 Skill、总字节、备份位置+大小、逐文件操作列表、冲突报告；预览不写任何文件
  - 执行按钮启用由纯函数 `exportGate()` 决定：无 plan/零操作禁用；NameCollision 未解决禁用（去组合改）；TargetExists 需勾选「确认覆盖」才解禁。execute 本体（写文件）留 T13，onExport 暂为占位
  - exportStore 重构为 `{ targetPath, plan, building, buildError, overwriteConfirmed }`；选择或目标变化即清除过期预览。删除 v0.2 多目标 toggle/mock/`ExportTarget`/`ExportTool`
  - 偏差：组件渲染无 jsdom 单测（node env，未引入 testing-library），渲染靠 `exportGate`/store 纯逻辑单测 + `pnpm tauri dev` 人工 + T16 e2e
  - 9 个新单测（exportGate 5 + exportStore build/branch/error/reset）；39 前端测试 + 全门禁绿
- [x] **T13** `ExportCoordinator.execute` + 备份 + 重命名/frontmatter 同步 + `lint:no-direct-write`— 依赖：T12 — M
  - `agentmix-core/exporter.rs::execute` 是唯一文件写入口：消费同一个 ExportPlan，先写 `.zip` 备份再按 operations 逐条复制，最后写 manifest；重命名 Skill 在写入时同步改 `SKILL.md` 的 `name:`（plan 用重写后大小，二者一致 = DoD-3）
  - 备份用 `zip` crate（用户确认新增，deflate only），只落 `~/.agentmix/backups/<hash>/`，不进目标项目（DoD-8）
  - 新增命令 `execute_export` / `open_path`（Explorer 打开备份目录，Windows v0.1）；前端 execute 接线 + ExecutionReport 成功摘要 + 「打开备份目录」按钮 + 失败提示
  - `scripts/lint-no-direct-write.mjs`：除 exporter.rs 外（含剥离测试模块、豁免 codegen bin）无任何文件写 API
  - 偏差：`FileOperation` 加 `sourcePath`（DESIGN 未建模，plan-driven execute 必需）；`FileOperationKind::Delete` v0.1 不产出
  - 43 Rust 测试（含 DoD-3 字节一致、重命名 SKILL.md 同步、备份隔离、拒绝 NameCollision、rewrite_skill_name）+ 9 前端 export 测试；全门禁绿 + 类型无漂移

### Checkpoint D（T11–T13）— 核心里程碑
- [x] ExportPlan 一致性测试（DoD-3）+ 备份隔离测试（DoD-8）+ `lint:no-direct-write` 通过
- [ ] golden path 手动跑通：扫描→选择→冲突解决→预览→导出→`.claude/skills/` 出现完整目录（需 `pnpm tauri dev` 人工验证）
- [ ] 人工复核（核心里程碑）

## Phase 4：安全预检门禁
- [x] **T14** 安全策略（2MB 上限/symlink 不跟随/二进制列出）+ `scripts/` 高危规则 + 逐项确认门禁 — 依赖：T7, T13 — M

### Checkpoint E（T14）
- [x] 标注样本（≥10）真阳性率 100%（DoD-7）；逐项确认前导出被阻止（Rust 单测覆盖：scan_script_text 14 个标注样本全命中、true-negative；execute 拒绝未确认/放行已确认）
- [ ] 人工复核（`pnpm tauri dev`：含高危 `scripts/` 的 Skill → 预览出风险卡 + 逐项复选框，未逐个确认前导出按钮置灰）

## Phase 5：欢迎屏 + 设置
- [x] **T15** WelcomeScreen 入口 + 语言检测 + 设置（语言切换/显示无效候选）+ view 路由 — 依赖：T8 — M
  - deferred 入口（Git URL 导入 / 新建 Skill）禁用 + v0.2 标注；语言切换即时生效且持久化（localStorage，DESIGN §7）；showInvalid 联动来源面板同一 flag；`resolveView` 纯函数 + Vitest 覆盖 welcome↔main 分支
  - 人工复核：`pnpm tauri dev` 走 welcome → 选文件夹 → main；设置里切语言即时生效、重启仍保留；deferred 入口置灰

## Phase 6：核验、e2e、打包、发布
- [x] **T16** e2e：golden path + conflict path — 依赖：T13, T14 — M
  - Part 1（headless，作者已验证绿）：`agentmix-core/tests/e2e_pipeline.rs` 两条集成测试跑通全管线，断言 `.claude/skills` 子目录 + frontmatter name 同步 + 拒绝未解决冲突
  - Part 2（WebdriverIO UI）：`e2e/` 两条 spec + 生产安全 dialog seam（cargo `e2e` feature + `VITE_E2E` 双重 gating，生产无旁路）；transport 已接通（tauri-driver 起 session、release 二进制）。**已知阻塞**：WebView2 自动化下 webview 导航到 `chrome-error://chromewebdata/`，内嵌前端加载不出（debug/release 均复现，非自动化时正常）——tauri-driver/WebView2 与新版 Edge 148 的兼容坑，非 app/spec 缺陷。详见 `e2e/README.md`。headless 套件为 v0.1 权威 golden/conflict 闸门。
- [x] **T17** `check:all` 编排 + DoD 性能核验（扫描<5s / 冷启动<2s / golden<60s）— 依赖：T16 — S
  - `scripts/check-all.mjs`：10 步全绿（typecheck/eslint/4×架构 i18n lint/vitest/cargo fmt/clippy/test；两条 e2e 由 cargo test 的 headless e2e_pipeline 覆盖）
  - DoD-5 实测 **0.105s**（<5s，`pnpm perf` + `perf_scan` release 基准）；DoD-6 冷启动 / DoD-1 golden<60s 为 GUI/人机指标，`docs/CHANGELOG.md` 记为待 T18 安装包上人工实测（不充推测值）
- [x] **T18** 打包 `.msi`/`.exe` + SHA-256 + README + CHANGELOG + CONTRIBUTING + Release — 依赖：T17 — S
  - `pnpm tauri build` 产出 `AgentMix_0.1.0_x64_en-US.msi`（3.57 MB）+ `AgentMix_0.1.0_x64-setup.exe`（2.37 MB），SHA-256 记入 `docs/CHANGELOG.md`（未签名，alpha）
  - README 四部分（30s 上手 / 安装 / v0.1 边界 / 已知不支持）齐全；新增 `docs/CONTRIBUTING.md`；CHANGELOG 补 v0.1 发布说明
  - GitHub Release 留作草稿由维护者发布（CHANGELOG 的 [0.1.0] 段即 release body）；演示 GIF 待补

### Checkpoint Complete（T16–T18）
- [x] `pnpm check:all` 全绿（含 headless 2×e2e + 4×架构红线 lint）
- [~] DoD：DoD-5 实测达标（0.105s）；DoD-6 冷启动 / DoD-1 golden<60s 待安装包上人工计时；e2e DoD（WDIO UI）受 WebView2 兼容坑阻塞，由 headless e2e 覆盖行为 —— 均显式记录，未充推测值
- [x] 安装包 + README 就绪，可发 v0.1 Alpha（待人工核验 DoD-6/DoD-1 + 决定是否发布）

## Backlog（alpha 测试反馈，不在 v0.1 范围）
v0.1 手动测试发现/提出的优化点，按路线图在后续版本实现，权威规划见 `docs/DESIGN.md §12`：
- [ ] 加入组合"＋"按钮可发现性（仅 hover 显形 → 常显/更明显入口）— v0.1.5
- [ ] 目标项目选择器：最近路径 / 已导入源项目快捷项 — v0.1.5
- [ ] 目标项目选择器：说明文案解释"目标项目"含义 — v0.1.5
- [ ] 界面字体本地打包，去掉 Google Fonts CDN 网络依赖（离线可用）— v0.1.5
- [ ] 全局 vs 项目级作用范围选择器 + 全局路径自动解析 — v0.2
