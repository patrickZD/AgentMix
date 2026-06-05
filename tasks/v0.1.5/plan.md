# AgentMix v0.1.5 开发任务拆分

## Context

v0.1.0 alpha 已于 2026-06-02 发布（`pnpm check:all` 全绿，安装包上 GitHub Releases）。下一阶段按 `docs/ROADMAP.md` Phase 1.5 执行：**alpha → beta 过渡**，让产品进入"长期使用可以接受"的状态。范围五块：

1. **自动更新机制**（§1.16，决策 17 / 19）：tauri-plugin-updater + GitHub Releases，CI 签名
2. **手动合并工作台**（§1.3，流程 3）：多列布局 + 实时校验 + frontmatter 重组，冲突入口 + 通用入口
3. **i18n 翻译完整化**（§1.17）：`zh.json` 与 `en.json` key 集合 100% 对齐，CI 强制校验收紧为全等
4. **alpha 反馈 UX 与离线可用性**：＋按钮常显、目标选择器快捷项与说明文案、字体本地打包去 CDN、CSP 收紧
5. **v0.1 遗留核验收口**：DoD-1 / DoD-6 人工实测回填、安全加固后 WebDriver UI e2e 重跑

仓库现状核实（2026-06-02）：

| 项 | 现状 |
|---|---|
| updater | `tauri-plugin-updater` 未引入；仓库无任何 CI workflow，v0.1 为本地构建手动上传 |
| 合并工作台 | v0.1 安全评审时整体移除，仅剩 `composition.mergeDeferred` 占位文案与 disabled 按钮 |
| i18n | en 140 key / zh 135 key；`lint:i18n:keys` 现行契约是 zh ⊆ en |
| 字体 / CSP | `src/index.css:1` 引 Google Fonts CDN；`tauri.conf.json` `csp: null` |
| v0.1 挂账 | CHANGELOG：DoD-1 / DoD-6 "待手动实测"；WebDriver e2e 加固后未重跑 |

## 已确认决策

1. **发布管道**：搭 GitHub Actions release workflow（按决策 17：CI 签名，私钥存 Actions secret，secret 由用户在 repo settings 配置，私钥不入库）。
2. **合并工作台入口**：冲突解决第三按钮 + 组合清单通用"合并为新 Skill"入口都做（完整对齐决策 5）。
3. **计划文件**：v0.1 的计划保留为历史记录（现位于 `tasks/v0.1.0/`）；本阶段计划位于 `tasks/v0.1.5/`，任务编号从 T19 续排（CHANGELOG 已引用 T18，避免编号歧义）。（v0.2.0 起统一改为按版本分目录 `tasks/<version>/{spec,plan,todo}.md`，本文件已随迁移。）
4. **新增依赖**（按禁止清单需用户确认后引入，沿用 T13 zip crate 先确认惯例）：Rust crate `tauri-plugin-updater`、`tauri-plugin-process`（重启用）。**零新 npm 依赖**——updater 走 Rust 命令 + typed invoke（沿用 T8 惯例）。Inter 字体文件为静态资产（OFL 许可证文件随附），不算依赖。

## 架构红线

继承 v0.1 全部红线（asset-purity / no-direct-write / ExportPlan 单一数据源 / 预览→确认→执行 / i18n `t(key)` / 备份隔离 / Skill 校验不放宽），本阶段新增三条：

| 红线 | 含义 | 守护手段 |
|---|---|---|
| MergedSkill 走统一管线 | 合并工作台产物必须经 Composition → ExportPlan → `ExportCoordinator.execute` 落盘，工作台禁止直接写文件 | `lint:no-direct-write` + T23 集成测试 |
| i18n key 全等 | `lint:i18n:keys` 从 zh ⊆ en 收紧为 zh = en，任一方缺 key 即 fail（§1.17 v0.1.5 红线） | T28 改造后的 lint 脚本 |
| 更新签名不降级 | 签名校验失败即终止更新，不允许安装未签名 / 校验失败的包 | Tauri Updater 内置 + T20 验收 |

## 依赖图

```
T19 v0.1 遗留核验收口                          （独立，可先行）

T20 updater 后端（密钥 + 插件 + 命令 + 24h 缓存）
   ├─ T21 更新 UI（红点徽标 / modal 三选项 / 设置开关）
   └─ T22 GitHub Actions release workflow（签名 + latest.json）

T23 合并管线后端（MergedSkill 入 composition/conflict/export + 单测 + headless e2e）
   └─ T24 MergeWorkbench UI（多列 + 拼接 + 实时校验 + scripts 选择）
         └─ T25 双入口接线 + 组合清单 merged 条目

T26 alpha UX 三项（＋常显 / 目标快捷项 / 说明文案）   （独立）
T27 字体本地化 → CSP 收紧                            （独立，任务内串行）

T28 i18n 完整化 + lint 收紧为全等      ← 依赖 T21 / T25 / T26（全部新 UI 文案落定）
T29 v0.1.5 发布                        ← 依赖全部
```

T20 与 T23 是两条独立主线，可并行推进；高风险项（CI 签名流水线、content-backed 导出）刻意排前。

---

## Phase 0：v0.1 收尾

### T19 — v0.1 遗留核验收口
**描述：** 收掉 CHANGELOG 挂账三项：(1) DoD-6 冷启动到欢迎屏可交互 < 2s，在 Release 安装包上人工计时；(2) DoD-1 golden path 全流程 < 60s，人工走完扫描→组合→预览→导出并计时；(3) WebDriver UI e2e（`pnpm test:e2e`）在安全加固后的 main 上重跑。实测值回填 CHANGELOG §性能核验表。
**验收标准：**
- [ ] CHANGELOG 中不再有"待手动实测"；DoD-1 / DoD-6 有具体实测值
- [ ] 两条 WebDriver spec 在当前 main 通过，结果记录在 CHANGELOG 测试小节
**验证：** `pnpm test:e2e` 输出；人工计时记录。若实测不达标，按"显式暴露故障"记录并开列修复任务，不以推测值充数。
**依赖：** 无
**文件：** `docs/CHANGELOG.md`、`e2e/`（仅在 spec 失败需修时触碰）
**规模：** S（人工为主）

### Checkpoint F（T19）
- [ ] v0.1 账面清零：实测值回填，或不达标项有显式跟踪任务

---

## Phase 1：自动更新

### T20 — updater 后端：密钥、插件、检查与安装命令
**描述：** 引入 `tauri-plugin-updater` + `tauri-plugin-process`（需用户确认）；`tauri signer generate` 生成签名密钥对——公钥写入 `tauri.conf.json`，私钥由用户保管并配置为 Actions secret；bundle 开启 `createUpdaterArtifacts`；endpoint 指向 GitHub Releases 的 `latest.json`。Rust 命令两个：`check_for_update`（比对当前版本与最新 release tag；结果与时间戳缓存到 `~/.agentmix/`，命名阈值 `UPDATE_CHECK_CACHE_TTL_HOURS = 24`；网络失败 / 超时静默返回 no-update，下次启动重试）、`install_update`(下载 → 签名校验 → 原子替换 → 重启)。版本比较与缓存判定等纯逻辑放 tauri-free 的 `agentmix-core`，headless 可单测。
**验收标准：**
- [ ] 无网络时 `check_for_update` 静默返回，UI 无错误弹窗
- [ ] 24h 内重复调用命中缓存不发请求（单测覆盖缓存与版本比较分支）
- [ ] 本地双 target（msi / nsis）构建产物含 `.sig`；签名校验失败时更新终止
**验证：** `cargo test`（缓存 / 版本比较单测）；本地构建产物目检 `.sig`；断网启动人工验证。
**依赖：** 无
**文件：** `src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`src-tauri/src/lib.rs`、`src-tauri/capabilities/`、`src-tauri/crates/agentmix-core/src/`（新增 update 纯逻辑模块）
**规模：** M

### T21 — 更新 UI：红点徽标、modal、设置开关
**描述：** 按 §1.16 检测流程落 UI：(1) 有新版本时 TitleBar 设置 / 帮助图标显示红点徽标；(2) 点击徽标 → modal 展示 changelog（release body）+ 三选项：立即更新 / 稍后 / 跳过此版本；(3) "跳过此版本"本地持久化（沿用语言持久化机制），同版本不再提示，"稍后"下次启动再提示；(4) 设置面板"自动检查更新"开关默认开启，关闭后仍可手动点"检查更新"；(5) 立即更新时展示下载进度与重启提示。所有文案走 `t(key)`，en / zh 同步新增。
**验收标准：**
- [ ] 三选项行为正确；开关关闭后启动不检查、手动检查可用
- [ ] Vitest 覆盖 store 分支：红点显隐、跳过版本、开关门禁
**验证：** `pnpm test`；`pnpm tauri dev` 人工走更新提示流（可用 mock release 数据）。
**依赖：** T20
**文件：** `src/components/TitleBar.tsx`、设置 modal 所在组件、`src/stores/uiStore.ts`、`src/lib/`（updater invoke seam）、`src/i18n/en.json`、`src/i18n/zh.json`
**规模：** M

### T22 — GitHub Actions release workflow
**描述：** 新建 `.github/workflows/release.yml`：tag `v*` 触发，windows-latest runner，pnpm install → `pnpm check:all` 门禁 → `pnpm tauri build`（签名走 `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets）→ 上传 `.msi` / `.exe` / `.sig` / `latest.json` 到 GitHub Release（draft 状态，人工核验后 publish）。仅做 release workflow，PR CI 不在本阶段范围（见开放问题 2）。
**验收标准：**
- [ ] 用临时 prerelease tag 实跑一次：Release draft 含全部 4 类资产，`latest.json` 的版本号 / 签名 / 下载 URL 正确
- [ ] 私钥不出现在仓库与日志中
**验证：** prerelease tag 触发的 Actions run 全绿；资产人工目检；验证后删除临时 release / tag。
**依赖：** T20（密钥与 updater 产物配置先就位）
**文件：** `.github/workflows/release.yml`
**规模：** M（CI 调试有长尾，预留迭代轮次）

### Checkpoint G（T20–T22）— 更新闭环
- [ ] 本地构建上人工走通完整更新流：检测 → 红点 → modal → 下载 → 签名校验 → 安装 → 重启
- [ ] prerelease tag 跑通 CI 全链路
- [ ] 人工复核

---

## Phase 2：手动合并工作台

### T23 — 合并管线后端：MergedSkill 进入 composition / conflict / export
**描述：** 按 §3.2 `MergedSkill`（v0.1.5 仅 `mergeMode: 'manual'`）打通后端管线：Composition 携带 merged skills → composer 把 merged 名纳入大小写不敏感唯一性检测 → exporter 为 merged skill 产出 **content-backed** `FileOperation`（`SKILL.md` 从草稿字符串写出，而非复制源目录；用户选择保留某来源 `scripts/` 时从该来源目录复制）→ `execute` 消费同一 plan 落盘。设计要点：现有 `FileOperation.sourcePath` 模型扩展为支持内容源（如 `source: Path | Content` 枚举），plan 与 execute 的字节口径保持一致（DoD-3 语义对 merged 同样成立）；保留的 scripts 沿用 execute 前重扫源目录的安全预检语义。
**验收标准：**
- [ ] Rust 单测：merged skill 导出后目标 `SKILL.md` 与草稿逐字节一致；merged 名与已选 Skill 同名触发 ExportConflict；plan 与 execute 字节一致；带保留 scripts 的 merged 经安全预检
- [ ] `e2e_pipeline.rs` 新增 merged 路径 headless spec（冲突 → 合并 → 导出 → 断言目标目录）
- [ ] `lint:asset-purity` / `lint:no-direct-write` 仍 0 命中
**验证：** `cargo test`；`pnpm lint:asset-purity && pnpm lint:no-direct-write`；`pnpm gen:types` 后 `pnpm type-check` 无漂移。
**依赖：** 无（与 T20 并行）
**文件：** `src-tauri/crates/agentmix-core/src/composer.rs`、`exporter.rs`、`src-tauri/crates/agentmix-types/src/lib.rs`、`src-tauri/src/lib.rs`（命令）、`src-tauri/crates/agentmix-core/tests/e2e_pipeline.rs`、`src/types/generated.ts`（生成）
**规模：** M

### T24 — MergeWorkbench UI：多列对比 + 草稿区 + 实时校验
**描述：** 重建 `MergeWorkbench/` 组件（v0.1 删除的 Pixso 初稿不整包复用，按规范拆分接入 i18n / Zustand / 生成类型）：≥2 个来源列横排展示 SKILL.md 全文 + 右侧草稿编辑区；来源段落旁"→"按钮追加到草稿，亦可直接手写；底部 frontmatter 实时校验——name 格式 / 64 字符上限 / 与组合内现有名大小写不敏感唯一、description ≤ 1024、YAML 可解析，校验调 Rust 命令复用 parser / health 单一逻辑，前端不重写第二套规则；scripts 处理按 §1.3：列出各来源 `scripts/` 清单，单选保留某一来源或不保留；确认后 MergedSkill 写入 compositionStore。草稿区编辑器：v0.1.5 不引入 CodeMirror（DESIGN 排期 v0.2），用受控 textarea；"实时 Markdown 预览"如需新增渲染依赖见开放问题 1，未决前交付纯文本草稿 + 校验状态。建议 2 个 checkpoint commit：(1) 布局 + 拼接 + 草稿 store；(2) 校验命令接线 + scripts 选择 + 确认入组合。
**验收标准：**
- [ ] 校验存在 error 时"确认"禁用；name 与组合内现有名冲突时给出明确提示
- [ ] 拼接与手写两种编辑路径均可产出合法草稿
- [ ] Vitest 覆盖草稿 store 与校验门禁分支
**验证：** `pnpm test`；`pnpm lint:i18n`；`pnpm tauri dev` 人工操作工作台。
**依赖：** T23
**文件：** `src/components/MergeWorkbench/`（新建）、`src/stores/compositionStore.ts`、`src/lib/`（merge 校验 invoke seam）、`src/i18n/en.json`、`src/i18n/zh.json`
**规模：** M–L（两个 checkpoint commit 拆解推进）

### T25 — 双入口接线 + 组合清单 merged 条目
**描述：** (1) 冲突解决第三按钮"合并工作台"启用，替换 v0.1 的 disabled 占位与 `mergeDeferred` 文案；(2) 组合清单通用入口"合并为新 Skill"，选中 ≥2 个 Skill 时可用（决策 5，不限同名）；(3) merged 条目在组合清单展示：isMerged 标注、来源 Skill 列表、可移除；移除 merged 条目后原冲突状态正确恢复。
**验收标准：**
- [ ] 冲突经合并解决后该冲突消除、导出门禁解禁
- [ ] 通用入口与冲突入口产出的 MergedSkill 行为一致（同一工作台、同一校验）
- [ ] Vitest 覆盖入口可用性与移除恢复分支
**验证：** `pnpm test`；`pnpm tauri dev` 人工验证两条入口。
**依赖：** T24
**文件：** `src/components/ComboListPanel.tsx`、`src/stores/compositionStore.ts`、`src/i18n/en.json`、`src/i18n/zh.json`
**规模：** S–M

### Checkpoint H（T23–T25）— 合并 golden path
- [ ] 人工跑通：勾选两个同名 Skill → ExportConflict → 进入合并工作台 → 编辑草稿 → 确认 → 冲突消除 → Dry-run 预览 → 导出 → 目标 `.claude/skills/` 出现 merged skill 目录且内容与草稿一致
- [ ] 全部门禁绿（含新增 headless merged spec）
- [ ] 人工复核

---

## Phase 3：UX 与离线可用性

### T26 — alpha UX 三项
**描述：** (1) SkillItem 的加入组合"＋"按钮从 hover 显形改为常显；(2) ExportPanel 目标项目选择器加快捷项——"最近用过的目标路径"（持久化，上限命名常量 `RECENT_TARGET_PATHS_MAX`，路径按规范化形式去重）与"已导入的源项目"；(3) 目标选择器加一行说明文案（"目标项目 = 把 Skill 装到哪个项目供 Claude Code 使用"）。
**验收标准：**
- [ ] 快捷项点击即设置 targetPath 并清除过期预览（沿用 T12 语义）；最近列表跨重启保留
- [ ] Vitest 覆盖最近列表逻辑：去重 / 上限 / 规范化路径比较
**验证：** `pnpm test`；`pnpm tauri dev` 人工目检。
**依赖：** 无
**文件：** `src/components/SkillItem.tsx`、`src/components/ExportPanel.tsx`、`src/stores/exportStore.ts`、`src/i18n/en.json`、`src/i18n/zh.json`
**规模：** S–M

### T27 — 字体本地打包 + CSP 收紧
**描述：** 任务内两步串行（各一 checkpoint commit）：(1) vendor Inter woff2（当前引用的 300–700 五档）到 `src/assets/fonts/`，附 OFL 许可证文件，`@font-face` 替换 `src/index.css:1` 的 Google Fonts `@import`；(2) `tauri.conf.json` 的 `csp` 从 `null` 收紧——基线 `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:` 加上 Tauri 2 IPC 所需的 `connect-src`（以实际调通为准，原则是最小放行），收紧后全功能回归（扫描 / 冲突 / 合并 / 预览 / 导出 / 更新检查；updater 网络请求走 Rust reqwest，不受 webview CSP 影响）。
**验收标准：**
- [ ] 断网冷启动字体渲染正常，无系统字体回退闪变
- [ ] 构建产物 grep 无 `fonts.googleapis` 引用
- [ ] CSP 生效下 DevTools 无 CSP violation，全功能回归通过
**验证：** `pnpm build` 后 grep dist；断网 `pnpm tauri dev` + Release 构建人工回归。
**依赖：** 无（排在 T21 / T24 之后执行，回归覆盖面更全）
**文件：** `src/index.css`、`src/assets/fonts/`（新建）、`src-tauri/tauri.conf.json`
**规模：** S

---

## Phase 4：i18n 完整化与发布

### T28 — i18n 翻译完整化 + lint 收紧为全等
**描述：** `zh.json` 补齐至与 `en.json` key 集合全等（现差 5 个 + 本阶段 T21 / T24 / T25 / T26 新增的 key）；`scripts/lint-i18n-keys.mjs` 契约从"zh ⊆ en"改为"zh = en"，双向缺失皆 fail，同步更新脚本头部契约注释；人工过一遍本阶段新增 key 的中文翻译质量。
**验收标准：**
- [ ] `pnpm lint:i18n:keys` 输出 key 数全等
- [ ] 故意删除一个 zh key 时 lint fail（验证守卫真实生效后恢复）
**验证：** `pnpm lint:i18n:keys`；删 key 反向验证。
**依赖：** T21、T25、T26（全部新 UI 文案落定）
**文件：** `src/i18n/zh.json`、`scripts/lint-i18n-keys.mjs`
**规模：** S

### T29 — v0.1.5 发布
**描述：** 版本号 bump（`package.json` / `tauri.conf.json` / `src-tauri/Cargo.toml`）；CHANGELOG 0.1.5 条目（新增 / 变更 / 已知限制；注明 0.1.0 → 0.1.5 需手动升级、0.1.5 起自动更新生效；SHA-256 校验值表由 CI 资产回填）；README 边界更新——合并工作台与自动更新已可用（README 修改前需用户确认）；实现与 DESIGN.md 有偏离处先改文档再合入（DESIGN.md 修改前需用户确认）；推 `v0.1.5` tag 走 T22 流水线产 Release draft → 人工核验资产与 `latest.json` → publish；发布后用 0.1.5 安装包对一个临时 prerelease 人工验证完整更新流，验证后删除临时 release。
**验收标准：**
- [ ] `pnpm check:all` 全绿（含收紧后的 `lint:i18n:keys` 与新增 merged headless spec）
- [ ] Release 资产 4 类齐全（`.msi` / `.exe` / `.sig` / `latest.json`），SHA-256 回填 CHANGELOG
- [ ] 自动更新流在真实安装包上人工验证通过，结果记录 CHANGELOG
**验证：** CI run 全绿；资产目检；更新流人工实测。
**依赖：** 全部
**文件：** `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`、`docs/CHANGELOG.md`、`README.md`（需确认）
**规模：** M

### Checkpoint I（T26–T29 前置核验）
- [ ] 断网冷启动渲染正常；CSP 无 violation
- [ ] zh = en key 全等，CI 强制
- [ ] `pnpm check:all` 全绿
- [ ] 人工复核后执行 T29 发布

---

## 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| tauri-plugin-updater 对 msi / nsis 双 target 行为差异（静默安装、替换语义） | 中 | T20 本地双 target 实测定行为；若某 target 受限，在 CHANGELOG 显式记录支持范围，不静默 |
| content-backed FileOperation 扩展破坏 DoD-3 plan/execute 一致性口径 | 高 | T23 单测先行：merged 路径的字节一致性与普通路径同口径断言 |
| GitHub Releases API 匿名 rate limit（60 次/小时/IP） | 低 | 24h 缓存 + 失败静默重试 |
| CSP 收紧破坏 Radix inline style / Tauri IPC | 中 | 保留 `style-src 'unsafe-inline'`；dev 与 Release 构建分别回归 |
| CI Windows 构建链路长尾（Rust 缓存、签名 env、产物路径） | 中 | T22 用 prerelease tag 迭代调试，不阻塞主干合入 |
| v0.1.0 存量用户无 updater，无法自动升到 0.1.5 | 低 | Release notes 与 README 明示最后一次手动升级 |

## 开放问题

1. **草稿区"实时 Markdown 预览"**（§1.3 一句话要求）：纯渲染需引入 markdown 渲染依赖（如 `react-markdown`，新 npm 依赖需确认）。默认方案：v0.1.5 交付纯文本草稿 + frontmatter 校验状态，预览能力并入 v0.2 Skill 编辑器（CodeMirror）一起做；若接受此偏离需同步修订 DESIGN.md §1.3（修改前确认）。
2. **PR CI**（push / PR 跑 `check:all`）：DESIGN v0.1.5 未要求，默认不做，仅交付 release workflow。如要顺带落地请明示。
3. **Actions secrets 配置**：`TAURI_SIGNING_PRIVATE_KEY`（及密码）需由用户在 repo settings 配置；密钥对在 T20 生成后移交。

## v0.1.5 验收标准（阶段 DoD）

1. v0.1 挂账清零：DoD-1 / DoD-6 实测回填，WebDriver e2e 重跑通过（或不达标项有显式跟踪）
2. 自动更新闭环人工验证：检测 → 下载 → 签名校验 → 安装 → 重启
3. 合并 golden path 通过：冲突 → 工作台 → 导出，headless spec + 人工各一遍
4. `zh.json` = `en.json` key 全等，lint 强制
5. 断网冷启动 UI 字体正常，构建产物无 CDN 引用
6. `csp` 非 null 且全功能回归通过
7. `pnpm check:all` 全绿（含本阶段新增守卫与 spec）
8. GitHub Release 由 CI 产出，资产含 `.sig` + `latest.json` + SHA-256

## 明确不做（范围外，v0.2+）

多目标导出、AI 全家桶（合并 / 健康检查 / 一键修复）、OS keychain、`.agentmix.lock`、Source Tracking、Git URL 导入、语义聚类、Skill 脚手架、跨工具兼容性预检、引用关系检测、Skill 编辑器（CodeMirror）、安全规则误报白名单、macOS / Linux、原生菜单栏。
