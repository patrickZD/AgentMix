# ExportPlan 作为 Dry-run 红线的数据落地

> 原决策 21（DESIGN.md v0.6 §13 附录）

Dry-run "preview → confirmation → execution" 红线如果用两条独立代码路径实现（一条算预览数据，一条真正修改文件），极容易出现两者不一致——预览说会写 12 个文件，真改时改了 13 个。决策引入 `ExportPlan` 数据模型（DESIGN.md §8.2）：所有破坏性操作产生同一个 `ExportPlan` 对象，Dry-run UI 渲染它、execution 消费它。"一份计划，两阶段使用"，从结构上排除不一致可能。
