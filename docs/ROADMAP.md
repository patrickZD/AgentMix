# AgentMix 路线图

本文是 AgentMix 从 v0.1 到 v1.0+ 的版本路线图。各版本引用的功能小节（`§1` 起）在工程设计文档 [`DESIGN.md`](DESIGN.md)；产品背景与定位见 [`PRD.md`](PRD.md)；关键设计决策见 [`decisions/`](decisions/)。每个版本的具体交付范围以 `tasks/` 下对应的 plan / todo 文件为准。

## Phase 1：v0.1 (Alpha)——信任边界 + 单工具闭环

目标是 **"敢用"的最小闭环**：单工具单 scope 跑通，把所有架构红线在第一天立起来，alpha 用户能完成"导入来源 → 选择 Skills → 解决冲突 → 预览 → 导出到 Claude Code 项目"的核心动作。

v0.1 范围：

- Tauri + React + TypeScript 应用框架
- 欢迎屏（空状态） + 主界面两栏布局 + Toolbar（DESIGN.md §2.1）
- 本地目录拖入 + 递归 SKILL.md 扫描 + 三分类（portable / tool-specific / invalid，DESIGN.md §1.1）
- 复选框选择 + **ExportConflict 检测** + "重命名 / 保留一个"冲突解决（DESIGN.md §1.2）
- Dry-run 两阶段提交：preview → confirmation → execution，**消费同一 `ExportPlan` 对象**（DESIGN.md §1.12、§3.2）
- 基础备份到 `~/.agentmix/backups/<project-hash>/`（DESIGN.md §1.4）
- 单目标导出：**Claude Code 项目级**（仅 `.claude/skills/`）
- `scripts/` 安全预检（完整威胁模型：symlink 不跟随 / 2MB 体积上限 / 二进制资产清单 / 高危脚本规则，DESIGN.md §1.11）
- 健康检查确定性部分（frontmatter 合规、name 一致、触发动词存在、脚本依赖，DESIGN.md §1.5）
- **i18n 架构红线**：`react-i18next` + `t()` lookup 全覆盖；`en.json` 完整 + `zh.json` 关键 key stub（DESIGN.md §1.17）
- **Asset 抽象 + ExportPlan 数据模型作为架构红线**落地（DESIGN.md §3.2、§4.6）
- 静态发布到 GitHub Releases。**无自动更新机制**——alpha 阶段用户手动升级

v0.1 明确**不**包含：手动合并工作台、自动更新、i18n 翻译完整化、多目标导出、AI 全家桶、OS keychain、`.agentmix.lock`、Source Tracking、Git URL 导入、颜色聚类、Skill 脚手架、兼容性预检、引用检测、Skill 编辑器、安全规则误报白名单、反向同步、本地 embedding。

## Phase 1.5：v0.1.5——alpha → beta 过渡

补上 alpha 阶段最痛的几个 UX 短板，进入"长期使用可以接受"的状态。

- **自动更新机制**：GitHub Releases + Tauri Updater，签名密钥就位（DESIGN.md §1.16）
- **手动合并工作台**（3 列布局 + 实时校验 + frontmatter 重组，DESIGN.md §1.3）
- **i18n 翻译完整化**：`zh.json` 与 `en.json` key 集合 100% 对齐，CI 强制校验
- **alpha 测试反馈的体验与离线可用性优化**：
  - 加入组合的"＋"按钮提升可发现性——v0.1 仅在 hover 时显形，新用户找不到；改为常显或更明显的入口
  - 目标项目选择器加"最近用过的目标路径 / 已导入的源项目"快捷项，省去每次重新浏览文件夹
  - 目标项目选择器加一行说明文案，点明"目标项目 = 把 Skill 装到哪个项目供 Claude Code 使用"
  - 界面字体改为本地打包，去掉 Google Fonts CDN 网络依赖——本地优先桌面工具应在离线时也能正常显示
  - 字体本地化后启用受限 CSP（如 `default-src 'self'` + `style-src 'unsafe-inline'`）——v0.1 因内联样式与 CDN 字体暂置 `csp: null`；本地化字体后再收紧才不破渲染（安全评审建议）

## Phase 2：v0.2——跨平台与 AI 生态

v0.2 的功能拆成五个子里程碑（v0.2.0 / v0.2.2 / v0.2.3 / v0.2.4 / v0.2.5）顺序交付（详见 `tasks/v0.2.0/plan.md` 文末大纲），不再一次性铺开；其间按需发布 patch（如 v0.2.1）。

### v0.2.0 多目标导出引擎（已完成）

- 多目标导出：Claude Code / Cursor / Codex CLI / OpenCode / Gemini CLI + custom（按 ToolAdapter 配置，DESIGN.md §1.4）
- 全局路径导出（作用范围选「项目级 / 全局」，选「全局」时路径由 AgentMix 自动解析，用户无需知道该路径）
- **RuntimeConflict 显化**（多目标导出后才真正显化，警告级不阻断，DESIGN.md §1.2）
- **跨工具兼容性预检**（Capability Linter，内嵌 compatibility-matrix 逐字段校验，DESIGN.md §1.10）

### v0.2.1（patch）更新检查与版本号修正（已完成）

不在功能里程碑序列内的修复版：自动更新改为每次启动联网检查；设置 / 欢迎页版本号改为读取运行版本（修 v0.2.0 升级后仍显示 `v0.1.5`）。详见 CHANGELOG `[0.2.1]`。

### v0.2.2 复现与来源生态

- **Git URL 导入**（DESIGN.md §1.8 配套）
- **Source Tracking + 来源仓库更新检测**（DESIGN.md §1.8）
- **`.agentmix.lock` 版本锁**（DESIGN.md §1.9）
- 配置集 Preset / Bundle（DESIGN.md §1.7）
- tool-adapters / compatibility-matrix 远程刷新与新鲜度提示

### v0.2.3 AI 增强套件

- **OS keychain 密钥管理**（`keyring` crate，DESIGN.md §4.7）——所有 AI 功能的统一入口
- **AI 合并工作台 AI 辅助模式**（DESIGN.md §1.3）
- **AI 增强健康检查**：语义重合度、内容质量、脚本行为分析（DESIGN.md §1.5）
- **AI 一键修复**：每条健康问题旁按钮，**强制 diff 预览**（DESIGN.md §1.5）
- **语义聚类与颜色高亮**：Voyage embedding API + HDBSCAN（DESIGN.md §1.18）

### v0.2.4 跨平台

- macOS / Linux 平台支持，**原生菜单栏**（macOS 文化要求）

### v0.2.5 散件

- Skill 编辑器（内置 CodeMirror 实时预览与 frontmatter 校验，DESIGN.md §1.6）
- **Skill 脚手架（内嵌 skill-creator 方法论）**（DESIGN.md §1.13）
- **Skill 引用关系检测**（DESIGN.md §1.14）
- **`scripts/` 安全规则误报白名单**（DESIGN.md §1.11）：v0.1 的"每次都强制确认"在长期使用中会让用户麻木点同意，v0.2.4 引入按 `(source_uri, subpath, rule_id, content_hash)` 粒度的本地白名单，文件内容变化即失效；不随 lock / Bundle 分发

## Phase 3：v0.3——体验扩展与生态打通

把 v0.2 没顾上的"长尾用户场景"覆盖：隐私敏感离线场景、跨机器漫游。

- **反向同步**（Source ← Target，DESIGN.md §1.15）
- **加密文件 + 主密码**密钥 fallback——覆盖无 secret service 的 Linux 环境（DESIGN.md §4.7）
- **本地 embedding 模型** opt-in——隐私敏感 / 离线场景，仍不开放 provider 切换
- `compatibility` 字段解析与依赖标签展示
- 增量扫描缓存（SQLite）
- 已安装 AI 工具自动检测与推荐

## Phase 4：v1.0——Asset 范围扩展与在线生态

`Asset` 抽象的首次真实回报：扩展到 SKILL 之外的资产类型，验证 DESIGN.md §3.2 的抽象设计是否站得住。

- **Asset 扩展首发：Slash Command**——形态最简单（单 `.md` 文件），适合做第一个非 Skill provider
- Skills 在线搜索（集成 skillsllm.com / awesomeskill.ai）
- 配置集云端分享（可选，需用户授权）
- 团队共享模式
- 更多 i18n 语种（日 / 韩 / 其他）——视社区需求

## v1.1 及之后

- **v1.1**：扩展更多 Asset 类型——Subagent（`.claude/agents/*.md`）、MCP 配置、`.claude/hooks/`
- **v1.5+ / v2.0**：CLAUDE.md / AGENTS.md 片段级合并——涉及自然语言段落 diff，难度最高，等前置 Asset 类型在生态中验证后再投入

## 已评估并决定砍掉

- **触发预测（Trigger Simulator）**：给定示例输入预测哪些 Skill 会激活。价值不抵成本，由用户在实际 Agent 里验证更可靠。
- **导出快照 / 时间机器**：自动备份 + `.agentmix.lock` 已覆盖核心可恢复性。
- **本地使用统计**：读取 Agent transcript 推断 Skill 命中率——隐私边界与解析维护成本高于收益。
- **用户可选 embedding provider**：v0.2 起默认且仅使用 Voyage AI，简化用户配置面板；v0.3+ 提供本地模型 opt-in，依然不开放多 provider 切换。
