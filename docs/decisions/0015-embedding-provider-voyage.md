# embedding provider 默认且仅用 Voyage AI，不暴露给用户选择

> 原决策 15（DESIGN.md v0.6 §13 附录）

Voyage AI 是当前 embedding 质量与价格综合最优的独立厂商（focus 在 embedding 而非附带产品），voyage-3 在短文本检索上召回率优于 OpenAI text-embedding-3-large 与 Anthropic 内嵌 embedding。MVP 阶段允许用户选 provider 会膨胀配置面板与适配代码——决策写死 Voyage 一家，简化用户认知与代码维护。LLM 任务（合并、health 评估、修复）可以接受用户配置 Anthropic / OpenAI / Voyage / 其他兼容 OpenAI Chat Completions API 的 provider，因为 LLM 是更通用的能力，用户更可能复用已有 key。
