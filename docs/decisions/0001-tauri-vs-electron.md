# 为什么选择 Tauri 而非 Electron？

> 原决策 1（DESIGN.md v0.6 设计决策附录）

Tauri 2.0 的内存占用约为 Electron 的 1/10，且支持 macOS/Windows/Linux 三平台。对于一个主要做文件操作的工具，Rust 后端的性能优势明显。社区项目 SkillDuck [12] 已验证了 Tauri 在此场景的可行性，且 Tauri 的安全模型（显式权限声明）更适合处理用户文件系统。
