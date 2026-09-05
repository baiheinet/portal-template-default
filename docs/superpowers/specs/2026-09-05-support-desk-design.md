# 客服工单系统（Support Desk）设计

日期：2026-09-05
状态：已确认（用户批准）

## 背景与目标

4 人客服团队目前用共享邮箱处理客户问题，存在漏单、无人认领、紧急问题拖延、责任不清的问题。在现有 NocoBase AI Portal（本仓库为 Portal 源码模板 `@nocobase/portal-template-default`）内构建一套工单系统：

- 客户登录门户后自助提交问题，并只读地查看自己问题的处理进度
- 新工单自动轮询分配给 4 名客服之一
- 客服持续更新处理进度（回复/内部备注/状态推进），直到解决关闭
- 站内提醒：紧急未响应、快超时、超时、久未跟进的工单进入"需要关注"清单，侧边栏角标计数
- 总览页：未处理总数、超时情况、最近解决数、每人手头单量

## 非目标（明确不做）

- 邮件自动接入（共享邮箱不自动转工单）
- 邮件通知（提醒全部站内）
- 客户在线回复、客户重开工单
- 知识库、客服绩效报表

## 角色与权限（NocoBase ACL）

| 角色 | 能力 |
|---|---|
| `customer` | 创建工单（仅标题/描述/紧急度/联系邮箱字段）；仅读取自己的工单及其 `public` 沟通记录（数据范围 `ticket.customer.user = 当前用户`） |
| `support` | 工单与沟通记录全量读写：回复、内部备注、改紧急度、改派、状态推进、关闭 |
| 管理员 | 同 `support`，另可维护客服名单、SLA 规则 |

路由级约束使用 `access.roles`：`/support/**` 允许 `customer + support`；`/helpdesk/**` 仅 `support`。服务端 ACL 始终是最终依据。

## 数据模型（主数据源，5 个集合）

### customers 客户

| 字段 | 类型 | 说明 |
|---|---|---|
| user | M2O users，唯一 | 客户登录身份绑定 |
| company | string | 公司名称 |
| contactName / contactEmail / contactPhone | string | 联系信息 |
| note | text | 备注 |

### support_agents 客服人员

| 字段 | 类型 | 说明 |
|---|---|---|
| user | M2O users，唯一 | 客服账号（4 行） |
| name | string | 显示名 |
| order | integer | 轮询顺序号 |
| onDuty | boolean | 在岗状态（false 跳过轮询） |

### support_tickets 工单

| 字段 | 类型 | 说明 |
|---|---|---|
| ticketNo | integer，自增序列 | 工单编号 |
| title | string，必填 | 标题 |
| description | text，必填 | 问题描述 |
| status | select | pending 待响应 / processing 处理中 / resolved 已解决 / closed 已关闭 |
| priority | select | normal 普通 / urgent 紧急（客户提交可选，客服可改；影响置顶与关注排序，不影响 SLA） |
| customer | M2O customers | 提交客户 |
| assignee | M2O support_agents | 负责客服（工作流写入） |
| slaRule | M2O sla_rules | 适用的 SLA 规则（创建时匹配默认启用规则） |
| firstRespondedAt | datetime | 首次响应时间（客服首次回复时写入，SLA 依据） |
| resolvedAt | datetime | 解决时间 |
| lastActivityAt | datetime | 最后活动时间（每次客服回复/更新时写入） |
| contactEmail | string | 客户留存邮箱（表单填写，默认取客户资料） |

### ticket_messages 沟通记录

| 字段 | 类型 | 说明 |
|---|---|---|
| ticket | M2O support_tickets | 所属工单 |
| author | M2O users | 记录人（本期内仅客服写入） |
| body | text | 内容 |
| visibility | select | public 客户可见 / internal 内部备注 |
| createdAt | datetime | 时间 |

### sla_rules SLA 规则

| 字段 | 类型 | 说明 |
|---|---|---|
| name | string | 规则名，如"统一 24h 首响" |
| responseHours | number | 首响时限（小时） |
| priority | select，可空 | 适用的紧急程度（空 = 全部；预留差异化） |
| active | boolean | 是否启用 |

初始数据：1 条启用规则（responseHours = 24）；4 名客服各一行 support_agents。

### 关联关系

```
users(门户账号) ─1:1─ customers ─1:N─ support_tickets
users ─1:1─ support_agents ─1:N─ support_tickets (assignee)
sla_rules ─1:N─ support_tickets (slaRule)
support_tickets ─1:N─ ticket_messages
```

## 业务规则

### 自动轮询分配

工单创建事件触发工作流：在 `onDuty = true` 的 `support_agents` 中按 `order` 顺序轮转指派 `assignee`。实现优先顺序（实现期验证后定稿）：

1. 工作流计算节点支持取模/表达式 → 严格轮询（队列指针 = 工单序号 mod 在岗人数）
2. 支持"最少负载"查询 → 分给当前待响应+处理中单量最少的在岗客服（并列取 order 小者）
3. 兜底 → 工单留空进入"待分配池"，客服端一键领取按钮（按轮询顺序建议人选）

客服可随时改派。

### SLA 与提醒（统一首响应时限，来自 sla_rules）

- `应答期限 dueAt = createdAt + slaRule.responseHours`
- `超时 overdue`：`firstRespondedAt` 为空且 `now > dueAt`
- `快超时 nearTimeout`：`firstRespondedAt` 为空且 `now > createdAt + responseHours × 0.75`（默认 18h）
- `久未跟进 stale`：状态为 `processing` 且 `lastActivityAt`（缺省取 createdAt）距今超过 48h
- `紧急未响应 urgentUnanswered`：`priority = urgent` 且未首响

"需要关注"清单排序：urgentUnanswered → overdue → nearTimeout → stale。总览 KPI 与侧边栏角标计数 = 清单条数（角标轮询 60s）。

### 状态流

```
pending ─首次回复─> processing ─标记解决─> resolved ─关闭─> closed
                         ^──── 客服可退回（客户邮件反馈需继续处理时）
```

- 客服首次回复（public 记录）→ 写 `firstRespondedAt`（若空）、状态 pending→processing
- 标记解决 → 需附一条 public 解决说明，写 `resolvedAt`
- 关闭：客服手动；resolved 后客户有新问题则新提交或由客服退回 processing
- 每次回复/备注/状态变更都写 `lastActivityAt`

## 页面（4 条业务路由，均 lazy + resource + access.roles）

### 客户侧（customer、support 可见）

- `/support` 新建问题：标题、描述、紧急度、联系邮箱（默认带出客户资料）→ 成功显示工单编号
- `/support/tickets` 我的问题：状态筛选；行显示工单号/标题/状态/紧急度/创建时间
- `/support/tickets/:id` 详情（RouteDrawer）：状态、客户提交内容、只读时间线（仅 public）

### 客服侧（仅 support）

- `/helpdesk` 工作台：状态 Tab（待响应/处理中/已解决/已关闭）表格，行含工单号/客户/紧急度/SLA 徽标/负责客服/最近活动；详情抽屉可回复客户（public）、加内部备注（internal）、改紧急度、改派、推进/退回状态、关闭
- `/helpdesk/overview` 总览：KPI 卡（未处理总数 = pending+processing、今日超时未响应数、近 7 天解决数）、"需要关注"清单、每名客服在办量、最近解决列表

侧边栏"客服工作台"菜单项角标显示需关注数。

## 边界与备注

- 工单详情抽屉通过 resourceAction 子路由挂载（`outlet: "manual"` 不需要；用 RouteDrawer 模式）
- 文案：`src/locales/zh-CN.ts` 主、`en-US.ts` 备，命名空间 `support.*`
- 邮箱里来的问题：客户自行到门户提交，或管理员代录（以客户账号创建）；系统不接邮箱

## 风险

| 风险 | 缓解 |
|---|---|
| Windows 上 nb CLI 必须管理员终端（非提权 shell 已确认报错） | 实现期所有 nb 命令经 UAC 提权执行并回读输出；仍失败则记录限制并请用户在管理员终端操作 |
| 工作流计算节点能力不确定导致轮询取模不可行 | 退化路径：最少负载优先 → 待分配池+一键领取（见业务规则） |
| 客服回复为两次 API 调用（建记录 + 改工单）中途失败 | 失败提示重试；`lastActivityAt` 轻微滞后可接受；首响以最早 public 记录时间为准可由"修复"操作补写 |
| 时区 | 所有 datetime 以服务器存储值为准，前端 dayjs 本地化展示 |

## 测试

- 单元（vitest，`tests/logic/`）：SLA/关注分类纯逻辑、状态机转换、轮询选择函数——不依赖后端
- 组件（vitest，`tests/components/` 或就近）：列表/表单以 props 驱动，不 mock NocoBase API
- E2E（Playwright，`e2e/`）：真实 NocoBase 测试环境——客户提交 → 客服工作台可见并回复 → 总览 KPI 变化
- 回归脚本沿用 `tests/support-desk-regression.mjs` 模式
- 最终：`pnpm typecheck && pnpm test && pnpm build`
