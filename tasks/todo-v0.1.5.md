# AgentMix v0.1.5 — TODO

任务详情见 `tasks/plan-v0.1.5.md`。每个任务含验收标准与验证命令；checkpoint 处人工复核后再继续。编号续接 v0.1（T1–T18 见 `tasks/todo.md`）。

## Phase 0：v0.1 收尾
- [ ] **T19** v0.1 遗留核验收口（DoD-1 / DoD-6 人工实测回填 CHANGELOG；WebDriver UI e2e 加固后重跑）— 依赖：无 — S

### Checkpoint F（T19）
- [ ] v0.1 账面清零：实测值回填，或不达标项有显式跟踪任务

## Phase 1：自动更新
- [ ] **T20** updater 后端（tauri-plugin-updater + process 引入【需确认】、签名密钥对、`check_for_update` 24h 缓存 / `install_update` 命令、纯逻辑入 agentmix-core 单测）— 依赖：无 — M
- [ ] **T21** 更新 UI（红点徽标、modal 三选项：立即更新 / 稍后 / 跳过此版本、设置开关默认开 + 手动检查、文案 en/zh 同步）— 依赖：T20 — M
- [ ] **T22** GitHub Actions release workflow（tag 触发、check:all 门禁、签名构建、上传 .msi/.exe/.sig/latest.json 为 draft；secrets 由用户配置）— 依赖：T20 — M

### Checkpoint G（T20–T22）— 更新闭环
- [ ] 本地人工走通：检测 → 红点 → modal → 下载 → 签名校验 → 安装 → 重启
- [ ] prerelease tag 跑通 CI 全链路
- [ ] 人工复核

## Phase 2：手动合并工作台
- [ ] **T23** 合并管线后端（MergedSkill 入 composition / conflict / export，content-backed FileOperation，DoD-3 口径单测，headless merged spec）— 依赖：无 — M
- [ ] **T24** MergeWorkbench UI（≥2 来源列 + 草稿区 + "→"拼接 + Rust 校验命令复用 + scripts 保留选择；Markdown 预览见开放问题 1）— 依赖：T23 — M–L
- [ ] **T25** 双入口接线（冲突第三按钮启用 + 通用"合并为新 Skill"入口 + merged 条目展示与移除恢复；删 mergeDeferred 占位）— 依赖：T24 — S–M

### Checkpoint H（T23–T25）— 合并 golden path
- [ ] 人工跑通：同名冲突 → 合并工作台 → 确认 → 冲突消除 → 导出 → 目标出现 merged skill 且内容与草稿一致
- [ ] 全部门禁绿（含 merged headless spec）
- [ ] 人工复核

## Phase 3：UX 与离线可用性
- [ ] **T26** alpha UX 三项（＋按钮常显；目标选择器最近路径 / 源项目快捷项 + 持久化；说明文案）— 依赖：无 — S–M
- [ ] **T27** 字体本地打包（Inter woff2 vendor + 去 Google Fonts CDN）→ CSP 收紧（csp 非 null + 全功能回归）— 依赖：无（排 T21/T24 后执行）— S

## Phase 4：i18n 完整化与发布
- [ ] **T28** i18n 完整化（zh.json 补齐至与 en 全等；lint-i18n-keys 收紧为 zh = en 双向校验）— 依赖：T21, T25, T26 — S
- [ ] **T29** v0.1.5 发布（版本 bump、CHANGELOG、README 边界更新【需确认】、tag 触发 CI 发布、真实安装包更新流实测）— 依赖：全部 — M

### Checkpoint I（发布前）
- [ ] 断网冷启动正常；CSP 无 violation；zh = en 全等；`pnpm check:all` 全绿
- [ ] 人工复核后执行 T29

## 开放问题（见 plan §开放问题）
1. 草稿区 Markdown 实时预览：默认纯文本 + 校验状态，预览并入 v0.2；接受则需修订 DESIGN.md §6.3【需确认】
2. PR CI：默认不做，仅 release workflow
3. Actions secrets（TAURI_SIGNING_PRIVATE_KEY 等）由用户配置
