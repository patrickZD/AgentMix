# AgentMix

> 从任意项目扫描、挑选、组合 Agent Skills，导出到 AI 编程工具的本地开源桌面工具。

v0.1 Alpha 仅支持 Windows + Claude Code 项目级 `.claude/skills/` 导出。

## 安装

从 GitHub Releases 下载 Windows x64 安装包（择一），用随附的 SHA-256 校验完整性：

```powershell
Get-FileHash .\AgentMix_0.1.0_x64-setup.exe -Algorithm SHA256
```

- `AgentMix_0.1.0_x64_en-US.msi`（MSI 安装包）或 `AgentMix_0.1.0_x64-setup.exe`（NSIS 安装程序）
- 安装包未签名，Windows SmartScreen 提示「未知发布者」时选「仍要运行」。

从源码构建（需 Node.js 20+、pnpm、Rust stable）：

```bash
pnpm install
pnpm tauri dev      # 开发模式
pnpm tauri build    # 产出安装包到 src-tauri/target/release/bundle/
```

## 使用

1. 点「添加来源项目」或把文件夹拖进窗口。
2. 在左栏悬浮一个 Skill，点 + 加入组合。
3. 选目标项目，点「生成预览 (Dry-run)」。
4. 确认预览无误，点「导出」。

导出后目标项目的结构：

```text
target-project/
└── .claude/skills/
    ├── code-review/
    │   └── SKILL.md
    └── deploy/
        └── SKILL.md
```

演示动图待补：`docs/demo.gif`。

## 范围与边界（v0.1）

- 平台仅 Windows x64；导出目标仅 Claude Code 项目级 `.claude/skills/`；无自动更新（手动从 Releases 升级）。
- 暂不支持（v0.1.5 ~ v0.2）：多目标 / 全局路径导出、Git URL 导入、Skill 脚手架、合并工作台、Skill 编辑器、AI 辅助合并、来源更新检测。
- 安全预检只承诺「风险可见」，不判定 SKILL.md 正文里的自然语言恶意指令、脚本引用的外部 URL、混淆脚本（契约边界见 `docs/DESIGN.md` §6.11）。

## 贡献

见 `docs/CONTRIBUTING.md`（命令速查、架构红线、类型生成、测试约定）。改动前先读 `docs/DESIGN.md` 确认 v0.1 范围。变更记录见 `docs/CHANGELOG.md`。

## 许可

[MIT](LICENSE) © 2026 Patrick.zhang

SPDX-License-Identifier: MIT
