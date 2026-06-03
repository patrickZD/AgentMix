# Changelog

本文件记录 AgentMix 的版本变更。格式参考 Keep a Changelog，版本号遵循语义化版本。

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
