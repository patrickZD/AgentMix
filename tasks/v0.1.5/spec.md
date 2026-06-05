# Spec: AgentMix v0.1.5 — Beta 过渡

> 回溯整理（backfilled 2026-06-03）。本文在 v0.2.0 引入 spec 分层后补写，记录 v0.1.5 已发布（as-shipped）的目标与范围，来源为 `docs/CHANGELOG.md` [0.1.5]、同目录 `plan.md` 的"v0.1.5 验收标准"、`docs/ROADMAP.md` Phase 1.5。用于结构统一与历史归档，非开发前契约。

## 目标

alpha 转 beta 过渡，让产品进入"长期使用可以接受"的状态：补上 alpha 阶段最痛的 UX 短板与离线可用性，并引入自动更新与手动合并工作台，消除"首版用户卡死"风险。

## 范围

v0.1.5 实际交付 5 块：

1. **自动更新机制**：GitHub Releases + Tauri Updater，CI 签名；24h 缓存、无网静默跳过、签名校验失败即终止。
2. **手动合并工作台**：多列并排 + 草稿拼接或手写 + 实时 frontmatter 校验 + scripts 来源单选；冲突入口与通用"合并为新 Skill"入口。
3. **i18n 翻译完整化**：zh.json 与 en.json key 全等，CI 强制校验。
4. **alpha 反馈 UX 与离线可用性**：＋按钮常显、目标选择器快捷项与说明文案、Inter 字体本地打包去 CDN、CSP 收紧。
5. **v0.1 遗留核验收口**：DoD-1 / DoD-6 人工实测回填、安全加固后 WebDriver UI e2e 重跑。

明确不在 v0.1.5：AI 全家桶、多目标导出、`.agentmix.lock`、Git URL 导入、Skill 编辑器、Source Tracking。

## 验收标准（DoD）

8 项阶段 DoD 全部达成，详见同目录 `plan.md` 的验收标准小节，核心：

- 自动更新闭环人工验证（检测 → 下载 → 签名校验 → 安装 → 重启）
- 合并 golden path 通过（冲突 → 工作台 → 导出，headless spec 与人工各一遍）
- zh 与 en key 全等，lint 强制
- 断网冷启动字体正常，构建产物无 CDN 引用；`csp` 非 null 且全功能回归通过
- `pnpm check:all` 全绿；GitHub Release 由 CI 产出，资产含 `.sig`、`latest.json`、SHA-256

达成情况见 `docs/CHANGELOG.md` [0.1.5] 测试小节。

## 工程约定

Commands / 目录结构 / 代码风格 / 测试策略以 `CLAUDE.md` §3–§5 为准。

## 关联

- 计划 / 任务：同目录 `plan.md` / `todo.md`（T19–T29）
- 发布记录：`docs/CHANGELOG.md` [0.1.5]
- 路线图定位：`docs/ROADMAP.md` Phase 1.5
