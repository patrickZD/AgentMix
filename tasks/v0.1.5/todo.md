# AgentMix v0.1.5 — TODO

任务详情见同目录 `plan.md`。每个任务含验收标准与验证命令；checkpoint 处人工复核后再继续。编号续接 v0.1（T1–T18 见 `tasks/v0.1.0/todo.md`）。

## Phase 0：v0.1 收尾
- [x] **T19** v0.1 遗留核验收口（DoD-1 / DoD-6 人工实测回填 CHANGELOG【待用户实测报数】；WebDriver UI e2e 加固后重跑 ✔ 2026-06-02 2 spec 全过，已回填 CHANGELOG）— 依赖：无 — S

### Checkpoint F（T19）
- [x] v0.1 账面清零：实测值回填，或不达标项有显式跟踪任务

## Phase 1：自动更新
- [x] **T20** updater 后端（tauri-plugin-updater 引入、签名密钥对（私钥 ~/.tauri/agentmix.key，未入库）、`check_for_update` 24h 缓存 / `install_update` 命令、纯逻辑入 agentmix-core 15 单测；tauri-plugin-process 不需要——Rust 侧 `AppHandle::restart()` 是 core API；双 target `.sig` 本地构建验证 ✔）— 依赖：无 — M
- [x] **T21** 更新 UI（红点徽标（落在专属更新图标上）、modal 三选项、设置开关默认开 + 手动检查、文案 en/zh 同步、updateStore 14 Vitest）— 依赖：T20 — M
- [x] **T22** GitHub Actions release workflow（v0.1.5-rc.1 实跑全绿：draft 含 5 类资产、latest.json 签名/URL 正确、日志无私钥、SHA-256 已输出；临时 release/tag 已删；补了 annotated-tag re-fetch 修复 notes 来源）— 依赖：T20 — M

### Checkpoint G（T20–T22）— 更新闭环
- [x] 本地人工走通：检测 → 红点 → modal → 下载 → 签名校验 → 安装 → 重启（2026-06-03，从本地 0.1.4 测试包升到已发布 v0.1.5）
- [x] prerelease tag 跑通 CI 全链路（v0.1.5-rc.1 干跑全绿；v0.1.5 正式 tag 已触发并发布）
- [x] 人工复核

## Phase 2：手动合并工作台
- [x] **T23** 合并管线后端（FileSource path|content 枚举、ExportItemSource directory|content、DoD-3 字节口径 5 新单测、headless merged spec；composer 与命令层无需改动）— 依赖：无 — M
- [x] **T24** MergeWorkbench UI（≥2 来源列 + 草稿 textarea + "→"拼接 + validate_merge_draft 命令复用 parser/health/safe-segment（8 Rust 单测）+ scripts 单选；纯文本草稿，Markdown 预览按开放问题 1 默认并入 v0.2）— 依赖：T23 — M–L
- [x] **T25** 双入口接线（冲突第三按钮启用 + 选择模式"合并为新 Skill"入口 + merged 条目展示与移除恢复；mergeDeferred 占位已删）— 依赖：T24 — S–M

### Checkpoint H（T23–T25）— 合并 golden path
- [x] 人工跑通：同名冲突 → 合并工作台 → 确认 → 冲突消除 → 导出 → 目标出现 merged skill 且内容与草稿一致
- [x] 全部门禁绿（含 merged headless spec）
- [x] 人工复核

## Phase 3：UX 与离线可用性
- [x] **T26** alpha UX 三项（＋按钮常显；最近路径（RECENT_TARGET_PATHS_MAX=5，规范化去重持久化）/ 源项目快捷项；说明文案）— 依赖：无 — S–M
- [x] **T27** 字体本地打包（Inter v20 变量字体 7 子集 + OFL，dist 无 CDN 引用）→ CSP 收紧（csp 非 null + devCsp；WebDriver e2e 2 spec 回归通过；断网冷启动 + DevTools violation 目检留 Checkpoint I）— 依赖：无 — S

## Phase 4：i18n 完整化与发布
- [x] **T28** i18n 完整化（zh = en 176 key 全等；lint-i18n-keys 双向校验，删 key 反向验证通过）— 依赖：T21, T25, T26 — S
- [x] **T29** v0.1.5 发布（版本 bump、CHANGELOG、README 边界更新、tag 触发 CI 发布、真实安装包更新流实测）— 依赖：全部 — M

### Checkpoint I（发布前）
- [x] 断网冷启动正常；CSP 无 violation；zh = en 全等；`pnpm check:all` 全绿
- [x] 人工复核后执行 T29

## 开放问题（见 plan §开放问题）
1. 草稿区 Markdown 实时预览：默认纯文本 + 校验状态，预览并入 v0.2；接受则需修订 DESIGN.md §1.3【需确认】
2. PR CI：默认不做，仅 release workflow
3. Actions secrets（TAURI_SIGNING_PRIVATE_KEY 等）由用户配置
