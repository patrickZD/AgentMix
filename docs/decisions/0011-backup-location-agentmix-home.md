# 备份位置统一在 `~/.agentmix/backups/`

> 原决策 11（DESIGN.md v0.6 设计决策附录）

design-doc v0.4 写"导出前自动将目标路径打包为 `.agentmix-backup-{timestamp}.zip`"——zip 落在目标项目目录内，对 git 工作树用户是隐患（容易误 commit、污染 diff、撑大仓库）。决策将所有备份统一写入 `~/.agentmix/backups/<project-hash>/`，与目标项目目录解耦，UI 提供"打开备份目录"按钮便于查找。
