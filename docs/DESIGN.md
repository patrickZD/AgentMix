# AgentMix — 工程设计文档

本文是 AgentMix 的工程设计文档，覆盖功能设计、交互、技术架构、技术挑战、验收标准、参考资料与 `.agentmix.lock` 规范。

- 产品定位、目标用户、使用场景、竞品、开源策略见 [`PRD.md`](PRD.md)。
- 版本路线图见 [`ROADMAP.md`](ROADMAP.md)。
- 关键设计决策记录见 [`decisions/`](decisions/)。
- 各版本交付范围见 `tasks/<version>/spec.md`（现有 v0.1.0 / v0.1.5 / v0.2.0，每目录含 spec / plan / todo）。

---

## 目录

1. [核心功能设计](#1-核心功能设计)
2. [交互设计](#2-交互设计)
3. [技术架构](#3-技术架构)
4. [核心技术挑战与解决方案](#4-核心技术挑战与解决方案)
5. [验收标准与测试策略](#5-验收标准与测试策略)
6. [参考资料](#6-参考资料)

附录 A. [`.agentmix.lock` 文件规范](#附录-a-agentmixlock-文件规范)

---

## 1. 核心功能设计

### 1.1 项目导入（Source Management）

用户可以通过拖拽或手动选择的方式，将任意本地项目文件夹添加到工具中作为"来源项目"。工具会**递归扫描整个项目目录树**，识别其中所有符合 SKILL.md 规范的技能目录，无论它们位于项目的哪个层级、哪个子目录下。

**导入入口**：拖拽与"选择文件夹"按钮**两条入口同时提供**，按钮入口与拖拽功能完全等价。这一约束有两个原因：(a) 无障碍——键盘用户与屏幕阅读器用户无法使用拖拽；(b) 端到端测试——浏览器层 drag-and-drop 事件无法触发 Tauri webview 的系统级拖入动作，自动化测试必须通过按钮入口完成导入步骤。导入功能必须同时提供拖拽和按钮两种方式，不能只有拖拽。

**扫描识别逻辑**：工具不依赖固定路径前缀，而是在整个目录树中寻找包含有效 `SKILL.md` 文件的目录。判定标准是：该目录下存在 `SKILL.md` 文件，且该文件包含合法的 YAML frontmatter。

#### 扫描结果三分类

不同 AI 工具对 SKILL.md 的字段宽容度不同（如 Claude Code 早期实现允许省略 `name:` 由目录名推断）。AgentMix 不跟随任何特定工具的实现，而是采用**严格的 spec 合规要求**：每个被识别的 Skill **必须**同时具备 `name` 与 `description` 字段，且 `name` 值与父目录名一致。

扫描器将发现的 Skill 候选分入三类：

| 分类 | 判定标准 | UI 默认行为 |
|---|---|---|
| **portable** | spec 合规 + 未使用任何工具特定字段（如 `allowed-tools`） | 默认展示，可参与所有目标的导出 |
| **tool-specific** | spec 合规 + 使用了实验性 / 工具特定字段 | 默认展示，附"仅 X 工具支持"徽章；导出时由兼容性预检（§1.10）拦截 |
| **invalid** | 缺 `name` 或 `description`、name 与父目录名不一致、YAML 解析失败 | **默认隐藏**，设置中可切换"显示无效候选"。提供"一键补全 name"修复入口跳转 §1.6 编辑器 |

以 Addy Osmani 的 `agent-skills` 仓库为例：

```
agent-skills/
├── skills/
│   ├── code-review-and-quality/
│   │   └── SKILL.md          ← portable
│   ├── test-driven-development/
│   │   └── SKILL.md          ← portable
│   └── security-and-hardening/
│       └── SKILL.md          ← portable
├── agents/                   ← 暂不处理（v1.0+ Asset 扩展再支持）
├── references/               ← 暂不处理
└── .claude/commands/         ← 暂不处理（v1.0+ Slash Command 资产再支持）
```

将该仓库文件夹直接拖入 AgentMix，工具即可自动发现 `skills/` 下的所有 Skill，无需用户事先将文件夹移动到任何特定路径。扫描时主动跳过 `.git/`、`node_modules/`、`target/` 等常见无关目录，默认扫描深度为 5 层，可配置。

### 1.2 技能浏览与选择（Skill Browser）

主界面以项目为分组，展示所有来源项目中识别到的 Skills。每个条目前有复选框，**默认未选中**。

每个 Skill 卡片展示：名称、描述摘要（前 100 字符）、来源项目、在原始项目中的相对路径、扫描分类徽章（portable / tool-specific）、兼容性标签、是否包含脚本（`scripts/` 目录）、健康度状态（正常 / 警告 / 错误）。

界面提供以下筛选能力：按来源项目筛选、按关键词搜索（匹配 name 和 description）、按兼容性筛选、按健康度筛选（只显示无问题的 Skills）、按扫描分类筛选。

#### 冲突模型：导出冲突 (ExportConflict) vs 运行时冲突 (RuntimeConflict)

AgentMix 区分两类完全不同的冲突，**分开检测、分开处理**：

**导出冲突 (ExportConflict，文件系统级)**：同一个目标目录里不能有两个同名子目录。例如用户同时勾选了 Addy 的 `code-review` 与 Vercel 的 `code-review`，都要导出到 `<project>/.claude/skills/`——后写入的会覆盖前者，必须在导出前解决。按"目标工具 + 作用范围 (scope) + 目标路径 + 导出后名称 (exported_name)"四个维度联合判定。

**运行时冲突 (RuntimeConflict，运行时解析级)**：目标 AI 工具在加载多源 Skill 时的加载优先级 (precedence) 与重名时的行为 (duplicate behavior)。例如 Claude Code 同时存在 `~/.claude/skills/X` 与 `<project>/.claude/skills/X` 时，按项目级优先 (project-first) 解析；Codex 对同名 Skill 是"不合并但都显示"。按"目标工具行为 + 目标位置已存在的 Skill + 用户级 / 项目级 / 系统级 (admin scope)"联合判定。

| 项 | ExportConflict | RuntimeConflict |
|---|---|---|
| 引发原因 | 用户在同一组合里勾选了两个同名 Skill | 导出后与目标工具已有 Skill 在运行时争夺名字 |
| 引入版本 | v0.1（单目标已存在） | v0.2（多目标导出后才真正显化） |
| 解决路径 | 重命名 / 保留一个 / 合并工作台（v0.1.5+） | 用户被提示该工具的 precedence 与 duplicate 行为，可选择"覆盖"、"放弃导出"、"重命名" |
| 检测时机 | 选中即检测，导出前再次校验 | 导出前由 §1.10 兼容性预检子模块计算 |

**冲突预警**：选中 Skills 触发 ExportConflict 即在 UI 显示橙色警告图标 + "需要解决"标记，未解决前导出按钮禁用。RuntimeConflict 作为警告级提示展示，不阻止导出但明确告知运行时可能行为。

**v0.1 归类规则**：v0.1 仅支持 Claude Code 项目级单目标导出，冲突按以下规则归类——

- 用户在同一组合里勾选了两个同名 Skill → ExportConflict，**阻止导出**，必须解决
- 用户勾选的 Skill 与目标 `.claude/skills/` 已存在的同名目录冲突 → ExportConflict，**阻止导出**（覆盖模式由用户在预览页显式确认）
- 与目标工具用户级 / 系统级 Skill 的运行时优先级问题 → RuntimeConflict，**仅作警告，不阻止**

总原则：v0.1 阶段，**阻止导出的只有 ExportConflict**；RuntimeConflict 收窄为运行时解析差异警告。多目标导出引入后（v0.2），RuntimeConflict 才会真正显化。

### 1.3 Skill 合并工作台（Merge Workbench）

> **版本**：手动合并模式 v0.1.5；AI 辅助合并模式 v0.2。v0.1 alpha 不含合并工作台，冲突仅通过"重命名 / 保留一个"解决。

当用户选中多个同名或功能相近的 Skills 时，可以进入**合并工作台**，将多个 Skill 的内容融合为一个新 Skill。合并工作台支持两种模式，用户可以自由选择或组合使用。

**手动合并模式（v0.1.5）**：工作台将多个 Skill 的 SKILL.md 内容并排展示，每列对应一个来源 Skill，用户可以在右侧的编辑区直接撰写或粘贴内容，从各列中选取需要的段落。编辑区支持实时 Markdown 预览，并在底部显示当前 SKILL.md 的 frontmatter 校验状态（name 格式是否合法、description 是否超长等）。

**AI 辅助合并模式（v0.2+）**：用户在工作台底部输入合并指令（可选，如"保留左侧的步骤结构，融入右侧的安全检查点"），点击"AI 生成草稿"，工具调用用户配置的大模型 API 生成合并草稿并填入编辑区。用户在此基础上继续手动修改，直到满意为止。AI 生成的内容在编辑区中以不同背景色标注，方便用户识别哪些内容是 AI 写的。

> **密钥管理**：AI 合并所需的 API 密钥统一通过系统密钥库 (OS keychain，对应 Windows 凭据管理器 / macOS Keychain / Linux Secret Service，由 `keyring` crate 抽象) 存储，不允许明文配置文件或环境变量回退。启动时检测密钥库可用性，不可用时 AI 合并入口在 UI 中明确禁用并显示原因。MVP（v0.1）不包含 AI 合并，仅支持手动合并；AI 合并随 v0.2 与密钥管理一同交付。

**合并结果**：确认后，新 Skill 以用户指定的名称加入组合清单，参与后续导出。原始 Skills 的 `scripts/` 目录内容不参与合并，工具会提示用户手动决定保留哪一方的脚本。

**不限于冲突场景**：合并工作台不仅在冲突时触发，用户也可以主动选中任意两个或多个 Skills（即使名称不同），点击"合并为新 Skill"进入工作台，创造一个融合多方能力的新 Skill。

### 1.4 导出（Export）

**导出的本质**：导出是将选中的 Skill 目录（完整复制，包含 `SKILL.md`、`scripts/`、`references/`、`assets/` 等所有文件）写入目标 AI 工具能够识别的路径。导出后，目标路径的结构示例如下：

```
my-project/                        ← 用户指定的目标项目
└── .claude/skills/                ← 导出到 Claude Code 项目级路径
    ├── code-review-and-quality/   ← 来自 agent-skills 的 Skill（完整目录）
    │   ├── SKILL.md
    │   └── references/
    ├── security-and-hardening/    ← 来自 agent-skills 的 Skill
    │   └── SKILL.md
    └── nextjs-deploy/             ← 来自 vercel-skills 的 Skill
        ├── SKILL.md
        └── scripts/
            └── deploy.sh
```

导出后，用户在该项目中打开 Claude Code，即可直接使用这些 Skills，无需任何额外配置。

**多目标导出（v0.2+）**：用户选择导出目标（可多选），工具按各工具的 **ToolAdapter** 配置部署到对应路径。ToolAdapter 不是简单的"工具名 → 路径"映射，而是描述该工具完整运行时行为的数据结构：

```typescript
interface ToolAdapter {
  id: 'claude-code' | 'cursor' | 'codex' | 'opencode' | 'gemini-cli';
  displayName: string;

  // 路径配置：不同 scope 下的 skills 目录
  projectPaths: string[];        // 项目级（可多个，如 OpenCode 支持多个）
  userPaths: string[];           // 用户级
  adminPaths?: string[];         // 系统级（Codex 有此 scope）

  // 运行时行为
  precedence: 'project-first' | 'user-first' | 'merge-all';
  duplicateNameBehavior: 'last-wins' | 'show-both' | 'error';
  reloadBehavior: 'auto' | 'restart-required';
}
```

**v0.2 出厂内置的 ToolAdapter 实例**（基于各工具 2026 年中期的官方文档）：

| 工具 | projectPaths | userPaths | adminPaths | precedence | duplicate 行为 |
|---|---|---|---|---|---|
| Claude Code [10] | `.claude/skills/` | `~/.claude/skills/` | — | project-first | last-wins |
| Cursor [9] | `.cursor/skills/` | — | — | — | last-wins |
| Codex CLI [11] | `.agents/skills/` | `~/.agents/skills/` | `/etc/codex/skills/` | merge-all | show-both（同名 Skill 都展示） |
| OpenCode [15] | `.opencode/skills/`、`.claude/skills/`、`.agents/skills/` | `~/.config/opencode/skills/` | — | project-first | last-wins |
| Gemini CLI [16] | `.gemini/skills/`、`.agents/skills/` | `~/.agents/skills/` | — | project-first | last-wins |
| 自定义 | 用户指定 | 用户指定 | — | last-wins（默认） | error（默认） |

> **关于 Codex `.codex/skills`**：早期文档版本曾出现 `.codex/skills` 路径描述，2026 年中以后的官方位置为 `.agents/skills` 系列。AgentMix 内置矩阵以 `.agents/skills` 为准，不再适配 `.codex/skills`。
>
> **路径权威性**：以上数据并非通过实时探测各工具版本得出，而是由社区维护的 `tool-adapters.json` 文件（§1.10 同源）随 AgentMix 版本发布并支持远程更新。UI 角落显示数据新鲜度，超过 14 天提示用户检查。
>
> **v0.2.0 收窄**：v0.2.0 只随版本内嵌 baseline `tool-adapters.json`（标注数据日期），不含远程更新与新鲜度 UI；二者延后到引入网络的 v0.2.1。

导出时区分**写入策略**与**备份**两层：

**写入策略（二选一）**：**覆盖模式**直接覆盖目标路径中的同名 Skill；**合并模式**保留已有 Skills、仅追加新的。两种模式都在预览页 (Dry-run) 列出每个文件的创建 / 覆盖 / 删除清单，以及备份压缩包的写入位置和总字节数，用户确认后才执行。

**备份（自动附带，非可选模式）**：所有破坏性导出操作都自动生成一份备份计划 (BackupPlan)，作为同一份导出预览 (ExportPlan) 的组成部分。预览页明确告知备份压缩包将写入哪里、大小约多少；用户确认执行后，备份在写入目标文件之前完成。备份不再是与覆盖 / 合并并列的"第三种模式"——避免用户因为没勾选备份模式而失去恢复机会。

> **备份位置**：备份压缩包统一写入 `~/.agentmix/backups/<project-hash>/`，**不**落在目标项目目录内——避免备份 zip 被误提交到 git。UI 提供"打开备份目录"按钮直达。
>
> **预览是必经步骤**：导出按钮触发的是预览页 (Dry-run，§1.12)，用户确认后才真正修改文件。除了导出预览这条路径，没有其他修改用户文件的代码分支。

### 1.5 Skill 健康度检查（Health Check）

在导出前，AgentMix 对每个选中的 Skill 自动执行健康度检查，识别可能导致 Skill 无法正常工作的问题。检查分两层：**确定性检查**（v0.1 起始终启用，无外部依赖）与 **AI 增强检查**（v0.2 起，需配置 API key 时可用）。

#### 确定性检查（v0.1，无 AI 依赖）

**规范合规性**：name 字段格式是否合法（小写字母/数字/连字符）、name 是否与父目录名一致、description 是否超过 1024 字符限制、YAML frontmatter 是否可正常解析。

**触发场景动词存在性**：通过正则与关键词列表检测 description 是否包含触发型短语（"当…时使用"、"用于…"、"use when…"、"trigger on…" 等多语种 pattern），缺失则提示补全。

**脚本依赖**：`scripts/` 目录中的脚本是否声明了 `compatibility` 字段，若有脚本但无 compatibility 说明，提示用户补充。

**文件完整性**：SKILL.md 是否存在、是否可读、是否为空。

#### AI 增强检查（v0.2，需 API key）

**同源语义重合度**：调用 Voyage AI embedding API（v0.6 起默认 provider，不暴露切换）对同源项目内的 Skill descriptions 编码，按余弦相似度比较。与某 sibling Skill 重合度 ≥ 0.85 时提示"此 description 与 `<sibling-name>` 重合度过高，Agent 可能无法区分激活时机"。

**Description 内容质量**：调用 LLM 评估 description 是否清晰、是否聚焦在触发场景而非实现细节、是否含模糊表述。返回具体改进建议（如"description 过于通用，建议加入具体触发关键词"）。

**`scripts/` 行为分析**：在 `scripts/` 静态安全规则（§1.11）之上，调用 LLM 总结脚本意图，与 Skill description 声明的能力做交叉验证。若 LLM 判断"脚本行为与 description 不一致"则标红。

#### AI 一键修复

每条带 `aiFixAvailable: true` 标记的健康度问题，UI 在该问题旁渲染"AI 修复"按钮。点击后：

1. 调用 LLM 生成修复后的 description / frontmatter 片段
2. **强制** diff 预览：左侧原文、右侧修复版、变更行高亮
3. 用户三选：接受 / 拒绝 / 编辑后接受

AI 修复**永不自动应用**，必须经过 diff 预览与显式确认——遵循"显式暴露故障"的核心约束。API key 未配置时按钮灰显，提示"需在设置中配置 Voyage / LLM provider"。

#### 健康度等级

结果分三级：**正常**（绿色，无问题）、**警告**（橙色，存在可能影响效果的问题但不阻止导出）、**错误**（红色，会导致 Skill 无法使用，导出时需要用户确认）。AI 增强检查的发现默认是警告级，由用户判断是否修复。

### 1.6 Skill 编辑器（Skill Editor）

AgentMix 内置轻量级 Skill 编辑器，允许用户在不离开工具的情况下对 Skill 内容进行修改。编辑器基于 CodeMirror 6，支持 Markdown 语法高亮和实时预览，并在侧边栏实时显示 frontmatter 字段的解析结果和校验状态。

编辑器适用于以下场景：修复健康度检查发现的问题、调整 description 以优化触发精度、在合并工作台中编辑合并结果、对来源 Skill 进行个性化定制（修改后的版本作为独立副本，不影响原始文件）。

### 1.7 配置集（Preset / Profile）

**Preset 解决的问题**：用户经常面对同一类项目重复做同样的挑选——比如每开一个 React 项目都要选"代码审查 + 无障碍审查 + 性能优化"那几个 Skills，再处理一遍冲突重命名。Preset 把"选了哪些 Skill + 怎么解决了冲突 + 准备导出到哪些工具"打包成一份可保存、可分享的快照。

**典型使用方式**：个人开发者把常用组合存为 Preset，下次新项目一键应用；团队 leader 把团队标准 Skills 配置做成 Preset 分发给成员，保证团队 AI 行为一致。

**与 `.agentmix.lock` 的分工**：lock 只解决"每个 Skill 来自哪、版本是什么、内容是否被篡改"；Preset 在这之上再记录用户的工作集状态（选了哪些、怎么命名的、想导哪）。lock 是通用契约，Preset 是 AgentMix 自有的快照格式。

#### 三个对象的分工

为避免边界混淆，先明确三个相关对象各自的职责：

| 对象 | 形态 | 职责 |
|---|---|---|
| **工作集 (Composition)** | 内存运行时对象（§3.2） | 用户当前正在编辑的工作集：选中、重命名、合并草稿、目标工具偏好 |
| **Preset / Profile** | 持久化快照（YAML / Bundle zip） | 工作集的可保存版本，含合并指令、目标偏好等 AgentMix 自有信息 |
| **`.agentmix.lock`** | 复现规约（YAML，§1.9） | 仅描述"每个 Skill 的来源 + 版本指针 + 完整性 hash"，schema 严格收敛到 7 字段 |

**关键边界**：Preset 与 lock **不共用一个文件**。lock 的字段集是开放共享契约（[决策 23](decisions/0023-lock-excludes-metadata.md)），不能被 AgentMix 私有字段污染；Preset 是 AgentMix 自身的产品形态，可自由演进。

#### 两种导出格式

| 格式 | 文件结构 | 适用场景 | 复现要求 |
|---|---|---|---|
| **锁文件 (Lock-only)**（轻量）| `.agentmix.lock` + 同目录的 `agentmix-preset.yaml`（可选） | 所有来源都是公共可访问的 git 仓库 / URL | 接收方有网络 + git 凭据 |
| **整包 (Bundle)**（自包含）| `<name>.agentmix-bundle.zip`，内含 `lock.yaml` + `preset.yaml` + `sources/<hash>/` 目录 | 含 local-copy / archive / generated 来源，或离线分发 | 接收方解压即用，无外网依赖 |

Lock-only 模式下，仅分发 lock 也是合法用法——只是接收方拿不到 Preset 的合并指令与目标偏好，需要自行重建。Preset 与 lock 是**搭配但解耦**的两份文件。

AgentMix 在导出配置集时自动检测：所有来源均为公共 git → 默认 Lock-only；含任何 local-copy / generated → 强制 Bundle 模式（避免分发出去对方根本无法 resolve 的 lock）。

#### Preset 内容

Preset 是 AgentMix 私有 schema，记录：来源项目引用列表（按 source_type 区分）、选中的 Skill 名称列表、冲突重命名映射（与 lock 中 `exported_name` 字段对应但不重复存储）、合并生成的新 Skill 内容与合并指令、目标工具与 scope 偏好。Preset 字段会随 AgentMix 版本演进；lock 字段保持严格收敛。

#### 接收方应用 Preset 的流程

1. 接收方在 AgentMix 中选择 Preset 文件（`.agentmix.lock` + `agentmix-preset.yaml`，或 Bundle zip）
2. AgentMix 按 Preset 的模式自动获取 Skills 内容：
   - Lock-only 模式 → 从 lock 记录的公开 git 仓库自动拉取并校验完整性
   - Bundle 模式 → 直接从压缩包读取
3. 接收方手动选择本地目标项目路径——Preset 不记录目标路径，每次应用都需要接收方显式选择，因为不同人的项目位置不同
4. 进入 Dry-run 预览，确认后导出

接收方**无需预先下载任何 Skills 内容**——AgentMix 按 Preset 自动获取。

**网络不可用兜底**：Lock-only 模式应用时，AgentMix 在执行 git 拉取前检测网络可用性。若无法访问 lock 记录的仓库，工具报错并提示接收方检查网络，或联系 Preset 提供方重新导出为 Bundle 模式。**不允许**跳过 hash 校验继续应用——丢失完整性保证就违背了 lock 的存在意义。

### 1.8 来源项目订阅与更新提醒（Source Tracking）

用户将一个 GitHub 仓库作为来源项目导入后，可以选择"订阅更新"。AgentMix 会在后台定期（或用户手动触发时）检查该仓库是否有新的 commit，若有更新则在 UI 中提示用户，并展示新增/修改/删除了哪些 Skills。用户可以选择性地将更新同步到本地，并决定是否重新导出到目标工具。

这个功能解决了一个常见痛点：用户导入了某个 Skills 仓库的某个版本，但仓库作者后续修复了 bug 或新增了内容，用户无从得知。

### 1.9 版本锁定（`.agentmix.lock`）

**lock 文件解决的问题**：用户把组合配置 (Preset) 分享给同事或部署到 CI 后，对方拿到的 Skills 内容应当与你本地**逐字节一致**。但 git 仓库会变动、上游作者可能修改 description、archive 包可能被替换——如果只记"我用了 addyosmani/agent-skills 的 code-review"，几个月后对方拿到的可能已经是另一个版本。`.agentmix.lock` 通过精确记录"每个 Skill 来自哪、版本指针是什么、内容 hash 多少"，让组合在任何机器、任何时间都能还原成相同的内容。

**典型使用方式**：
- 团队 leader 提交一份 `.agentmix.lock` 到代码仓库，团队成员 `agentmix apply` 即可拿到完全一致的 Skills 配置
- CI 流水线在每次构建前校验 lock 与本地实际安装是否匹配，发现漂移即阻止构建
- 用户复现历史 bug 时，可以拉取当时的 lock 文件，确保还原相同的 AI 工具行为

**与 SKILL.md 元数据的边界**：lock 只关心"复现"——来源、版本、完整性。Skill 的 `license`、`description`、`metadata` 等内容字段属于 SKILL.md 自身，lock 不重复存储，避免"哪份是权威"的混淆。

**详细 schema 字段、YAML 示例、vendor 机制与复现流程见附录 A。**

### 1.10 跨工具兼容性预检（Capability Linter）

不同 AI 工具支持的 SKILL.md 特性不同。例如 `allowed-tools` 字段是 Claude Code 实验性能力，Cursor / Codex 可能不识别。AgentMix 维护一份能力矩阵 `compatibility-matrix.json`，记录每个目标工具对各个 SKILL.md 字段的支持状态（`supported` / `ignored` / `error` / `experimental`）。导出前自动比对并提示，例如"此 Skill 使用了 `allowed-tools`，在 Cursor 中会被忽略"。

矩阵分三层维护：(1) 内嵌基线矩阵随 AgentMix 版本发布；(2) 启动时从社区仓库远程更新；(3) UI 角落显示"兼容性数据更新于 X 天前"，超过 14 天提示告警。设计上明确承认这不是与官方实时同步——但通过社区 PR 机制集中维护，对绝大多数用户场景足够。矩阵 schema 设计为 PR 友好的扁平 JSON，任何用户发现支持变更都可一行修改提交 PR。

> **v0.2.0 收窄**：v0.2.0 只内嵌 baseline `compatibility-matrix.json`（标注数据日期），逐字段校验为警告级、不阻断导出；远程更新与新鲜度提示延后到 v0.2.1。

### 1.11 安全预检与威胁模型

**AgentMix 不承诺"安全"，承诺"风险可见"。** 静态扫描无法证明任何脚本绝对安全——做不到，也不应假装做到。能做的是：把所有已知风险点全部摆到用户面前，由用户决定是否接受。这是 AgentMix 的安全契约边界。

#### 默认保守策略（无须用户介入）

1. **不跟随符号链接**。Skill 目录里的 symlink 原样保留，扫描不解引用——避免扫描逃逸出项目边界或撞进死循环。
2. **单个 Skill 体积上限 2MB**。超过的 Skill 在导入时标红，需用户确认。挡 zip bomb 与"不小心打包了大尺寸二进制"两类事故。SKILL.md spec 建议正文 < 5000 tokens（约 20–30KB 文本），加上脚本与少量参考资产，2MB 足够覆盖任何合规 Skill 的实际体积。
3. **二进制文件单独列出**。每个 Skill 携带的非纯文本文件（图片、压缩包、可执行文件等）在 Skill 卡片的"资产清单"中展示，让用户对"我装的这个 Skill 里有什么"心里有数。

#### 可疑脚本操作扫描（导入与导出前都跑）

对 `scripts/` 下的 bash / python / powershell 等脚本做静态扫描，命中以下任一规则即标记为 **高危项**：

- 网络下载并执行：`curl | sh`、`wget -O- | bash`、`Invoke-WebRequest | Invoke-Expression`
- 访问敏感路径：`~/.ssh/`、`~/.aws/`、`.env`、`/etc/`、Windows 凭据库相关 API
- 动态执行字符串：`eval`、`exec`、`Function(string)` 等
- 反弹 shell 特征码、挖矿程序特征码

命中高危项的 Skill，AgentMix 在 UI 中展示：
- 完整脚本片段，高危行号高亮
- 命中的规则名（例如 `network-download-execute`）
- 默认拒绝导入 / 导出，用户必须**显式**勾选"我已审查并接受风险"按 Skill 单独确认才能继续——**不可**"全部允许"批量绕过

#### 明确不承诺的事

以下几类风险 AgentMix **展示但不判定**——这是契约边界，写明白避免误期待：

| 风险类别 | AgentMix 行为 | 原因 |
|---|---|---|
| SKILL.md 正文中的自然语言恶意指令 | 用户可在 UI 浏览完整 markdown 内容 | 自然语言意图判断超出静态扫描能力 |
| 被脚本引用的外部文件（HTTP URL、远程脚本） | 在 UI 中列出引用清单 | 外部内容可在使用时被替换，扫描无法跟踪 |
| 未知格式的二进制资产 | 在资产清单中标识为"二进制 + 大小" | 无法在不执行的前提下判定行为 |
| 高级混淆（base64、字符串拼接绕过 pattern） | 静态规则可能漏检 | 完美的混淆检测需要复杂的程序逻辑分析，超出 MVP 范围 |

**简单的安全契约**：AgentMix 让用户**看见**带来什么，**不替**用户判断它安全与否。

### 1.12 Dry-run 预览

Dry-run 是 AgentMix 在执行任何破坏性操作前的统一预览阶段——展示"如果你点确认，会发生什么"，但**不真的发生**。所有破坏性操作（导出、同步、覆盖、删除）执行前必须经过预览。完整流程：

1. 用户点击 **导出 / 同步 / 应用更新**
2. AgentMix 展示完整变更清单：
   - 🟢 将创建的文件路径
   - 🟡 将覆盖的文件路径 + 内容 diff
   - 🔴 将删除的文件路径
   - 备份压缩包将写入的位置
   - 受影响 Skill 总数与字节数汇总
3. 用户明确点"确认执行"后，工具才真正修改用户的文件

预览阶段不产生任何文件系统副作用，确认阶段统一执行写入——典型的两阶段提交。绝不允许"直接写入"的代码分支。

### 1.13 Skill 脚手架（New Skill Wizard）

AgentMix 不仅消费现有 Skills，也支持创建新 Skill。脚手架向导内嵌 Anthropic 官方 [skill-creator](https://github.com/anthropics/skills) 的方法论，确保新建出的 Skill 符合最佳实践，而不是机械生成空模板。

#### 向导内置的方法论原则

1. **触发场景优先**：description 必须明确"何时使用"，而不是"做什么"。向导的 description 字段示例文案、tooltip、模板，都采用 `Use when…` / `当…时使用` 句式，让用户从填表那一刻就在写触发条件。
2. **渐进式披露**：SKILL.md 主体保持精简（推荐 < 5000 tokens），细节按需放进 `references/`、`scripts/`、`assets/`。向导明确分离主体内容与延伸资源。
3. **具体优于宽泛**：模板按职责切分（代码审查类 / 部署类 / 数据分析类 / 文档生成类 / 其他），不提供"通用 Skill"模板，避免引导用户写出激活时机模糊的 Skill。
4. **示例驱动**：每个模板预填一段 minimal example 段落，让 Agent 在不依赖额外文档时也能理解使用方式。
5. **同一套校验**：向导内的 description 实时校验复用 §1.5 的结构化检查（触发动词存在、长度上限），保证新建与导入的 Skills 走同一信任路径。

#### 向导步骤

**Step 1 — 基本信息**：name（实时校验小写 / 连字符 / 64 字符上限）、description（实时校验结构与长度，含触发动词提示）、模板（按职责选择）。

**Step 2 — 目录结构（多选）**：界面在每个选项旁附说明文案，让用户无需事先了解 SKILL.md 规范也能正确选择。

- ☑ `SKILL.md`（强制）—— Skill 的主文档，必有
- ☐ `scripts/` —— 当 Skill 需要附带可执行脚本（如部署脚本、检查脚本、生成脚本）时勾选；勾选后会提示填写 `compatibility` 字段说明运行环境（如 `python>=3.10`、需要哪些命令行工具），方便他人评估能否使用
- ☐ `references/` —— 当 Skill 有大段背景资料、规范文档需要 Agent 按需查阅时勾选；这些内容默认不进入 Agent 上下文，按需加载
- ☐ `assets/` —— 当 Skill 需要附带图片、模板、示例文件等静态资产时勾选

**Step 3 — 内容来源**：每个勾选的子目录三选一——留空（仅创建空目录占位）、从模板填充、拖入本地文件 / 文件夹。

**Step 4 — 预览与创建**：树状展示完整目录结构 + 关键最佳实践 checklist（"description 是否含触发动词"、"是否提供至少一个 example"等）→ 选择目标位置 → 创建。

脚手架产物是一个合法的 Skill 目录，立即被 AgentMix 自身扫描器识别，与从 GitHub 导入的 Skill 一致。与 §1.3 合并工作台共享同一套"目录构建器"组件。

### 1.14 Skill 引用关系检测

Skill A 的 description 或正文可能提及 Skill B（"配合 `code-review` Skill 使用"、"在 `security-scan` 通过后运行"）。如果用户只勾选了 A 没勾选 B，运行时 A 找不到 B 而失效。

AgentMix 扫描每个选中 Skill 的 description 和正文 Markdown，用正则与已知 Skill 名做匹配，构建有向引用图。导出前若发现"已选 A 但未选 A 所引用的 B"，提示用户："检测到 `code-review-and-quality` 提及 `security-scan`，是否一起导出？"——用户可以接受补选、忽略、或主动断开引用。

### 1.15 反向同步（Source ← Target）

用户经常在导出后的目标项目里直接修改 Skill（修 bug、补细节、调整 description）。AgentMix 支持把这些改动回流到来源项目，闭合"消费-生产"循环。

反向同步流程：
1. 检测目标项目中的 Skill 与对应来源 Skill 的内容差异
2. 在 UI 中以左右对比视图展示 diff
3. 用户选择目标：(a) 直接覆盖本地来源副本；(b) 生成 `.patch` 文件供 PR；(c) 若来源为 Git 仓库，在新分支上创建 commit 草稿

反向同步默认不自动触发，由用户在"已导出 Skill"列表中显式选择对应条目并点击"回流到来源"启动。这避免无意中污染来源项目。

### 1.16 自动更新

v0.1 alpha 阶段不含自动更新机制——alpha 用户预期手动升级，AgentMix 通过 GitHub Releases 静态分发。v0.1.5 起引入自动更新，将"首版用户卡死"风险消除在 alpha→beta 过渡。

**更新通道**：GitHub Releases。Release 由 CI 签名（Tauri 强制要求），公钥嵌入 App，私钥保存在 GitHub Actions secret。

**检测流程**：
1. 启动后异步请求 GitHub Releases API（缓存 24 小时，避免 rate limit）
2. 比对当前版本与最新 release tag
3. 有新版本 → 设置 / 帮助图标显示红点徽标
4. 用户点击徽标 → modal 展示 changelog（来自 release body） + 三选项：**立即更新** / **稍后** / **跳过此版本**
5. 用户选择更新 → Tauri Updater 处理下载、签名校验、原子替换、重启

**用户控制**：
- 设置面板提供"自动检查更新"开关，**默认开启**——保护用户在最低参与下也能拿到安全修复
- 关闭后仍可手动点"检查更新"
- 跳过此版本：本地记忆，不再为同一版本提示

**网络异常处理**：检测请求失败 / 超时 → 静默忽略，不打扰用户。下次启动重试。

### 1.17 国际化（i18n）

i18n **架构在 v0.1 即立起**，翻译完整化在 **v0.1.5** 完成。原因：事后给所有 UI 组件加国际化需要逐个改动，改造成本极高，架构必须一开始就立起来；但翻译资源本身可以增量补全，不必和架构同步上线。

#### v0.1 i18n 范围

**架构（核心约束）**：
- 库：`react-i18next`（React 生态最成熟）
- 资源文件：`src/i18n/en.json`（**完整**）、`src/i18n/zh.json`（**关键 key stub**）
- 所有用户可见字符串通过 `t('key.path')` lookup——**包括按钮、错误信息、tooltip、modal 标题**，无任何硬编码

**翻译范围（v0.1 stub）**：
- `en.json` 100% 完整覆盖所有 key
- `zh.json` 仅覆盖"关键 key"：导航、核心动作按钮、错误信息、欢迎屏文案
- `zh.json` 中缺失的 key 在运行时自动 fallback 到 `en.json`——用户看到的是 95% 英文界面 + 5% 中文关键提示
- 这是有意为之的折中：架构核心约束（无硬编码）+ 翻译完整度（暂不要求）解耦

**默认语言探测**：
- 启动时读取 `navigator.language` / OS locale
- 匹配 `zh-*` 视为中文，`en-*` 视为英文，其他默认英文
- 用户首次启动可在欢迎屏（§2）选择语言，选择持久化到本地配置

**语言切换**：设置面板提供切换菜单，即时生效，无需重启。

#### v0.1.5：翻译完整化

- `zh.json` 补齐至与 `en.json` 100% key 一致
- CI 在构建时校验两个文件的 key 集合**完全相等**，任一方缺 key 即构建失败——避免再回到"用户看到原始 `t('button.export')` 字符串"的体验破口

#### v1.0+：更多语种

视社区需求加入日 / 韩 / 其他语种，资源文件追加即可，架构无需改动。MVP 仅承诺中英两语。

**未来扩展**：v1.0+ 视社区需求加入日韩、其他语种。i18n 架构本身在 MVP 就立起来，后续只需添加资源文件。

### 1.18 语义聚类与颜色高亮

来源项目中 Skill 数量较多时，用户难以肉眼找出功能相近的 Skill 候选合并。AgentMix 在左侧 Skill 列表中提供"按相似度高亮"模式：功能语义接近的 Skills 以相同背景色聚类，让用户一眼定位可合并候选。

**算法路径**：
1. 调 Voyage AI embedding API（v0.6 起默认 provider，不暴露给用户切换）对每个 Skill 的 description 编码
2. 自动按语义相近度分组，识别离群项（聚类算法 HDBSCAN，无需用户预设簇数）
3. 限制可视化簇数 ≤ 8，超出的小簇合并到"未分类"灰色组
4. 色板使用 Okabe-Ito（色盲友好），高对比度背景，搭配条纹/圆点图案 fallback（辅助色觉障碍用户）

**入口与体验**：
- 左侧 toolbar "**按相似度分组**" 切换按钮，默认关闭
- 开启后异步计算（< 2 秒），完成前显示骨架屏
- 簇 legend 显示在列表顶部，点击 legend 项可临时筛选只看该簇
- 鼠标悬停某 Skill 时，同簇其他 Skill 浮起边框，方便扫视

**降级条件**：API key 未配置或 embedding API 调用失败 → 该模式不可用，按钮灰显并提示原因（与 §1.5 AI 增强检查同样的降级策略）。

**embedding 结果缓存**：以 `(skill_id, content_hash)` 为 key 缓存在本地 SQLite，命中即跳过 API 调用。内容未变的 Skill 不重复计费。

---

## 2. 交互设计

### 2.1 启动屏与主界面布局

> 本节线框图为布局示意，标注信息层级与交互入口。最终视觉、间距、配色与组件状态以 Pixso 设计稿为准。

AgentMix 启动时根据来源项目列表是否为空，呈现两种界面：

**空状态 → 欢迎屏（首次启动或主动清空后）**：

```
┌─────────────────────────────────────────────────────────────────┐
│  AgentMix                                            [⚙] [?]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              👋 欢迎使用 AgentMix                                │
│              把任意来源的 Agent Skills 组合成你专属的配置        │
│                                                                 │
│   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│   │  📁 拖入项目    │  │  🌐 Git URL    │  │  🪄 新建 Skill  │  │
│   │   文件夹        │  │   导入         │  │   （脚手架）    │  │
│   └────────────────┘  └────────────────┘  └────────────────┘  │
│                                                                 │
│   最近使用：                                                    │
│   • agent-skills (Addy Osmani)         3 天前                  │
│   • my-company-skills                  上周                    │
│                                                                 │
│   📖 1 分钟了解 AgentMix  |  💡 推荐 Skills 仓库                │
└─────────────────────────────────────────────────────────────────┘
```

**非空状态 → 主界面**：左右分栏，左侧为"来源项目"面板，右侧为"组合清单与导出"面板。顶部细 Toolbar 承担常用动作（新建 Skill、健康检查、导出、按相似度分组开关）。

> **菜单栏策略**：v0.1 Windows-only，**不引入原生菜单栏**，所有动作通过 Toolbar + 右上设置 / 帮助图标完成。v0.2 跨平台时引入原生菜单栏（macOS 文化强制要求）。

```
┌─────────────────────────────────────────────────────────────────┐
│  AgentMix                                    [设置] [关于]       │
├──────────────────────────┬──────────────────────────────────────┤
│  来源项目                 │  组合清单                            │
│  [搜索/筛选...] [健康度▼] │  已选 5 个 Skills                    │
│                           │  ⚠ 1 个名称冲突                     │
│  📁 agent-skills [↑2新增 ✎1修改] [刷新]│  ─────────────────────────────────  │
│  ├ ☐ ● code-review-and- │  ✓ [code-review-and-quality]         │
│  │     quality [UPDATED] │      agent-skills  ●正常 [UPDATED]   │
│  │                       │      [查看差异]                       │
│  ├ ☐ ● test-driven-dev  │  ✓ [security-and-hardening]          │
│  ├ ☐ ⚠ security-and-    │      agent-skills  ⚠缺触发动词        │
│  │     hardening         │  ✓ [test-driven-development]         │
│  ├ ☐ ● perf-audit [NEW] │      agent-skills  ●正常             │
│  └ ☐ ● a11y-check [NEW] │  ✓ [nextjs-deploy] vercel-skills    │
│                           │  ⚠ [code-review] vercel-skills       │
│  📁 vercel-skills  [刷新] │      → 与 agent-skills 冲突           │
│  ├ ☐ ● code-review      │   [重命名] [保留一个] [合并工作台]   │
│  └ ☐ ● nextjs-deploy    │                                      │
│  📁 my-company-skills     │  ─────────────────────────────────  │
│  ├ ☐ ● api-design       │  导出目标：                          │
│  └ ☐ ● db-migration     │  ☑ Claude Code（项目级）             │
│                           │  ☑ Cursor（项目级）                  │
│  [+ 拖入项目]             │  ☐ Codex CLI（全局）                 │
│  [+ 从 Git 导入]          │                                      │
│                           │  目标项目路径：[选择文件夹...]        │
│                           │                                      │
│                           │  [健康检查] [导出] [保存配置集]      │
└──────────────────────────┴──────────────────────────────────────┘
```

> **线框图标记说明**：`[NEW]` 为绿色徽章，表示来源仓库同步后新增的 Skill；`[UPDATED]` 为蓝色徽章，表示内容有变更的 Skill；项目标题行的 `[↑2新增 ✎1修改]` 为聚合摘要提示，实际实现时使用彩色 Badge 组件渲染。

### 2.2 关键交互流程

**流程 1：首次使用（约 30 秒完成）**

用户打开应用，将从 GitHub 下载的项目文件夹直接拖入左侧区域。工具自动递归扫描并展示该项目中的所有 Skills。重复以上步骤添加更多来源项目，勾选需要的 Skills，在右侧选择导出目标和目标项目路径，点击"健康检查"确认无误后点击"导出"。

**流程 2：冲突处理——三种解法**

用户勾选了两个同名的 Skill，右侧组合清单立即显示橙色警告，并提供三个操作按钮：**重命名**（两个 Skill 以不同名称共存）、**保留一个**（展示内容摘要让用户选择）、**合并工作台**（进入流程 3）。

**流程 3：Skill 合并工作台**

进入合并工作台后，界面分为三列：左列展示 Skill A 的完整内容，中列展示 Skill B 的完整内容，右列是可编辑的新 Skill 草稿区。用户可以直接在右列手动撰写内容，也可以点击左/中列中某段文字旁的"→"按钮将其追加到右列草稿中，实现"拼接式"手动合并。若需要 AI 辅助，在底部输入合并指令后点击"AI 生成草稿"，AI 生成的内容会填入右列，用户继续修改。右列底部实时显示 frontmatter 校验状态。确认后，新 Skill 加入组合清单。

**流程 4：健康度问题修复**

用户在导出前点击"健康检查"，工具扫描所有选中 Skills 并列出问题清单。对于每个警告或错误，用户可以点击"修复"直接跳转到 Skill 编辑器，针对性地修改 description 或 frontmatter，修改后健康度状态实时更新。

**流程 5：来源仓库更新同步**

用户在来源项目旁点击"刷新"图标，工具检查该仓库（若为 Git 仓库）的最新状态，展示变更摘要（如"新增 2 个 Skills，修改 1 个 Skills"）。用户逐一查看变更内容，选择是否将更新同步到本地并重新导出。

**变更状态高亮标记设计**：同步完成后，有变更的 Skill 在来源项目列表和组合清单中均以内联标记（Badge）的形式标注状态，具体规则如下：

| 变更类型 | 标记样式 | 展示位置 |
|---------|---------|--------|
| 新增 Skill | 绿色 `NEW` 徽标，位于 Skill 名称右侧 | 来源项目列表、组合清单 |
| 内容有修改 | 蓝色 `UPDATED` 徽标，位于 Skill 名称右侧 | 来源项目列表、组合清单 |
| 已被上游删除 | 红色 `REMOVED` 徽标 + 删除线 | 来源项目列表、组合清单 |

标记的生命周期遵循\"用户确认即消除\"原则：用户点击某个带标记的 Skill 查看变更详情后，标记变为半透明状态；用户明确选择"应用更新"或"忽略此次变更"后，标记完全消失。若用户未做任何操作直接关闭工具，下次打开时标记依然保留，直到用户显式处理为止。

在来源项目的标题行，同步后会在项目名称右侧显示聚合摘要，例如 `↑ 2 新增  ✎ 1 修改`，让用户无需展开列表即可感知变更规模。对于已加入组合清单的 Skill，若其上游内容发生修改，组合清单中对应条目也会同步显示 `UPDATED` 标记，并在右侧出现"查看差异"按钮，点击后以左右对比视图展示旧版与新版 SKILL.md 的差异（类似 Git diff 的高亮行），用户可以决定是否将新版本应用到当前组合。

---

## 3. 技术架构

### 3.1 技术栈选型

**桌面框架**：Tauri 2.0，支持 **macOS / Windows / Linux** 三平台。选择 Tauri 而非 Electron 的核心理由是：Tauri 应用的内存占用约为 Electron 的 1/10，Rust 后端的性能和安全性优势明显，且 Tauri 的安全模型（显式权限声明）更适合处理用户文件系统。

**前端技术栈**：React 19 + TypeScript（组件框架）、Tailwind CSS v4（样式）、lucide-react（图标）、@dnd-kit/core（拖拽排序）、CodeMirror 6（SKILL.md 预览与编辑，支持 Markdown 语法高亮）、Zustand（状态管理）。UI 视觉、布局与交互以 Pixso 设计稿为来源。

**后端（Rust）核心依赖**：`serde_yaml`（YAML frontmatter 解析）、`walkdir`（递归目录扫描）、`tauri-plugin-fs`（文件系统操作）、`tauri-plugin-dialog`（文件/文件夹选择对话框）、`reqwest`（调用大模型 API）、`git2`（Git 仓库状态检查，用于来源更新检测）、`keyring`（跨平台 OS keychain 抽象，AI 合并密钥统一存储）。

**Rust↔TypeScript 类型同步**：v0.1 用 `specta` + `specta-typescript`，Rust 侧的 struct 与 enum 作为单一来源，TS 类型 (`src/types/generated.ts`) 由 headless 导出 bin 生成 (`pnpm gen:types`)。模型放在 tauri-free 的 `agentmix-types` crate，导出不链接 wry/WebView2，因此能在 CI 与 `cargo` 下生成。手工对齐两侧类型在条目超过 15 个后必出 schema 漂移事故，提前自动化是更便宜的选择。

> 实现注记（偏离原方案）：原计划用 `tauri-specta`，但它的绑定导出必须在链接了 wry 的 Tauri 二进制内运行，该二进制在本机非 GUI 环境（裸 `cargo test`/`cargo run`）启动即 `STATUS_ENTRYPOINT_NOT_FOUND` 崩溃，导致 headless / CI 无法生成类型。改用 `tauri-specta` 的底层引擎 `specta` 直接导出，保留“Rust struct/enum 是跨端单一来源、TS 自动生成”的设计意图；代价是不自动生成命令 invoke wrapper，命令走一层轻量 typed invoke 封装。

**dialog plugin 测试预留**：`tauri-plugin-dialog` 弹出的原生选择器无法被 e2e（WebDriver）操作。在测试构建产物中，dialog 调用改为读取测试预置路径——通过构建期 feature flag（如 `cfg(feature = "test-mode")`）控制，不在运行时检测，避免生产构建留有可探测的旁路。这是 v0.1 e2e 可测性的工程前置条件。

### 3.2 核心数据模型

> **Asset 抽象（架构红线）**：composition pipeline（scanner orchestrator、conflict resolver、export coordinator、lock 生成器）通过 `Asset` 与配套的 `AssetProvider` / `Scanner` / `Validator` / `Exporter` 插件接口工作，对具体 asset 类型保持透明。`Skill` 是 v0.1 的首个 provider 实现——provider 内部可以并应该 Skill-specific（处理 SKILL.md 解析、frontmatter 校验等），但 pipeline 代码本身禁止 `instanceof Skill` 或 `kind === 'skill'` 的硬分支。
>
> 这个抽象层在 v0.1 必须立起来，v1.0+ 才能低代价扩展到 Slash Command、Subagent、CLAUDE.md 片段、MCP 配置等其他 Agent 资产（见 [`ROADMAP.md`](ROADMAP.md) Phase 4）。

```typescript
// 资产抽象——所有被组合对象的公共契约
interface Asset {
  id: string;
  kind: AssetKind;            // 'skill' | 'slash-command' | 'agent' | ...（v0.1 仅 'skill'）
  identityKey: string;        // 在同一 scope 内唯一定位的 key（如 Skill 的 name）
  sourceProjectId: string;
  payload: unknown;           // 子类型携带的具体内容
  healthStatus: 'ok' | 'warning' | 'error';
  healthIssues: HealthIssue[];
}

// 插件接口——每种 Asset 类型实现一组，pipeline 通过接口调用
interface AssetProvider<T extends Asset> {
  kind: AssetKind;
  scanner: Scanner<T>;        // 在源目录中识别此类 Asset
  validator: Validator<T>;    // 健康度检查、frontmatter 校验
  exporter: Exporter<T>;      // 仅构造 ExportPlan fragment，不写文件
  conflictResolver: ConflictResolver<T>;  // 重命名 / 合并策略
}

// 各接口的方法签名
interface Scanner<T extends Asset> {
  scan(rootPath: string, opts: ScanOptions): Promise<ScanResult<T>>;
}

interface Validator<T extends Asset> {
  validate(asset: T): HealthIssue[];   // 确定性检查，无 AI 依赖
}

interface ConflictResolver<T extends Asset> {
  detectExportConflicts(assets: T[], target: ExportTarget): ExportConflict[];
  applyResolution(asset: T, resolution: ConflictResolution): T;
}

interface Exporter<T extends Asset> {
  // 红线：Exporter 只产 plan fragment，不修改任何用户文件
  planExport(
    assets: T[],
    target: ExportTarget,
    existingManifest?: ManagedManifest
  ): Promise<Partial<ExportPlan>>;
}

// pipeline 顶层协调者：合并多 provider 的 fragment、唯一允许执行的入口
interface ExportCoordinator {
  buildPlan(composition: Composition, target: ExportTarget): Promise<ExportPlan>;
  execute(plan: ExportPlan): Promise<ExecutionReport>;   // 唯一允许修改用户文件的入口
}

type AssetKind = 'skill';     // v0.1 仅 'skill'，后续扩展加成员

// 来源项目
interface SourceProject {
  id: string;
  name: string;
  rootPath: string;
  skills: Skill[];
  isGitRepo: boolean;
  lastCheckedAt?: Date;    // 最近一次更新检查时间
  detectedAt: Date;
}

// Skill 条目（Asset 的具体子类型；kind === 'skill'，identityKey === name）
interface Skill extends Asset {
  kind: 'skill';
  name: string;
  description: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  skillDirPath: string;
  relativePathInProject: string;
  hasScripts: boolean;
  skillMdContent: string;
  isMerged?: boolean;      // 是否为合并工作台生成的新 Skill
}

// 健康度问题
interface HealthIssue {
  level: 'warning' | 'error';
  field: string;           // 问题所在字段（如 'description', 'name'）
  message: string;         // 问题描述
  suggestion?: string;     // 修复建议
}

// 组合配置
interface Composition {
  id: string;
  name: string;
  selectedSkillIds: string[];
  renamedSkills: Record<string, string>;
  mergedSkills: MergedSkill[];
  exportTargets: ExportTarget[];
  targetProjectPath?: string;
}

// 合并工作台生成的 Skill
interface MergedSkill {
  id: string;
  name: string;
  skillMdContent: string;
  sourceSkillIds: string[];
  mergePrompt?: string;    // AI 合并时用户输入的指令（若使用了 AI）
  mergeMode: 'manual' | 'ai_assisted';
}

// 导出目标
interface ExportTarget {
  tool: 'claude-code' | 'cursor' | 'codex' | 'opencode' | 'gemini-cli' | 'custom';
  scope: 'project' | 'global';
  customPath?: string;
}
```

#### ExportPlan：Dry-run 与 执行同一个对象

为避免"预览展示一套逻辑、执行使用另一套逻辑"的不一致，所有破坏性操作（导出、同步、覆盖、删除）都先产生一个 **ExportPlan** 对象。Dry-run UI 渲染的就是这个对象，用户确认后执行也是消费这个对象——一份计划，两阶段使用。

```typescript
interface ExportPlan {
  // 目标工具与 scope
  targets: Array<{
    adapter: ToolAdapter;
    scope: 'project' | 'user' | 'admin';
    destinationPaths: string[];   // 解析自 adapter.projectPaths / userPaths
  }>;

  // 即将执行的文件操作
  operations: FileOperation[];

  // 检测到的两类冲突
  conflicts: ExportConflict[];     // 必须在执行前 0
  runtimeWarnings: RuntimeConflict[];  // 警告级，可继续

  // 备份计划
  backups: BackupPlan[];

  // 受影响 skill 与 AgentMix 管理的清单
  managedManifest: ManagedManifest;
}

interface FileOperation {
  kind: 'create' | 'overwrite' | 'delete';
  path: string;
  size: number;
  contentDiff?: string;             // overwrite 时提供 diff 预览
  sourceAsset: string;              // 关联到哪个 Asset
}

interface BackupPlan {
  targetPath: string;
  backupArchive: string;            // ~/.agentmix/backups/<project-hash>/<timestamp>.zip
  sizeBytes: number;
}

interface ManagedManifest {
  // 目标项目侧的 ledger：记录"AgentMix 在此项目里管了哪些 Asset"
  // 不是 lock 的副本，而是引用 lock 的 resolved_ref / content_hash
  // 不可分发，只服务于本机的下次导出与反向同步对账
  manifestPath: string;             // 例如 .claude/skills/.agentmix-manifest.json
  managedAssets: Array<{
    name: string;
    sourceRef: string;              // 引用 lock 的 source_uri@resolved_ref
    content_hash: string;           // 引用 lock 同名字段
  }>;
}
```

**Dry-run UI 直接渲染 `ExportPlan`**：操作清单（绿/黄/红色分组）、conflict 报告、备份位置、受影响 skill 总数与字节数汇总。用户确认 → `ExportCoordinator.execute` 消费同一个 `ExportPlan` 对象顺序执行 `operations`。预览与执行**禁止**走不同代码路径——这是 v0.1 Dry-run 红线的具体实现形式。**`ExportCoordinator.execute` 是修改用户文件的唯一入口**，所有 Provider 的 Exporter 只能产出 fragment，不得自行写文件。

### 3.3 核心算法

**递归 SKILL.md 扫描**：使用 `walkdir` 递归遍历项目目录树，对每个遇到的 `SKILL.md` 文件尝试解析 YAML frontmatter。若解析成功且 `name` 和 `description` 字段均存在，且 `name` 值与父目录名一致，则将该文件的父目录识别为一个有效 Skill。

**健康度检查**：对每个 Skill 依次执行规范合规性、description 质量、脚本依赖、文件完整性四类检查，汇总问题列表，计算最终健康度等级。

**冲突检测**：遍历所有已选 Skills，用 name 字段建立映射表。若发现同名条目，将其加入冲突列表并实时更新 UI 警告。

**导出执行**：`ExportCoordinator.execute` 顺序消费 `ExportPlan` 的 operations 列表。对每个被选中的 Skill，将其完整目录复制到目标路径；若该 Skill 经过重命名，则同时修改目录名和 SKILL.md 中的 name 字段（单一事务）。备份作为 ExportPlan 的固有组成部分（BackupPlan），在写目标文件之前完成。`ExportCoordinator.execute` 是修改用户文件的唯一入口，其他模块禁止直接调用文件系统写入 API。

**AI 合并调用**：构造包含所有待合并 Skill 内容的 prompt，调用用户配置的大模型 API（兼容 OpenAI Chat Completions 格式），将返回的 Markdown 内容填入合并工作台编辑区供用户修改确认。

---

## 4. 核心技术挑战与解决方案

### 4.1 挑战：SKILL.md name 冲突

SKILL.md 规范要求 `name` 字段在同一 skills 目录下唯一，且必须与父目录名一致 [1]。来自不同项目的 Skills 可能重名。

**解决方案**：在用户勾选时立即检测冲突，提供三种解决路径（重命名、保留一个、合并工作台），并在导出前再次验证。重命名时同步修改目录名和 SKILL.md 中的 name 字段，保持一致性。

### 4.2 挑战：递归扫描的误识别

全局递归扫描可能将非 Skill 用途的 `SKILL.md` 文件误识别为 Skill。

**解决方案**：严格校验 YAML frontmatter 合法性，并验证 name 字段值与父目录名是否一致（SKILL.md 规范的强制要求 [1]）。不满足此条件的文件标记为"疑似非标准文件"，默认不展示，用户可在设置中开启显示。

### 4.3 挑战：description 质量影响 Skill 触发率

description 是 Agent 决定是否激活某个 Skill 的唯一依据。过短或描述不清的 description 会导致 Skill 从不被触发，是 Skill 失效最常见的原因 [1]。

**解决方案**：健康度检查中专项检测 description 质量，识别两类结构性问题——缺少触发场景动词（如"当…时使用"、"use when…"）、或与同源 sibling Skill 描述语义重合度过高——给出具体改进建议，并在 Skill 编辑器中提供 description 优化模板。不依赖字符长度阈值。

### 4.4 挑战：scripts/ 目录的依赖问题

某些 Skills 的 `scripts/` 目录包含 Python/Bash 脚本，可能有外部依赖。

**解决方案**：解析 `compatibility` 字段并在 Skill 卡片上以标签形式展示依赖要求，导出时提示用户验证环境兼容性。

### 4.5 挑战：大型项目的扫描性能

对于包含大量文件的项目，全量递归扫描可能较慢。

**解决方案**：首次扫描后将结果缓存到本地 SQLite 数据库，后续只扫描文件修改时间变更的目录（增量扫描）。使用 Rust 异步 I/O 不阻塞 UI，主动跳过 `.git/`、`node_modules/` 等目录，默认扫描深度限制为 8 层，可配置。

### 4.6 挑战：扩展到非 Skill 资产时的架构成本

design-doc v0.4 数据模型与代码路径隐含"被组合对象 = Skill"的假设。一旦 v1.0+ 扩展到 Slash Command / Subagent / CLAUDE.md 片段 / MCP 配置，整个 scan / compose / export 流水线都要重写。

**解决方案**：v0.1 起就引入 `Asset` 抽象（§3.2），所有扫描、组合、冲突检测、导出代码通过 `Asset` 接口工作，不直接耦合 `Skill` 具体类型。`Skill` 是 v0.1 唯一实现，但抽象层必须存在。Code review 阶段重点检查"是否有 `as Skill` 或 `kind === 'skill'` 的硬编码分支"，发现即拒。

### 4.7 挑战：AI 合并所需的 API 密钥管理

明文配置文件易误提交且任何同用户进程都能读取；环境变量在 GUI 应用中读取方式不一致且仍是明文；自实现加密文件涉及 KDF 选择与主密码 UX 等长尾问题。

**解决方案**：v0.2 起 API 密钥统一通过 OS keychain（Windows Credential Manager / macOS Keychain / Linux Secret Service）存储，使用 `keyring` crate 跨三平台统一 API。`service_name = "agentmix"`，`account_name = "<provider>_api_key"`。启动时探测 keychain 可用性，不可用即在 UI 中明确禁用 AI 合并入口并显示原因，**不做静默降级到明文**。加密文件 + 主密码 fallback 规划在 v0.3+，用于覆盖无 secret service 的 Linux 环境，仍走 `age` + `argon2id` 等成熟原语。

### 4.8 挑战：Windows 平台特化

Windows 文件系统大小写不敏感、路径长度默认上限 260 字符、`\` 与 `/` 分隔符差异、UTF-16 与 UTF-8 编码混用，都可能导致跨平台 Skill 名冲突检测、扫描、读写出现难诊断的 bug。

**解决方案**：(1) 名称唯一性校验内部一律按大小写**不敏感**比较——`Code-Review` 与 `code-review` 视为同一名称，无论目标 OS；(2) 递归扫描遇到 > 260 字符路径时跳过并记录警告，UI 展示聚合计数；(3) 文件 I/O 强制 UTF-8 无 BOM，不依赖系统默认编码；(4) 路径在 UI 显示用 `\`，内部存储与比较统一用 `/`；(5) 默认不跟随符号链接，防止扫描逃逸出项目边界。

---

## 5. 验收标准与测试策略

### 5.1 验收标准（Definition of Done）

v0.1 是否达标，由以下 11 条 DoD 判定。

**功能完整性**

**DoD-1 端到端 golden path < 60 秒**。Windows 11 首次启动 → 拖入 `agent-skills` 仓库文件夹 → 勾选 3 个 Skill → 触发 ExportConflict → 重命名解决 → Dry-run 预览 → 导出到 `.claude/skills/` → 在该目录下看到 3 个完整 Skill 子目录。整个流程从启动到导出完成不超过 60 秒。

**DoD-2 `pnpm check:all` 全绿**。一条命令串联 typecheck、ESLint、`cargo clippy`、`cargo fmt --check`、Vitest、`cargo test`、e2e 两条 spec 与四条架构红线 lint，全部通过。

**DoD-3 ExportPlan 一致性**。同一个 Composition 触发的 Dry-run 预览中展示的文件操作清单（创建 / 覆盖 / 删除的路径与字节数），与执行阶段实际产生的文件结果 100% 相同。该一致性由集成测试自动校验，非人工抽查。

**DoD-4 架构红线 lint 命中数为零**。`lint:asset-purity`（pipeline 代码不得出现 Skill 专属类型分支）、`lint:no-direct-write`（导出协调器之外不得出现文件写入调用）、`lint:i18n`（用户可见文本不得硬编码）、`lint:i18n:keys`（中英文资源文件键集合一致性）四条全部通过。

**性能基线**

**DoD-5 大规模扫描 < 5 秒**。在 Windows 11 + SSD 环境下，对一个包含 1000 个 SKILL.md 文件的项目首次完成扫描的耗时不超过 5 秒（Release 构建）。

**DoD-6 启动到可交互 < 2 秒**。从双击应用图标到欢迎屏完全可点击的冷启动时间不超过 2 秒。

**安全契约**

**DoD-7 已知高危脚本零漏报**。用一组预先标注的样本仓库（含 10 个以上已知带高危脚本的真实 Skill）测试 `scripts/` 安全预检，这些脚本必须全部被识别出来（真阳性率 100%）。漏掉任意一个，本项即不通过，该版本不发布。本项不要求零误报——误报由 v0.2 白名单机制承接。

**DoD-8 备份位置隔离**。集成测试断言：执行任意导出后，`.agentmix-backup-*.zip` 仅出现在 `~/.agentmix/backups/<project-hash>/` 路径下，目标项目目录树内绝不出现。

**发布物**

**DoD-9 安装包发布**。GitHub Releases 上传 Windows x64 平台的 `.msi` 与 `.exe` 安装包，附 SHA-256 校验值。

**DoD-10 README 完备**。README 至少包含 30 秒上手 GIF、安装步骤、v0.1 边界声明、已知不支持的场景列表四部分。

**文档同步**

**DoD-11 设计文档与实现一致**。`docs/DESIGN.md` 描述的功能与实现行为一致；不一致即视为破坏架构红线，必须先改文档再改代码。该项由发布前人工核查。

### 5.2 覆盖范围

- **Rust 单测**：scanner、parser、冲突检测、ExportPlan 构造等纯逻辑全部覆盖；使用 `tempdir` 真实路径，不 mock 文件系统。
- **前端 Vitest**：覆盖 store、判别联合分支、i18n key fallback 等纯逻辑。
- **e2e（`tauri-driver`）v0.1 必备 2 条 spec**：
  1. **Golden path**：导入项目 → 勾选 3 个 Skill → Dry-run 预览 → 导出 → 断言目标目录下出现完整 Skill 子目录。
  2. **冲突路径**：勾选两个同名 Skill → 触发 ExportConflict → 重命名 → 导出 → 断言两个目录共存且 frontmatter `name:` 已同步更新。

### 5.3 测试入口的工程预留

以下预留事后接入成本极高，必须在 v0.1 即落地：

- **导入项目按钮入口**：拖拽与"选择文件夹"按钮等价提供（§1.1），e2e 通过按钮入口完成导入。
- **dialog plugin 测试模式**：`tauri-plugin-dialog` 在测试构建产物中读取预置路径，由构建期 feature flag 控制（§3.1）。
- **测试模式 feature flag**：仅在测试构建产物中开启，生产构建不包含可探测的旁路。

### 5.4 强制覆盖的项目特有红线

每条都对应一项架构红线，CI 必跑：

- **ExportPlan 一致性测**：同一 Composition 生成的 ExportPlan，Dry-run 渲染的 FileOperation 列表与 `ExportCoordinator.execute` 实际产生的文件结果（路径、数量、字节数）必须完全相同。这条对应 DoD-3，并兜底 §1.12 与[决策 21](decisions/0021-export-plan-dry-run-data.md)。
- **Asset 抽象纯度测**：pipeline 代码（scanner / composer / exporter 等）grep `instanceof Skill` / `kind === 'skill'` / `as Skill` 命中数 = 0。对应 §4.6、[决策 9](decisions/0009-asset-abstraction-red-line.md)。
- **名称大小写不敏感冲突测**：`Code-Review` 与 `code-review` 必须被识别为同一冲突。对应 §4.8。
- **备份位置隔离测**：执行任意导出后，断言 `.agentmix-backup-*.zip` 仅出现在 `~/.agentmix/backups/<project-hash>/`，目标项目目录树内零出现。对应 DoD-8、[决策 11](decisions/0011-backup-location-agentmix-home.md)。
- **i18n 硬编码测**：`lint:i18n` 扫描源码中疑似硬编码的中英文字符串（不在 `t()` 调用里）命中数 = 0。

### 5.5 不做（显式拒绝）

- **代码覆盖率门槛**：覆盖率高 ≠ 测得对（CLAUDE.md 第 9 条）。不设 80% / 90% 门槛。
- **快照测试**：SKILL.md 内容多变，快照会变成"对账注释"而非校验。
- **Mock 文件系统**：Rust 单测用 `tempdir` 真实路径，避免假绿。

### 5.6 抗 flake 纪律

同一 e2e spec 连续 2 个 PR 失败 → **禁止**删测试或加 retry，必须定位根因或显式 `it.skip` 并开 issue 跟踪。引入 retry 是把不稳定的信号变成可被忽略的噪音，与 CLAUDE.md 第 12 条"显式暴露故障"冲突。

---

## 6. 参考资料

[1]: https://agentskills.io/specification "Agent Skills Specification - agentskills.io"
[2]: https://agentskills.io/home "Agent Skills Overview - agentskills.io"
[3]: https://github.com/addyosmani/agent-skills "addyosmani/agent-skills - GitHub"
[4]: https://github.com/VoltAgent/awesome-agent-skills "VoltAgent/awesome-agent-skills - GitHub"
[5]: https://skillsllm.com/ "SkillsLLM - AI Skills Marketplace"
[6]: https://blog.jetbrains.com/ai/2026/04/skill-manager-and-skill-repository/ "Introducing the Skill Manager and Skill Repository - JetBrains"
[7]: https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/ "Manage agent skills with GitHub CLI - GitHub Changelog"
[8]: https://blog.nidhin.dev/agent-skills "Agent Skills - Nidhin's blog (skills.sh CLI)"
[9]: https://www.agensi.io/learn/where-are-cursor-skills-stored "Where Are Cursor Skills Stored? - agensi.io"
[10]: https://www.agensi.io/learn/where-are-claude-skills-stored "Where Are Claude Skills Stored? - agensi.io"
[11]: https://developers.openai.com/codex/skills "Agent Skills – Codex | OpenAI Developers"
[12]: https://github.com/william-zheng-tw/skillduck "SkillDuck - Open-source desktop GUI for agent skills"
[13]: https://awesomeskill.ai/ "Awesome Skills - Agent Skills Marketplace"
[14]: https://open-vsx.org/extension/1fc0nfig/skills-sh-manager "Skills.sh Manager - Open VSX Registry"
[15]: https://opencode.ai/docs/skills/ "Agent Skills | OpenCode"
[16]: https://geminicli.com/docs/cli/skills/ "Agent Skills | Gemini CLI"

---

## 附录 A. `.agentmix.lock` 文件规范

本附录是 §1.9 的工程细节配套，描述 lock 文件的字段定义、序列化格式、vendor 机制与复现流程。面向工具实现者与需要手动检查 lock 文件的开发者。

### A.1 Schema 字段

| 字段 | 必需 | 何时省略 | 用途 |
|---|---|---|---|
| `name` | ✅ | 永不省 | Skill 在本地组合中的名字 |
| `source_type` | ✅ | 永不省 | `git` / `local-copy` / `archive` / `generated` |
| `source_uri` | ✅ | 永不省 | git 场景为 URL；其他场景为 `local-vendor:<hash>` 指向 AgentMix 管理目录 |
| `resolved_ref` | ✅ | 永不省 | git 场景为 commit SHA；其他场景为内容 hash |
| `subpath` | git 时必需 | 非 git 场景省略 | 仓库内 Skill 目录的相对路径 |
| `exported_name` | 重命名时必需 | 等于 `name` 时省略 | 解决冲突重命名后的本地名 |
| `content_hash` | ✅ | 永不省 | 最终完整性校验 |

显式**不在 lock 中**的字段：

- `license`——已在 SKILL.md 自身 frontmatter，lock 不重复，避免"哪份是权威"的混淆
- `description`——同上
- 任何元数据——lock 只解决"复现"，元数据来源是 SKILL.md

### A.2 Schema 示例（涵盖 4 种 source_type）

```yaml
agentmix_version: "0.2.0"
generated_at: "2026-04-15T10:30:00Z"
skills:
  # git 来源，无重命名
  - name: code-review
    source_type: git
    source_uri: github.com/addyosmani/agent-skills
    resolved_ref: abc123def456
    subpath: skills/code-review-and-quality
    content_hash: sha256:0f9e8d7c6b5a...

  # git 来源，含重命名（解决 ExportConflict）
  - name: code-review-vercel
    source_type: git
    source_uri: github.com/vercel/skills
    resolved_ref: 1a2b3c4d
    subpath: skills/code-review
    exported_name: code-review-vercel
    content_hash: sha256:9876fedc...

  # archive 来源，已被 AgentMix vendor 到本地
  - name: a11y-audit
    source_type: archive
    source_uri: local-vendor:5e4d3c2b
    resolved_ref: sha256:5e4d3c2b...
    content_hash: sha256:5e4d3c2b...

  # generated 来源（向导创建的 Skill），AgentMix 已 vendor
  - name: my-deploy-checklist
    source_type: generated
    source_uri: local-vendor:abc1234
    resolved_ref: sha256:abc1234...
    content_hash: sha256:abc1234...
```

### A.3 Vendor 机制

对 `local-copy` / `archive` / `generated` 三种来源，AgentMix 将内容复制到本机管理目录：

```
~/.agentmix/sources/<content-hash>/
├── SKILL.md
├── scripts/
└── ...
```

lock 中的 `local-vendor:<hash>` 指向此目录。这样：
- 本机用户随时可以 resolve
- §1.7 Bundle 模式导出时，把所有引用的 vendor 副本一并打包到 zip
- Lock-only 模式下，含 vendor 引用的 lock 不可独立分发——AgentMix 在导出时检测并强制 Bundle

### A.4 复现流程

应用一份 lock 时：
1. 对每个条目按 `source_type` 选择 resolver（git clone / vendor 拷贝 / archive 展开）
2. 取 `resolved_ref` 指定的版本，对 git 取 `subpath` 指定的子目录
3. 计算实际 `content_hash`，与 lock 比对
4. 不一致 → 报错"上游被篡改 / 路径错误 / vendor 损坏"，**不**继续应用

CI 中可以校验"lock 与实际安装是否匹配"以阻止漂移。

---

