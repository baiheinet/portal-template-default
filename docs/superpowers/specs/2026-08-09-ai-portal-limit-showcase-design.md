# NocoBase AI Portal 极限能力 Showcase 设计

## 目标

为客户演示构建一个单页“指挥舱”，直观展示 NocoBase AI Portal 不止能做 CRUD 和 Dashboard，还能组合 AI、自动化、权限、审批、文件/知识库、通知、集成和扩展能力。

页面使用稳定的本地演示数据，不依赖当前环境的数据模型或 LLM 配置。所有 AI 结果明确标记为 Demo，避免把模拟交互误认为真实后端执行。

## 体验方向

采用深色控制台视觉，以青绿色 AI 高亮作为主强调色，形成区别于普通后台的产品演示气质。桌面端使用高密度双栏布局；移动端降级为纵向信息流，保证主要操作和内容可访问。

页面按业务闭环组织，而非按技术名词堆叠：采集数据 -> AI 洞察 -> 自动化执行 -> 权限与审计 -> 可扩展生态。

## 页面结构

应用入口为 `/showcase`，并关闭 Registry 示例主路由，让客户进入应用时直接看到 Showcase。

1. Header：NocoBase AI Portal 标识、环境状态、Live demo、主题/用户入口。
2. Hero / Command Center：Build beyond CRUD 标题、能力概览、AI Copilot 输入区和快捷指令。
3. 能力指标：Collections、AI Employees、Automations、Connected Sources 四个指标。
4. 业务闭环：Revenue workspace CRUD 数据表与筛选/新增/批量操作；AI signal 展示记录摘要、风险标签和推荐动作。
5. 分析与自动化：趋势图、漏斗/分布图、自动化执行时间线和审批状态。
6. 平台能力矩阵：权限与审计、文件/知识库、通知、集成、表单/门户、Registry 扩展等能力卡片。
7. CTA：Explore architecture 和 Start with AI 操作，分别定位到能力矩阵和 Copilot。

## 交互行为

- KPI `Automations` 展开“风险评分 -> 通知销售 -> 创建跟进任务”的时间线。
- CRUD 表格在 `All / At risk / Won` 间筛选，AI signal 同步更新。
- Copilot 的 `Summarize pipeline`、`Find stalled deals`、`Draft follow-up` 快捷指令展示本地流式风格回复和记录标签。
- 记录行打开详情抽屉，展示字段、活动、附件、审批状态和审计轨迹。
- 权限卡片在 Admin、Sales、Finance 角色视角间切换可见范围和操作权限。
- 文件/知识库卡片展示上传文件、解析状态、知识命中和 AI 来源。
- 扩展卡片展示 API、Webhook、邮件、SSO、Registry extension 等组合边界。

## 实现边界

- 新建 `src/pages/showcase/index.tsx`，复用现有 `@/components/ui` 与 `lucide-react`。
- 在 `src/routes.tsx` 用懒加载注册 `/showcase`，并设置 `registryRoutesEnabled = false`。
- 不修改基础 UI 组件，不新增依赖，不请求真实 API，不创建后端数据模型。
- 业务演示数据、筛选状态、展开状态、Copilot 回复和角色切换均由页面本地状态驱动。
- 保持现有用户认证、Portal 运行时和开发 `/dev` 能力不受影响。

## 验证标准

- `pnpm build` 通过，路由和页面类型检查无错误。
- 桌面端能在首屏看到 Hero、指标和业务闭环；移动端不出现横向溢出。
- CRUD 筛选、Copilot 快捷指令、详情抽屉、自动化展开和角色切换均可操作。
- 页面明确呈现“Demo data”，不暗示本地模拟结果已经写入 NocoBase。
- 无新增生产依赖，未改动基础 UI 组件或无关现有功能。
