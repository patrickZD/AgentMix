# CLAUDE.md - AI 编码指南

## 1. 项目概览

AgentMix 是本地开源桌面工具，用于从任意项目扫描、挑选、组合 Agent Skills，并导出到 Claude Code、Cursor、Codex、OpenCode 等 AI 编程工具。

当前执行范围以 `tasks/v0.2.0/spec.md` 的 v0.2.0（多目标导出引擎）为准，架构红线见 `docs/DESIGN.md`；不得自行实现 v0.2.1 及后续子里程碑功能。本文是 `docs/DESIGN.md` 的执行摘要，更新本文时必须先与设计文档比对；若执行中发现不一致，停止并汇报，不自行折中。

文档分工：产品定位见 `docs/PRD.md`，工程设计见 `docs/DESIGN.md`，版本路线图见 `docs/ROADMAP.md`，关键设计决策见 `docs/decisions/`，各版本范围见 `tasks/<version>/spec.md`。

## 2. 技术栈

- Core: TypeScript + Rust。
- Desktop: Tauri 2.0；v0.1 优先 Windows，后续扩展 macOS / Linux。
- Frontend: React 19 + TypeScript。
- UI Source: Pixso 设计稿是视觉、布局、状态和交互来源；Pixso 不是运行时依赖。导出的 React 初稿保留 JSX 布局、Tailwind 类与 `--am-*` 设计 token，初稿中的 MUI 组件（Tooltip / IconButton / Switch）用 Radix 或自建替换，去掉 Emotion 运行时。
- Styling: Tailwind CSS。
- State: Zustand。
- Drag & Drop: `@dnd-kit/core`；拖拽入口必须同时保留“选择文件夹”按钮。
- i18n: `react-i18next`；所有用户可见文案走 `t(key)`。
- Editor: CodeMirror 6；v0.1 不启用 Skill 编辑器，v0.2 再使用。
- Backend: `serde_yaml`、`walkdir`、`tauri-plugin-fs`、`tauri-plugin-dialog`。
- Type Sync: `specta` + `specta-typescript`；Rust struct / enum 是跨端数据模型来源，模型在 tauri-free 的 `agentmix-types` crate，`pnpm gen:types` headless 生成 `src/types/generated.ts`（原计划 `tauri-specta` 因导出需链接 wry 的二进制、headless 崩溃而改用其底层引擎 specta，详见 DESIGN.md §技术架构）。
- Runtime: Node.js 20+、pnpm、Rust stable。

## 3. 核心目录结构

项目结构按 `docs/DESIGN.md` 规划组织，实现时只创建当前功能实际需要的文件，不要为未开发的功能创建空文件。

```text
agentmix/
├── src-tauri/
│   ├── src/
│   │   ├── scanner.rs      # 递归目录扫描与 SKILL.md 识别
│   │   ├── parser.rs       # SKILL.md 解析与验证
│   │   ├── health.rs       # 健康度检查
│   │   ├── composer.rs     # 组合与冲突检测
│   │   ├── exporter.rs     # 导出计划与执行协调
│   │   ├── ai_merge.rs     # v0.2 AI 辅助合并
│   │   ├── source_track.rs # v0.2 来源仓库更新检测
│   │   └── main.rs
│   └── Cargo.toml
├── src/
│   ├── components/
│   │   ├── SourcePanel/       # 来源项目面板
│   │   ├── CompositionPanel/  # 组合清单面板
│   │   ├── SkillCard/         # Skill 卡片
│   │   ├── ConflictPanel/     # 冲突解决面板
│   │   ├── MergeWorkbench/    # v0.1.5 合并工作台
│   │   ├── SkillEditor/       # v0.2 Skill 编辑器
│   │   └── HealthReport/      # 健康度报告
│   ├── stores/
│   ├── types/
│   ├── i18n/
│   └── App.tsx
├── docs/
│   ├── PRD.md            # 产品：背景 / 用户 / 场景 / 竞品 / 定位 / 开源
│   ├── DESIGN.md         # 工程：功能 / 交互 / 架构 / 挑战 / 验收 + lock 规范
│   ├── ROADMAP.md        # 版本路线图
│   ├── decisions/        # 关键设计决策记录（一条一文件）
│   ├── CONTRIBUTING.md
│   └── CHANGELOG.md
├── tasks/                  # 开发任务记录，按版本分目录
│   └── <version>/          # spec.md（目标+范围+验收）/ plan.md（实现拆分）/ todo.md（任务清单）
├── package.json
└── README.md
```

任务编号跨版本连续（v0.1 T1–T18、v0.1.5 T19–T29、v0.2.0 T30+），不重置，版本开发完成后整个目录作为历史保留。

每个版本按 spec → plan → todo 顺序推进，spec 先行、评审通过后再进下一步。

## 4. 常用指令

脚手架创建前不要编造命令；创建后必须与 `package.json`、Cargo、CI 保持一致。

- Install dependencies: `pnpm install`
- Dev mode: `pnpm dev`
- Build project: `pnpm build`
- Type check: `pnpm type-check`
- Lint check: `pnpm lint`
- Format code: `pnpm format`
- Frontend tests: `pnpm test`
- E2E tests: `pnpm test:e2e`
- Rust lint: `cargo clippy -- -D warnings`
- Rust format check: `cargo fmt --check`
- Rust tests: `cargo test`
- All checks: `pnpm check:all`

`pnpm check:all` 必须串联 typecheck、ESLint、`cargo clippy`、`cargo fmt --check`、Vitest、`cargo test`、两条 v0.1 e2e，以及 `lint:asset-purity`、`lint:no-direct-write`、`lint:i18n`、`lint:i18n:keys`。两条 v0.1 e2e 指 headless 的 `agentmix-core/tests/e2e_pipeline.rs`（golden + conflict，由 `cargo test` 跑）；WebDriver UI 套件（`pnpm test:e2e`）需真实显示 + tauri-driver/msedgedriver，是独立手动 gate，不进 `check:all`（详见 `e2e/README.md`）。

## 5. 编码规范

- 使用严格类型，避免 `any`、隐式类型和松散对象。
- 优先 async/await、提前返回，减少嵌套。
- 业务阈值必须命名，例如 2MB 文件上限、扫描深度、超时时间；不要在代码里直接写看不出含义的数字。
- 业务逻辑与视图渲染分离；React 组件不直接承载扫描、导出、文件写入规则。
- UI 必须按 Pixso 设计稿的布局、间距、状态和交互实现；需要变更设计时先确认。
- Pixso 生成的 React 代码可以作为界面初稿，但不能整包直接覆盖项目代码；必须拆分为项目组件，接入 i18n、Zustand、Tailwind 和现有类型。
- 生成代码里的绝对定位、重复样式、无语义命名、未使用节点、硬编码文案必须清理。
- 所有用户可见文案走 i18n `t(key)`，包括按钮、错误、空状态、tooltip、modal。
- Windows 路径比较前必须规范化；名称冲突按大小写不敏感处理。
- 导入顺序：标准库 / 平台 API -> 第三方 -> 本地模块。

### README 编写规范

编写或修改 README 时遵循以下规范：

- 章节顺序：Title → Short Description → TOC → Install → Usage → API → Contributing → License
- Short Description 必须 <120 字符，且与 package.json `description` 一致
- Install 和 Usage 必须包含代码块
- License 末尾写 SPDX 标识符 + 版权人
- TOC 只在文件超过 100 行时加
- 不加 "Why" 章节，不加营销语气

## 6. 架构约束

- v0.2.0 做 Windows + 多目标导出（Claude Code / Cursor / Codex / OpenCode / Gemini + custom），支持项目级与全局 scope。
- v0.2.0 不做 AI、`.agentmix.lock`、Preset、Bundle、Git URL、Source Tracking、Skill 编辑器、macOS / Linux；这些归入 v0.2.1 及后续子里程碑（范围见 `tasks/v0.2.0/spec.md`）。
- 扫描、校验、冲突、导出、备份必须基于 `Asset` 抽象；pipeline 禁止写 `Skill` 专属硬分支。
- `Skill` 是 v0.1 唯一 provider；provider 内部可以 Skill-specific，pipeline 必须保持资产类型透明。
- `ExportPlan` 是 Dry-run UI 和正式执行的唯一数据源。
- `ExportCoordinator.execute` 是唯一允许修改用户文件的入口。
- 任何导出、覆盖、删除都必须走“预览 -> 用户确认 -> 执行”。
- `SKILL.md` 缺 `name` / `description`、name 与目录不一致、YAML 解析失败均为 `invalid`。
- 备份只写入 `~/.agentmix/backups/<project-hash>/`，禁止落到目标项目。
- `scripts/` 安全预检只承诺“风险可见”，不承诺绝对安全。
- 拖拽导入与“选择文件夹”按钮必须等价；e2e 使用按钮入口。

## 7. 编码核心准则

1. **编码前先思考**：明确列出预设前提，分析取舍利弊。存在更简洁方案时及时提出异议，不凭主观猜测开展工作。
2. **简洁优先**：用最少代码解决既定问题，不开发冗余功能。一次性使用的代码无需额外抽象封装。
3. **精准修改**：仅改动任务要求的内容，不擅自优化周边代码、注释和格式，保持与现有代码风格一致。
4. **目标导向执行**：提前定义验收标准，反复校验直至达标。优先明确最终目标，而非硬性限定执行步骤。
5. **勿让模型处理非语言类工作**：重试、路由、限流、运算、时间逻辑等，编写确定性代码实现，不要依靠提示词完成。
6. **严守 Token 预算**：所有循环都设置执行上限。若同一 8KB 左右的输入内容反复处理超过 90 分钟，立即暂停并复盘。
7. **直面冲突，不折中处理**：当代码库出现两套冲突逻辑（如两种报错规则、两类状态存储），明确选择其中一种并说明原因。同时保留两套逻辑会大幅增加漏洞风险。
8. **先读后写**：新增代码前先查阅周边现有逻辑。若新函数与已有功能重复，可能会因导入顺序引发隐性故障。
9. **测试以逻辑正确性为准，而非单纯跑通**：若被测函数仅返回固定值，即便测试用例执行成功，也不算有效测试。断言需绑定业务行为，而非仅校验数据结构。
10. **长流程操作必须设置检查点**：多步骤重构、数据迁移等操作，每完成一个阶段就提交保存，避免某一步出错后需要回滚全部流程。
11. **遵循现有规范，不刻意标新**：代码库已有固定编码范式时，即便自己的方案更优，也仍沿用原有范式。同一项目存在多种风格，弊端远大于单一风格。
12. **显式暴露故障，而非静默报错**：数据迁移提示"执行成功"，却因约束规则跳过 14% 数据，这属于故障而非正常结果。必须明确标注部分失败、跳过数据、内容截断、重试耗尽等异常情况。

## 8. 禁止操作清单

- 未经确认，不修改 `CLAUDE.md`、`README.md`、`.gitignore`、核心配置或 `docs/` 下的 `DESIGN.md` / `PRD.md` / `ROADMAP.md` / `decisions/`。
- 禁止私自新增第三方依赖。
- 禁止为了代码风格重写稳定代码。
- 禁止删除有效业务逻辑和关键注释。
- 禁止实现超出 v0.2.0 的”顺手功能”。
- 禁止忽略 lint、类型、构建、测试错误。
- 禁止绕过 `ExportPlan` 或 `ExportCoordinator.execute` 直接写用户目标目录。
- 禁止静默放宽 Skill 校验以适配某个工具。
- 禁止在生产构建中保留测试模式旁路。

## 9. 提交前自检清单

- [ ] 是否符合 `docs/DESIGN.md` 架构红线与当前版本 `tasks/<version>/spec.md` 的范围。
- [ ] 是否只修改任务相关内容。
- [ ] 是否遵循 Pixso 设计稿和 React 组件结构。
- [ ] 是否所有 UI 文案都走 i18n。
- [ ] 是否通过 type check、lint、format check、unit tests。
- [ ] 涉及导出时，是否验证 `ExportPlan` 预览与执行一致。
- [ ] 涉及扫描 / 解析 / 冲突时，是否有 Rust 单测或集成测试。
- [ ] 涉及前端状态时，是否有 Vitest 覆盖 store / 分支逻辑。
- [ ] v0.2.0 e2e 是否覆盖多目标 golden path、target-aware 冲突路径与警告路径（RuntimeConflict / Capability）。
- [ ] 测试是否验证业务行为，而不是只验证结构。
- [ ] 是否无无关依赖、死代码、注释废弃代码。
- [ ] 是否说明失败、跳过、截断或未完成项。
