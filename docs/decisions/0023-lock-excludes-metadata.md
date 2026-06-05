# `.agentmix.lock` 不包含 license / description / 其他 SKILL.md 元数据

> 原决策 23（DESIGN.md v0.6 设计决策附录）

GPT 评审建议 lock 中加入 `license` 字段以便合规追踪。决策不加。理由：(1) license 已经在 SKILL.md frontmatter 自身（`license:` 是 spec 字段），lock 重复存储会造成"哪份是权威"的混淆；(2) lock 的职责是**复现**（resolve 来源 → 验证完整性），不是"元数据汇总"——后者属于 SKILL.md 解析层的事；(3) description / metadata 等字段同理，全部不进 lock。Lock schema 严格收敛到 7 字段（DESIGN.md §1.9），与 license / metadata 解耦。
