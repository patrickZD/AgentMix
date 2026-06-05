# AI 一键修复必须强制 diff 预览，永不自动应用

> 原决策 18（DESIGN.md v0.6 设计决策附录）

AI 生成的修复内容可能引入新问题或与原意图不符。决策所有 AI 修复经过强制 diff 预览（左原文 / 右修复版 / 行级高亮），用户三选：接受 / 拒绝 / 编辑后接受。这是 CLAUDE.md "Fail visibly, not silently" 红线在 AI 场景的具体落地——AI 是 augmentation，不是 autopilot。
