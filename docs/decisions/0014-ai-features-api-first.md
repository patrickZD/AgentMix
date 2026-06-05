# AI 功能 v0.2 默认走 API（embedding 与 LLM），本地模型延后到 v0.3 opt-in

> 原决策 14（DESIGN.md v0.6 设计决策附录）

评估过本地 ONNX embedding 模型方案后，发现真实硬件代价远超预估：模型 80–120MB + ONNX Runtime 10MB → app 体积 +100MB（2–3 倍膨胀）；运行时 RAM +200–300MB（在 4GB 低配机器上显著）。加上"本地模型 + API 双路径"会违反"AI 依赖路径唯一"红线、增加维护负担。决策 v0.2 所有 AI 功能（embedding、LLM 评估、AI 一键修复、AI 合并）统一走云端 API，复用同一套 OS keychain 密钥管理。本地模型在 v0.3 作为 opt-in 提供给隐私敏感或离线用户。
