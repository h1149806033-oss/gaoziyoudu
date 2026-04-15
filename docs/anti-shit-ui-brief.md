## Target
反屎文检测器首页 / 主工作台

## Reference Sources
- Figma
- Spotify
- Editorial / tabloid-style product pages

## Borrowed Design Signals
- Figma：模块化布局、强识别色块、像贴纸一样的信息标签
- Spotify：大胆对比、态度鲜明、轻微“反正经”的娱乐气质
- Editorial：像一张讽刺小报，不像企业后台

## Adaptation Rules
- 页面必须先进入工具，不做营销 landing
- 第一屏就能输入标题、正文、图片
- 结果区要像“罪状板”，不是传统分析 dashboard
- 视觉上偏怪趣、搞怪、有点坏，但不能乱
- 使用高对比亮色：毒绿、番茄红、奶油黄、墨黑
- 不再使用小红书红作为主品牌色

## Do Not Change
- 保留“输入在左 / 结果在右”或可理解的工作流
- 结果必须可解释，不只是一句辱骂
- 输出必须包含标签、维度、问题、止损建议

## Recommended UI Changes
- 新品牌：`稿子有毒`
- 顶部做成实验室报头，而不是导航栏
- 主结果用大号指数 + 态度标签 + 罪状列表
- 输入区像案件录入台
- 维度评分做成“污染条”或“臭味条”
- 图片区做成“证据袋 / 物证板”

## Implementation Notes For Codex/Claude
- 优先重构 `frontend/src/pages/AntiShitLab.tsx`
- 让 `/` 和 `/app` 直接进入反屎文工具
- 清除前端可见的 `薯医 / NoteRx / Rx` 字样
- 保留当前纯规则引擎，先只改品牌和交互气质
