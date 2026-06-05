# AgentMix — 产品需求文档 (PRD)

> **一句话定位**：AgentMix 是一款本地开源的桌面工具，让你通过拖拽和复选框，从任意项目中挑选 Agent Skills，自由组合后一键导出到 Claude Code、Cursor、Codex、OpenCode 等主流 AI 编程工具。未来扩展覆盖 slash commands、subagents、CLAUDE.md 片段等更广义的 Agent 资产。

本文是 AgentMix 的产品文档，覆盖背景、目标用户、核心概念、竞品、产品定位与开源策略。工程设计（功能设计、交互、技术架构、验收）见 [`DESIGN.md`](DESIGN.md)；版本路线图见 [`ROADMAP.md`](ROADMAP.md)；关键设计决策见 [`decisions/`](decisions/)。

## 目录

1. [背景与问题](#1-背景与问题)
2. [目标用户与使用场景](#2-目标用户与使用场景)
3. [核心概念：你在操作什么？](#3-核心概念你在操作什么)
4. [竞品分析与市场缺口](#4-竞品分析与市场缺口)
5. [产品定位与差异化](#5-产品定位与差异化)
6. [开源策略](#6-开源策略)

---

## 1. 背景与问题

### 1.1 Agent Skills 生态的爆发

2025 年下半年起，以 SKILL.md 为核心格式的 Agent Skills 开放标准迅速普及。该标准由 Anthropic 发起，现由 Linux Foundation 下属的 Agentic AI Foundation (AAIF) 维护 [1]，已被 Claude Code、Cursor、OpenAI Codex CLI、Gemini CLI、OpenCode、GitHub Copilot CLI 等 20 余款主流 AI 编程工具采纳 [2]。

GitHub 上涌现出大量高质量的 Skills 仓库：Addy Osmani（前 Google Chrome 工程负责人）开源的 `agent-skills` 包含 19 个生产级工程技能 [3]；`VoltAgent/awesome-agent-skills` 收录了 1000+ 社区技能 [4]；`skillsllm.com` 索引了超过 2700 个技能 [5]。与此同时，各工具厂商也在快速跟进：JetBrains 于 2026 年 4 月推出了 Skill Manager [6]；GitHub CLI 于 2026 年 4 月新增了 Agent Skills 管理命令 [7]；Vercel 推出了 skills.sh CLI 工具 [8]。

### 1.2 核心痛点

然而，这种生态繁荣带来了一个新问题：**每个项目都有自己的特色 Skills，开发者想要组合使用来自不同项目的 Skills 时，面临极大的摩擦**。

**痛点 1：跨项目组合无工具支持。** 开发者需要手动浏览多个 GitHub 仓库，逐一复制 skill 目录，再手动放置到目标路径。这个过程繁琐且容易出错，尤其是当来源项目超过 3 个时，管理成本呈指数级增长。

**痛点 2：名称冲突无法感知。** SKILL.md 规范要求 `name` 字段在同一 skills 目录下唯一，且必须与父目录名一致 [1]。来自不同项目的 skills 可能重名（例如两个项目都有 `code-review` skill），手动操作时开发者往往在 Agent 运行时才发现冲突，调试成本高。

**痛点 3：多工具路径差异带来重复劳动。** Claude Code 的 Skills 在 `.claude/skills/`，Cursor 在 `.cursor/skills/`，Codex 在 `.agents/skills/`，OpenCode 同时支持多个路径 [9] [10] [11]。同一套 Skills 要在多个工具中使用，需要重复部署到不同路径。

---

## 2. 目标用户与使用场景

### 2.1 主要用户群体

**v0.1–v0.2 阶段聚焦开发者用户**：日常使用 Claude Code、Cursor、Codex 等 AI 编程工具，关注多个 GitHub 上的 Skills 仓库，希望为不同项目快速配置最优的 Skills 组合。核心诉求是效率、灵活性和可控性。这类用户能够接受文件路径、YAML frontmatter、Dry-run 文件清单等技术细节。

### 2.2 典型使用场景

**场景 A：技术团队标准化（v0.1–v0.2 主要场景）。** 一个团队使用多个开源 Skills 仓库（如 Addy Osmani 的 `agent-skills`、Vercel 的官方 Skills、公司内部 Skills），希望为团队项目定制一套标准 Skills 集合，并一键导出到所有成员使用的 AI 工具中，保持团队 AI 行为的一致性。

**场景 B：个人效率优化（v0.1–v0.2 主要场景）。** 个人开发者收藏了来自 5 个不同仓库的 Skills，希望按需组合成适合当前项目的配置——例如为前端项目组合"React 最佳实践 + 无障碍审查 + 性能优化"三个 Skills，为后端项目组合"数据库迁移 + API 设计 + 安全审查"三个 Skills。

---

## 3. 核心概念：你在操作什么？

AgentMix 的核心操作对象是 **SKILL.md 技能文件**，这是 Agent Skills 开放标准的核心单元 [1]。

一个 Skill 是一个目录，包含必须的 `SKILL.md` 文件（YAML frontmatter + Markdown 指令）和可选的 `scripts/`、`references/`、`assets/` 子目录。

SKILL.md 的 YAML frontmatter 包含以下字段：

| 字段 | 是否必须 | 约束 |
|------|---------|------|
| `name` | 是 | 最多 64 字符，小写字母/数字/连字符，必须与父目录名一致 |
| `description` | 是 | 最多 1024 字符，描述功能和触发场景 |
| `license` | 否 | 许可证名称 |
| `compatibility` | 否 | 最多 500 字符，描述环境要求 |
| `metadata` | 否 | 自定义键值对 |
| `allowed-tools` | 否（实验性） | 预批准工具列表 |

Skills 采用**渐进式加载**机制：启动时仅加载所有 Skills 的 name 和 description（约 100 tokens），当任务匹配某个 Skill 的 description 时才加载完整内容（推荐 < 5000 tokens），scripts/references/assets 按需加载 [1]。这意味着即使安装了大量 Skills，对 Agent 上下文窗口的基础消耗也极低。

**组合特点**：每个 Skill 是完全独立的单元，可以直接复制到目标路径，无需修改内部内容。**核心约束**：name 字段在同一 skills 目录下必须唯一，这是跨项目组合时需要重点处理的冲突场景。

---

## 4. 竞品分析与市场缺口

### 4.1 现有工具全景

| 工具 | 类型 | 核心功能 | 核心局限 |
|------|------|---------|---------|
| skills.sh CLI [8] | CLI | 安装/管理 Skills | 无 GUI，无跨项目组合 |
| SkillDuck [12] | 桌面 GUI | 统一清单、自动发现 | 仅 macOS Apple Silicon，依赖 skills.sh，无组合能力 |
| awesomeskill.ai [13] | 在线市场 | 浏览/下载 Skills | 仅在线，无本地管理，无组合能力 |
| skillsllm.com [5] | 在线市场 | 浏览 2700+ Skills | 仅在线，无组合能力 |
| Skills.sh Manager [14] | VS Code 扩展 | VS Code 内管理 | 绑定 VS Code，无跨项目组合 |
| JetBrains Skill Manager [6] | IDE 内置 | IDE 内技能管理 | 绑定 JetBrains IDE |
| GitHub CLI Skills [7] | CLI | 版本化管理 Skills | 无 GUI，无组合能力 |

### 4.2 核心市场缺口

通过对现有工具的系统分析，可以发现以下三个尚未被满足的需求：

第一，**跨项目可视化组合**：没有任何工具支持从多个不同项目中可视化地挑选 Skills 并组合。第二，**冲突实时检测**：现有工具均不提供 Skills 名称冲突的实时预警，冲突只在 Agent 运行时才暴露。第三，**多目标一键导出**：没有工具能将组合结果同时部署到多个 Agent 工具的对应路径。

---

## 5. 产品定位与差异化

**产品名称**：AgentMix

**核心价值主张**：

> 把来自任何地方的 Agent Skills，像搭积木一样组合成你专属的 AI 工具配置。

AgentMix 的差异化建立在以下能力上：

- **跨项目可视化组合**：拖入任意项目文件夹，即可看到其中所有 Skills，勾选即组合，无需命令行。
- **实时冲突检测与处理**：勾选时立即检测 name 冲突，提供多种解决路径。
- **Skill 合并工作台**：对同名或功能相近的 Skills，支持并排对比、手动编辑或 AI 辅助合并，生成新 Skill。
- **多目标导出 + Dry-run 预览**：组合结果自动适配并导出到各工具对应路径，导出前展示完整变更清单，确认后才修改用户的文件。
- **Skill 健康度检查（结构化校验）**：导出前检查 description 是否包含触发场景动词、是否与同源 sibling 描述语义重复（v0.2 起用 LLM 评估描述质量）。
- **版本锁与跨工具兼容性预检**：`.agentmix.lock` 让团队组合可复现；导出前自动比对目标工具能力矩阵，提示不被支持的字段。
- **`scripts/` 安全预检**：第三方 Skills 携带的脚本经过静态安全扫描后才允许导入或导出。

---

## 6. 开源策略

### 6.1 许可证

推荐使用 **MIT 许可证**，最大化社区采用率，允许商业使用和二次分发，与 Agent Skills 生态中大多数项目保持一致。

### 6.2 仓库结构

```
agentmix/
├── src-tauri/
│   ├── src/
│   │   ├── scanner.rs     # 递归目录扫描与 SKILL.md 识别
│   │   ├── parser.rs      # SKILL.md 解析与验证
│   │   ├── health.rs      # 健康度检查
│   │   ├── composer.rs    # 组合与冲突检测
│   │   ├── exporter.rs    # 多目标导出
│   │   ├── ai_merge.rs    # AI 辅助合并（API 调用）
│   │   ├── source_track.rs # 来源仓库更新检测
│   │   └── main.rs
│   └── Cargo.toml
├── src/
│   ├── components/
│   │   ├── SourcePanel/       # 来源项目面板
│   │   ├── CompositionPanel/  # 组合清单面板
│   │   ├── SkillCard/         # Skill 卡片（含健康度图标）
│   │   ├── ConflictPanel/     # 冲突解决面板
│   │   ├── MergeWorkbench/    # 合并工作台（三列布局）
│   │   ├── SkillEditor/       # Skill 编辑器
│   │   └── HealthReport/      # 健康度报告
│   ├── stores/
│   ├── types/
│   └── App.tsx
├── docs/
│   ├── DESIGN.md
│   ├── CONTRIBUTING.md
│   └── CHANGELOG.md
├── package.json
└── README.md
```

### 6.3 社区建设

提供完整的贡献指南（包括本地开发环境搭建、代码规范、PR 流程），预置 Issue 模板（Bug Report / Feature Request / Skill Source Request），建立 Discussions 区供用户分享配置集，并定期发布 Release Notes。

---

## 参考资料

参考资料 [1]–[16] 见 [`DESIGN.md` §6 参考资料](DESIGN.md#14-参考资料)。
