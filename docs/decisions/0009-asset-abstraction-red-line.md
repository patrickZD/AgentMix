# Asset 抽象作为架构红线

> 原决策 9（DESIGN.md v0.6 设计决策附录）

跨项目组合的痛点不止存在于 SKILL.md——slash commands、subagents、CLAUDE.md 片段、MCP 配置都有同样的"跨项目组合 + 冲突 + 部署"问题。如果 v0.1 隐含假设"被组合对象 = Skill"，未来扩展时整个 scan/compose/export 流水线都要重写。决策是：v0.1 起就引入 `Asset` 抽象（DESIGN.md §3.2），`Skill` 是其唯一具体实现，但代码层禁止直接耦合 `Skill`。这一抽象层 v0.1 必须立起，违反会导致大规模返工。
