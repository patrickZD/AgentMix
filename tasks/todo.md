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
- [ ] **T7** Rust scanner + parser + 三分类 + `scan_project` 命令 + 单测 — 依赖：T4 — M
- [ ] **T8** 前端扫描接线（SourcePanel、按钮+拖拽等价、筛选、invalid 隐藏）— 依赖：T6, T7 — M

### Checkpoint B（T7–T8）
- [ ] 选真实目录 → 左栏出现分类后的 Skill 树
- [ ] Rust 扫描/解析单测通过
- [ ] 人工复核

## Phase 2：健康检查 + 选择 + 冲突
- [ ] **T9** `health.rs` 确定性检查 + HealthReport + 状态点 + 单测 — 依赖：T7 — M
- [ ] **T10** `composer.rs` ExportConflict + 选择→Composition + ConflictPanel 重命名/保留一个 — 依赖：T8, T9 — M

### Checkpoint C（T9–T10）
- [ ] 健康状态可见；同名 Skill 触发冲突并可解决
- [ ] Rust 冲突单测 + 前端 store 分支单测通过
- [ ] 人工复核

## Phase 3：导出计划 → 预览 → 执行 → 备份
- [ ] **T11** `exporter.rs` 构建 ExportPlan + `build_export_plan` 命令 + 单测（只产 plan）— 依赖：T10 — M
- [ ] **T12** Dry-run 预览 UI（ExportPanel）+ 目标路径选择（预览不写文件）— 依赖：T11 — M
- [ ] **T13** `ExportCoordinator.execute` + 备份 + 重命名/frontmatter 同步 + `lint:no-direct-write`— 依赖：T12 — M

### Checkpoint D（T11–T13）— 核心里程碑
- [ ] golden path 手动跑通：扫描→选择→冲突解决→预览→导出→`.claude/skills/` 出现完整目录
- [ ] ExportPlan 一致性测试（DoD-3）+ 备份隔离测试（DoD-8）+ `lint:no-direct-write` 通过
- [ ] 人工复核

## Phase 4：安全预检门禁
- [ ] **T14** 安全策略（2MB 上限/symlink 不跟随/二进制列出）+ `scripts/` 高危规则 + 逐项确认门禁 — 依赖：T7, T13 — M

### Checkpoint E（T14）
- [ ] 标注样本（≥10）真阳性率 100%（DoD-7）；逐项确认前导出被阻止
- [ ] 人工复核

## Phase 5：欢迎屏 + 设置
- [ ] **T15** WelcomeScreen 入口 + 语言检测 + 设置（语言切换/显示无效候选）+ view 路由 — 依赖：T8 — M

## Phase 6：核验、e2e、打包、发布
- [ ] **T16** e2e：golden path + conflict path（tauri-driver，按钮入口）— 依赖：T13, T14 — M
- [ ] **T17** `check:all` 编排 + DoD 性能核验（扫描<5s / 冷启动<2s / golden<60s）— 依赖：T16 — S
- [ ] **T18** 打包 `.msi`/`.exe` + SHA-256 + README + CHANGELOG + CONTRIBUTING + Release — 依赖：T17 — S

### Checkpoint Complete（T16–T18）
- [ ] `pnpm check:all` 全绿（含 2×e2e + 4×架构红线 lint）
- [ ] DoD-1~DoD-11 全部满足或显式列出未达项
- [ ] 安装包 + README 就绪，可发 v0.1 Alpha
