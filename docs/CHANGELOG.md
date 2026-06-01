# Changelog

本文件记录 AgentMix 的版本变更。格式参考 Keep a Changelog，版本号遵循语义化版本。

## [0.1.0] — Alpha（未发布）

首个 alpha。范围与边界以 `docs/DESIGN.md` 为准。

### 新增

- 扫描任意文件夹识别 `SKILL.md`，按通用 / 工具专用 / 无效三分类，并做确定性健康检查。
- 跨项目把 Skill 组合成清单，自动检测同名冲突（大小写不敏感），就地重命名 / 保留一个解决。
- Dry-run 预览将发生的文件改动 → 确认 → 导出到 Claude Code 项目级 `.claude/skills/`；覆盖前把目标备份到 `~/.agentmix/backups/<project-hash>/`，不落目标项目树。
- `scripts/` 静态安全预检：命中下载执行 / 敏感路径 / 动态执行 / 反弹 shell 或挖矿规则的 Skill 默认拒绝导出，需逐个确认才放行。
- 欢迎屏入口、中英语言切换（持久化）、显示无效候选开关。
- Windows x64 `.msi` 与 `.exe` 安装包。

### 已知限制 / 不在 v0.1

- 仅 Windows x64、仅 Claude Code 项目级导出；无自动更新（手动升级）。
- 多目标导出、全局路径、Git URL 导入、Skill 脚手架、合并工作台、Skill 编辑器、AI 辅助合并、来源更新检测均在 v0.1.5 ~ v0.2。
- 安全预检只承诺「风险可见」，不判定自然语言恶意指令、外部 URL、混淆脚本。
- WebDriver UI e2e 在新版 WebView2 自动化下加载内嵌前端失败（`chrome-error`），暂列已知限制；golden / conflict 行为由 headless 集成测试覆盖（见 `e2e/README.md`）。

### 安装包与校验

> 由 `pnpm tauri build` 产出于 `src-tauri/target/release/bundle/`（未签名，Windows SmartScreen 会提示未知发布者）。

| 文件 | 大小 | SHA-256 |
|---|---|---|
| `AgentMix_0.1.0_x64_en-US.msi` | 3.57 MB | `76e35c77383de8467f1f743115b6c79c0b1e4c9b9482f54fed4740783807dcdd` |
| `AgentMix_0.1.0_x64-setup.exe` | 2.37 MB | `6d2f486106291b9a258f144f1afa01b8f83457b687b8fea8e39c3c79f29fa884` |

### 性能核验（DESIGN.md DoD-5 / DoD-6 / DoD-1）

实测环境：Windows 11，Release 构建。

| 指标 | 目标 | 实测 | 结论 |
|---|---|---|---|
| 扫描 1000 个 SKILL.md（DoD-5） | < 5s | **0.105s** | 达标。`pnpm perf`（`agentmix-core` 的 `perf_scan` 基准，Release） |
| 冷启动到欢迎屏可交互（DoD-6） | < 2s | 待手动实测 | GUI 指标，无法 headless 测量；需在 Release 安装包上人工计时 |
| Golden path 全流程（DoD-1） | < 60s | 待手动实测 | 人机流程指标；需人工走完 扫描 → 组合 → 预览 → 导出 并计时 |

> DoD-6 / DoD-1 依赖真实窗口与人工操作，无法在无头环境测量。T18 产出 Release 安装包后人工核验并回填实测值；在此之前不以推测值充数。
