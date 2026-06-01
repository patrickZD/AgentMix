# AgentMix

本地开源桌面工具：从任意项目扫描、挑选、组合 Agent Skills，导出到 AI 编程工具。

v0.1 Alpha 聚焦 Windows + Claude Code 项目级 `.claude/skills/` 导出。

## 它做什么

你从多个仓库收集了一批 Agent Skills，想按当前项目按需组合一份配置。AgentMix 让你：

- 扫描任意文件夹，识别其中的 `SKILL.md`，按通用 / 工具专用 / 无效分类并做健康检查。
- 把多个项目的 Skill 组合成一份清单，自动检测同名冲突，就地解决（重命名 / 保留一个）。
- 导出前用 Dry-run 预览将要发生的文件改动，确认后才写入；覆盖前自动备份到 `~/.agentmix/backups/`。
- 对 `scripts/` 做静态安全预检，命中高危规则的 Skill 默认拒绝导出，逐个确认后才放行。

## 快速上手（约 30 秒）

1. 打开 AgentMix，点「添加来源项目」或把文件夹拖进窗口。
2. 在左栏悬浮一个 Skill，点 + 加入组合。
3. 选目标项目，点「生成预览 (Dry-run)」。
4. 确认预览无误，点「导出」。目标项目的 `.claude/skills/` 下就出现选中的 Skill。

演示动图待补：`docs/demo.gif`。

## 安装

从 GitHub Releases 下载 Windows x64 安装包（择一）：

- `AgentMix_0.1.0_x64_en-US.msi`（MSI 安装包）
- `AgentMix_0.1.0_x64-setup.exe`（NSIS 安装程序）

下载后用随附的 SHA-256 校验值核对完整性。v0.1 安装包未做代码签名，Windows SmartScreen 可能提示「未知发布者」，选「仍要运行」即可。

## v0.1 Alpha 边界

- **平台**：仅 Windows x64；macOS / Linux 在后续版本。
- **导出目标**：仅 Claude Code 项目级 `.claude/skills/`；Cursor / Codex / OpenCode 与全局路径在 v0.2。
- **升级**：无自动更新，手动从 Releases 下载新版本（alpha 预期）。

## 已知不支持 / 暂缓的场景（v0.1）

界面中部分入口可见但禁用，或明确不在 v0.1 范围：

- 多目标导出、全局路径导出（v0.2）
- 从 Git URL 导入、新建 Skill 脚手架（v0.2）
- 手动合并工作台（v0.1.5）、Skill 编辑器（v0.2）
- AI 辅助合并、来源仓库更新检测、`.agentmix.lock`（v0.2+）
- 安全预检只承诺「风险可见」，不承诺绝对安全：不判定 SKILL.md 正文里的自然语言恶意指令、脚本引用的外部 URL、混淆脚本（契约边界见 `docs/DESIGN.md` §6.11）
- WebDriver UI e2e（`pnpm test:e2e`）在新版 WebView2 下加载内嵌前端失败，暂列为已知限制；golden / conflict 行为由 headless 集成测试覆盖（见 `e2e/README.md`）

## 从源码构建（开发者）

需 Node.js 20+、pnpm、Rust stable。

```
pnpm install
pnpm tauri dev      # 开发模式
pnpm tauri build    # 产出 Windows 安装包到 src-tauri/target/release/bundle/
pnpm check:all      # 跑全部 gate（type-check / lint / clippy / 测试）
```

## 文档

- 设计文档：`docs/DESIGN.md`
- 变更记录：`docs/CHANGELOG.md`
- 贡献指南：`docs/CONTRIBUTING.md`
