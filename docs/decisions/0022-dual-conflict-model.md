# 双冲突模型——ExportConflict vs RuntimeConflict 分开建模

> 原决策 22（DESIGN.md v0.6 §13 附录）

原设计把"用户在同一组合里勾了两个同名 Skill"和"导出后与目标工具已有 Skill 在运行时争名字"两类冲突压在同一个 name-based 检测里，混淆了文件系统级与运行时解析级两个完全不同的问题。决策拆分（DESIGN.md §6.2）：ExportConflict 按"(目标工具, scope, 目标路径, exported_name)"四元组检测，导出前必须解决；RuntimeConflict 按目标工具的 ToolAdapter 行为计算，作为警告级提示展示。这让冲突 UI 能精确告诉用户"为什么冲突、在哪冲突、怎么解决"。
