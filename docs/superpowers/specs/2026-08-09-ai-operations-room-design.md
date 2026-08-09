# AI Operations Room 设计

## 目标

把现有 NocoBase AI Portal Showcase 从静态能力宣传页升级为一个可重复演示的 AI 业务执行闭环，证明 AI Portal 不只是 AI 辅助无代码，而是可以理解业务目标、生成执行计划、调用工具、暂停审批并留下审计结果。

第一期场景为“挽救高风险客户”：分析 Pipeline，读取客户资料和活动，生成跟进策略，对高价值客户触发审批，审批后创建跟进任务并准备通知。

## 产品定位

无代码模式让用户配置页面和流程；AI 辅助无代码让 AI 生成页面和流程；AI Operations Room 让用户直接描述业务目标，由 AI 在上下文、权限、审批和审计约束下完成多步骤任务。

第一期使用真实 AI 上下文契约和本地执行编排。执行器通过接口隔离，默认使用 `DemoMissionExecutor`，后续可以替换为 NocoBase API、AI Employee 和工作流实现，不重做页面状态模型。

## 页面结构

保留 `/showcase` 作为入口，在页面内提供 `Overview / Operations Room` 模式切换。

### Mission input

输入业务目标，默认示例为“挽救本月最可能流失的高价值客户”。显示 `Demo orchestration`，不把本地结果伪装成真实写入。

### AI plan

展示五步计划，并允许在执行前确认：

1. 查找高风险客户
2. 读取客户资料和最近活动
3. 为每个客户生成跟进策略
4. 金额超过 `$100k` 的客户请求审批
5. 审批后创建任务并准备通知

### Context panel

明确展示本次 AI 使用的页面上下文、4 条 Demo records、2 个 knowledge sources、Sales role 和权限范围。

### Tool execution stream

按事件流展示 Query、Knowledge search、Draft、Permission check、Approval 和 Create task 等工具调用。每一步可展开输入、输出、工具名、耗时、引用记录和权限判断。

### Approval checkpoint

高价值客户停在“需要销售总监审批”。用户可以批准、拒绝或查看依据。拒绝时后续写入步骤不执行，状态保留为 `blocked`。

### Outcome panel

展示已完成的任务、通知草稿、引用来源和完整审计轨迹。提供人工接管和重新执行入口。

## 状态机与交互

任务状态为 `idle`、`planning`、`ready`、`running`、`needs approval`、`completed`、`blocked` 和 `failed`。

步骤状态为 `queued`、`running`、`needs approval`、`completed`、`blocked` 和 `failed`。

- `Generate plan` 只生成计划，不执行写操作。
- `Approve plan` 开始执行并按步骤推进，体现事件流，而不是一次性切换结果。
- 点击步骤展开工具输入、输出、引用和权限判断。
- `Edit plan` 允许修改跟进策略或跳过非关键步骤；不能静默绕过 ACL、审批或写入确认。
- 审批批准后继续执行；拒绝后停止后续步骤并标记为 `blocked`。
- 工具失败时停止后续步骤，提供 `Retry`、`Skip` 和 `Take over` 操作。
- `Reset mission` 清除全部本地任务状态，便于客户重复演示。
- 没有匹配客户时显示可解释空状态，不伪造执行结果。

## 技术边界

- 在 `src/pages/showcase` 内拆分 Operations Room 的本地数据、状态和展示组件，保留现有 Overview 能力。
- 定义 `MissionExecutor` 接口，至少包含 `generatePlan`、`runStep`、`approve`、`reject` 和 `reset` 能力。
- 第一阶段由 `DemoMissionExecutor` 实现，所有结果仅在本地状态中存在。
- 复用 Registry 中已有的 AI Page Context、AI Employee Shortcut 和聊天上下文契约；不新建并行聊天运行时。
- 不新增依赖，不修改 `src/components/ui`，不绕过 NocoBase ACL。
- 不创建或修改后端 Collection；Demo data 和知识来源保持静态，真实接入作为后续执行器实现。
- 保留真实非 AI 入口：用户仍可直接查看 Pipeline、筛选记录和打开详情 Drawer。

## 错误、权限与安全

- 每个工具事件显示权限判定；被拒绝时使用 `blocked` 状态并说明原因。
- AI 输出不能直接绕过表单校验、审批、ACL 或写入确认。
- 错误事件不清除已经完成的审计轨迹；重试只从失败步骤继续。
- 所有演示结果带有 `Demo orchestration` 标识。
- 页面不展示 token、请求头、凭据或真实敏感数据。

## 验证标准

- `/showcase` 仍能进入 Overview，并可切换到 Operations Room。
- 输入目标后可生成计划；计划生成不会改变任务写入结果。
- 执行流能依次展示工具事件，并在高价值客户步骤暂停审批。
- 批准会继续到任务和通知结果；拒绝会阻止后续写入并显示审计原因。
- 错误状态可重试、跳过或人工接管；Reset 能恢复初始状态。
- 4 个 Demo records、2 个 knowledge sources、Sales role 和 Demo orchestration 在上下文区可见。
- 桌面与窄屏布局无横向溢出，计划、事件流和审批控件在移动端仍可操作。
- TypeScript、生产构建和 Showcase 回归检查通过。
- 现有未提交用户改动不被覆盖，基础 UI 组件不被修改。
