# 自动更新通道——GitHub Releases + Tauri Updater，随 v0.1.5 交付

> 原决策 17（DESIGN.md v0.6 设计决策附录）

桌面应用的首版发布是不可逆事件——首版不带更新机制，用户装完即被困在首版。但在 v0.1 范围进一步收窄到 alpha 后，自动更新被推迟到 v0.1.5 交付（详见 [决策 19](0019-v0.1-alpha-auto-update-deferred.md)）。本决策仅锁定**通道选型**：`tauri-plugin-updater` + GitHub Releases，开源项目零额外基础设施成本；Release 签名密钥在 CI secret 中管理，公钥嵌入 App；默认开启检查更新（24 小时缓存），用户可在设置中关闭以尊重 air-gapped 场景。v0.1 alpha 阶段通过 GitHub Releases 静态分发，用户手动升级。

> **更新 2026-06-07**：启动检查改为每次启动联网（及时性优先），新版本下次启动即提示。endpoint 是 release 资产 `latest.json` 而非 GitHub API，无 rate limit 顾虑，故不再用 24h 缓存压制启动检查；缓存保留为上次结果与检查时间的本地记录。设置中的关闭开关不变。
