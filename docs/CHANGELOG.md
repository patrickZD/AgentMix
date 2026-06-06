# Changelog

本文件记录 AgentMix 的版本变更。格式参考 Keep a Changelog，版本号遵循语义化版本。

## [0.2.0] — 多目标导出 — 2026-06-06

把导出从"只支持 Claude Code 项目级"扩展到多工具、多范围。范围与边界以 `docs/DESIGN.md` 为准。

### 新增

- 多目标导出：一次把选中的 Skill 导出到多个 AI 工具——Claude Code、Cursor、Codex、OpenCode、Gemini CLI，也可填自定义路径。预览按目标分组，分别显示写入位置、备份与每个文件的改动。
- 导出范围可选项目级或全局：项目级写进当前项目，全局写进你账号下对应工具的目录（不必自己找路径）。全局覆盖同样先备份并需你确认。
- 运行时提示：当导出的 Skill 与目标工具里已存在的同名 Skill 处在不同位置时，按该工具的实际行为提示运行结果（哪个优先、或两者共存）。只提示，不阻止导出。
- 兼容性提示：当 Skill 用到目标工具不支持的字段时（例如 `allowed-tools` 在 Cursor 会被忽略），给出提示。只提示，不阻止导出。

### 变更

- 导出目标从单一 Claude Code 项目级，升级为可多选工具并选择导出范围。
- 多路径工具默认只写各自原生主目录（如 OpenCode 写 `.opencode/skills/`、Gemini 写 `.gemini/skills/`），不写多份副本。
- 备份目录按目标根路径区分，项目级与全局级各自独立备份。

### 已知限制 / 不在 v0.2.0

- 仍仅 Windows x64。
- 内置的工具路径与字段兼容性数据随版本发布，暂不支持联网刷新（后续版本再加）。
- 同名冲突仍需先解决（重命名 / 保留一个 / 合并）才能导出。
- AI 辅助合并 / 健康检查、来源更新检测与复现（`.agentmix.lock`、Git URL）、Skill 编辑器、macOS / Linux 等仍在后续版本。

### 测试

- `pnpm check:all` 全绿（type-check、ESLint、4 个 lint 守卫含 `lint:i18n:keys` 全等校验与按工具硬分支守卫、Vitest、cargo fmt / clippy、cargo test 含多目标 headless e2e）。

### 安装包与校验

> 由 GitHub Actions 流水线签名构建于 windows-latest。SHA-256 校验值由 CI 资产回填。

| 文件 | 大小 | SHA-256 |
|---|---|---|
| `AgentMix_0.2.0_x64_en-US.msi` | — | `（CI 回填）` |
| `AgentMix_0.2.0_x64-setup.exe` | — | `（CI 回填）` |

## [0.1.5] — Beta 过渡 — 2026-06-03

alpha → beta 过渡，让产品进入长期使用可接受的状态。范围与边界以 `docs/DESIGN.md` 为准。

### 新增

- 自动更新：启动时检查 GitHub Releases（每天至多一次，结果缓存 24 小时；无网络时静默跳过，下次启动重试）。有新版本时标题栏出现红点，点开弹窗显示更新说明与三个选项——立即更新 / 稍后 / 跳过此版本；设置面板新增「自动检查更新」开关（默认开），可随时手动检查。更新包经签名校验后才安装，校验失败即终止。
- 手动合并工作台：把多个 Skill 合并成一个新 Skill。多列并排显示各来源 `SKILL.md`，可逐段拼接到草稿或直接手写；底部实时校验 name / description / YAML（复用扫描时的同一套规则），有错时「合并入组合」按钮禁用；可单选保留某一来源的 `scripts/`。两个入口：冲突条目上的「合并」按钮，以及组合清单的「合并为新 Skill」（选 ≥2 个，不限是否同名）。合并产物经预览 → 确认 → 导出落盘，导出的 `SKILL.md` 与草稿逐字节一致。
- 离线可用：Inter 字体改为本地打包（去掉 Google Fonts CDN），断网冷启动字体正常。
- 导出目标选择器新增快捷项：最近用过的目标路径（持久化、去重）与已导入的源项目，一键设为目标。
- 工作区左侧来源面板支持拖拽导入：常驻投放区（点击等同「+」），拖文件夹进窗口时面板高亮提示。
- 加入组合的「+」按钮常显（不再仅 hover 出现）。

### 变更

- `zh.json` 与 `en.json` 的文案 key 完全一致，CI 强制校验（任一方缺 key 即失败）。
- 收紧 webview 的内容安全策略 (Content Security Policy, CSP)：从不限制改为最小放行（同源 + IPC + 内联样式 + data 图片）。
- 移除「简洁模式」：界面统一显示完整字段，去掉冗余的双模式切换。
- 应用图标改为透明背景设计。
- 发布改由 GitHub Actions 流水线产出：tag 触发，构建签名安装包并生成更新清单 `latest.json`，作为 draft 发布供人工核验。

### 已知限制 / 不在 v0.1.5

- 仍仅 Windows x64、仅 Claude Code 项目级导出。
- 0.1.0 用户无自动更新能力，需手动下载 0.1.5 安装一次；0.1.5 起自动更新生效。
- 合并工作台的 `scripts/` 保留为来源级单选（不逐文件挑选）；草稿区为纯文本，Markdown 实时预览随 v0.2 的 Skill 编辑器一起做。
- 多目标导出、AI 辅助、来源更新检测、Skill 编辑器等仍在后续版本。

### 测试

- `pnpm check:all` 全绿（type-check、ESLint、4 个 lint 守卫含收紧后的 `lint:i18n:keys` 全等校验、Vitest、cargo fmt / clippy、cargo test 含合并路径的 headless e2e）。
- WebDriver UI e2e（`pnpm test:e2e`）在收紧 CSP 后重跑通过。
- 自动更新流、合并 golden path、断网冷启动均人工实测通过。

### 安装包与校验

> 由 GitHub Actions 流水线签名构建于 windows-latest。SHA-256 校验值由 CI 资产回填。

| 文件 | 大小 | SHA-256 |
|---|---|---|
| `AgentMix_0.1.5_x64_en-US.msi` | 4.98 MB | `9220bc70bc51e2259ca2b419e2c5fdf1047c2519cf5b0db6601d0a5b0e5fc225` |
| `AgentMix_0.1.5_x64-setup.exe` | 3.51 MB | `3a4dcff2fc20ce6551be0c882b2cde1802b8807cc7057b726d30ebba9e9c57e4` |

## [0.1.0] — Alpha — 2026-06-02

首个 alpha。范围与边界以 `docs/DESIGN.md` 为准。

### 新增

- 扫描任意文件夹识别 `SKILL.md`，按通用 / 工具专用 / 无效三分类，并做确定性健康检查。
- 跨项目把 Skill 组合成清单，自动检测同名冲突（大小写不敏感），就地重命名 / 保留一个解决。
- Dry-run 预览将发生的文件改动 → 确认 → 导出到 Claude Code 项目级 `.claude/skills/`；覆盖前把目标备份到 `~/.agentmix/backups/<project-hash>/`，不落目标项目树。
- `scripts/` 静态安全预检：命中下载执行 / 敏感路径 / 动态执行 / 反弹 shell 或挖矿规则的 Skill 默认拒绝导出，需逐个确认才放行。安全评审后加固了匹配器（两步式下载、Windows certutil/BITS/PowerShell TCPClient、`.bat`/`.cmd`、空白绕过、更多凭据路径），并让 `execute` 在写入前重扫源目录、以最新结果为准（不信任传入 plan 的报告）。
- 欢迎屏入口、中英语言切换（持久化）、显示无效候选开关。
- Windows x64 `.msi` 与 `.exe` 安装包。

### 安全（发布前 review 修复）

- 修复导出路径穿越（任意文件写入）：导出名必须是单段目录名，`execute` 写入前强制校验，并逐条确认每个写入路径都在目标 `.claude/skills/` 之内；预览以「导出名不合法」冲突阻断。
- 覆盖目标中已有的 Skill 需要显式确认，由后端强制（原先只有界面提示）。
- 源 SKILL.md 在写入时读取失败会显式报错，不再静默写出空文件。
- 扫描时单个 SKILL.md 读取上限 1 MiB，超限标记为无效，防止恶意目录耗尽内存。
- 移除界面对文件系统的直接访问面（`fs:default` capability 与 `tauri-plugin-fs` 注册），所有文件操作只走 Rust 命令。
- 移除超出 v0.1 范围的合并工作台界面（含模拟 AI 输出），保留组合清单中「合并待后续版本」的占位。

### 已知限制 / 不在 v0.1

- 仅 Windows x64、仅 Claude Code 项目级导出；无自动更新（手动升级）。
- 多目标导出、全局路径、Git URL 导入、Skill 脚手架、合并工作台、Skill 编辑器、AI 辅助合并、来源更新检测均在 v0.1.5 ~ v0.2。
- 安全预检只承诺「风险可见」，不判定自然语言恶意指令、外部 URL、混淆脚本。

### 测试

- 发布构建前 `pnpm check:all` 全绿（type-check、ESLint、4 个 lint 守卫、Vitest 50、cargo fmt / clippy、cargo test 66 单测 + 2 条 headless e2e）。
- WebDriver UI e2e（`pnpm test:e2e`）在安全加固后的代码上重跑通过（2026-06-02，golden-path + conflict-path 2 spec 全过，Edge/WebView2 148.0.3967.96，tauri-driver 2.0.6）。UI e2e 需真实显示 + tauri-driver/msedgedriver，作独立手动 gate，不进 `check:all`（见 `e2e/README.md`）。

### 安装包与校验

> 由 `pnpm tauri build` 产出于 `src-tauri/target/release/bundle/`（未签名，Windows SmartScreen 会提示未知发布者）。
> 2026-06-02 替换应用图标后重新打包并更新 Release 资产，以下为当前资产的校验值。

| 文件 | 大小 | SHA-256 |
|---|---|---|
| `AgentMix_0.1.0_x64_en-US.msi` | 3.39 MB | `0dc964cda2bb06d9a725520f3505ad731bef022bc7d672b585b51b8736a84d20` |
| `AgentMix_0.1.0_x64-setup.exe` | 2.25 MB | `42aba454aa06161245ea75bb7bb9ec485051b5d2b4799aafe522ca375ee35753` |

### 性能核验（DESIGN.md DoD-5 / DoD-6 / DoD-1）

实测环境：Windows 11，Release 构建。

| 指标 | 目标 | 实测 | 结论 |
|---|---|---|---|
| 扫描 1000 个 SKILL.md（DoD-5） | < 5s | **0.105s** | 达标。`pnpm perf`（`agentmix-core` 的 `perf_scan` 基准，Release） |
| 冷启动到欢迎屏可交互（DoD-6） | < 2s | **< 0.5s** | 达标。Release 构建人工计时（2026-06-03，Windows 11） |
| Golden path 全流程（DoD-1） | < 60s | **29s** | 达标。人工走完 扫描 → 组合（3 个 Skill）→ 预览 → 导出 并计时（2026-06-03，Windows 11） |

> DoD-6 / DoD-1 依赖真实窗口与人工操作，无法在无头环境测量；上表为 Release 构建上的人工实测值。
