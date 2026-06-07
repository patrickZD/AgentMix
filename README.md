# AgentMix

> 从任意项目扫描、挑选、组合 Agent Skills，导出到 AI 编程工具的本地开源桌面工具。

v0.2.1 支持 Windows x64，可同时导出到 Claude Code、Cursor、Codex、OpenCode、Gemini CLI（项目级与全局），也可填自定义路径。

## 安装

从 GitHub Releases 下载 Windows x64 安装包（择一），用随附的 SHA-256 校验完整性：

```powershell
Get-FileHash .\AgentMix_0.2.1_x64-setup.exe -Algorithm SHA256
```

- `AgentMix_0.2.1_x64_en-US.msi`（MSI 安装包）或 `AgentMix_0.2.1_x64-setup.exe`（NSIS 安装程序）
- 安装包未获 Authenticode 代码签名，Windows SmartScreen 提示「未知发布者」时选「仍要运行」。

从源码构建（需 Node.js 20+、pnpm、Rust stable）：

```bash
pnpm install
pnpm tauri dev      # 开发模式
pnpm tauri build    # 产出安装包到 src-tauri/target/release/bundle/
```

## 使用

1. 点「添加来源项目」或把文件夹拖进窗口。
2. 在左栏点 + 将 Skill 加入组合。
3. 勾选一个或多个目标工具，选项目级或全局范围（项目级再选目标项目），点「生成预览 (Dry-run)」。
4. 确认预览无误，点「导出」。

导出后目标项目的结构：

```text
target-project/
├── .claude/skills/        # 导出到 Claude Code
│   └── code-review/
│       └── SKILL.md
└── .cursor/skills/        # 同一次也导出到 Cursor
    └── code-review/
        └── SKILL.md
```

演示动图待补：`docs/demo.gif`。

## 范围与边界（v0.2.1）

- 平台仅 Windows x64。导出目标为 Claude Code、Cursor、Codex、OpenCode、Gemini CLI 及自定义路径，支持项目级与全局；多路径工具默认只写各自原生主目录。自动更新从 v0.1.5 起生效。
- 同名冲突仍需先解决（重命名 / 保留一个 / 合并）才能导出；运行时提示与字段兼容性提示只提示、不阻断。
- 暂不支持（后续版本）：AI 辅助合并、来源更新检测与复现（`.agentmix.lock` / Git URL）、Skill 编辑器与脚手架、macOS / Linux、内置工具与兼容性数据的联网刷新。
- 安全预检只承诺「风险可见」，不判定 SKILL.md 正文里的自然语言恶意指令、脚本引用的外部 URL、混淆脚本（契约边界见 `docs/DESIGN.md` §1.11）。

## 贡献

见 `docs/CONTRIBUTING.md`（命令速查、架构红线、类型生成、测试约定）。产品定位见 `docs/PRD.md`，工程设计见 `docs/DESIGN.md`，版本路线图见 `docs/ROADMAP.md`，关键设计决策见 `docs/decisions/`。变更记录见 `docs/CHANGELOG.md`。

## 许可

[MIT](LICENSE) © 2026 Patrick.zhang

SPDX-License-Identifier: MIT
