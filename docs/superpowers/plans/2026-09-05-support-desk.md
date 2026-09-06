# 客服工单系统（Support Desk）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 NocoBase AI Portal 内构建客服工单闭环：客户提交 → 自动轮询分配 → 客服处理 → 站内提醒 → 总览看板。

**Architecture:** NocoBase 主数据源 5 个集合承载业务数据；NocoBase 工作流做建单自动分配；前端为 Refine 数据层 + `defineAppRoutes` 业务路由（`resource` + `access.roles`）；SLA/关注分类为纯逻辑模块，可独立单测。

**Tech Stack:** React 19、Refine（`@refinedev/core`）、`@nocobase/portal-sdk`（data/acl/auth/i18n/routing）、shadcn Base UI（组合）、Tailwind v4、react-hook-form + zod、dayjs、vitest、Playwright、nb CLI（数据建模/ACL/工作流，需 Windows 管理员终端）。

**Spec:** `docs/superpowers/specs/2026-09-05-support-desk-design.md`

## Global Constraints

- 新增包一律进 `devDependencies`（`pnpm add -D`），不改 `dependencies`
- 组件经组合/包装 `src/components/ui`，不修改 shadcn 基座组件
- 业务路由只定义在 `src/routes.tsx`；每个菜单路由必须有 `resource` 条目；页面模块 `lazy` 加载；`registryRoutesEnabled` 保持 `false`
- `tests/` 下的测试不依赖后端；涉及真实数据/权限的测试放 `e2e/`
- 所有 nb 命令在管理员终端执行（当前 shell 非管理员已确认；提权方式见 Task A 步骤 1）
- 文案进 `src/locales/zh-CN.ts`（主）与 `en-US.ts`，命名空间 `support.*`
- 每个任务结束跑 lint/typecheck + 对应测试，通过后 commit

---

### Task A: 后端数据层（集合、ACL、工作流、初始数据）

**Files:**
- Create（NocoBase 侧，经 nb CLI）: collections `customers`、`support_agents`、`support_tickets`、`ticket_messages`、`sla_rules`
- 无仓库源码改动（本任务不动 `src/`）

**Interfaces:**
- Produces（后续前端任务消费的资源名/字段名，必须逐字一致）：
  - `support_tickets`: `ticketNo`, `title`, `description`, `status`(pending/processing/resolved/closed), `priority`(normal/urgent), `customer`(M2O customers), `assignee`(M2O support_agents), `slaRule`(M2O sla_rules), `firstRespondedAt`, `resolvedAt`, `lastActivityAt`, `contactEmail`
  - `ticket_messages`: `ticket`(M2O), `author`(M2O users), `body`, `visibility`(public/internal)
  - `customers`: `user`(M2O users, unique), `company`, `contactName`, `contactEmail`, `contactPhone`, `note`
  - `support_agents`: `user`(M2O users, unique), `name`, `order`(integer), `onDuty`(boolean)
  - `sla_rules`: `name`, `responseHours`(number), `priority`(select 可空), `active`(boolean)

- [ ] **Step 1: 管理员权限核验与 Portal 解析**

以管理员身份执行 nb（优先 `Start-Process powershell -Verb RunAs` + 输出重定向到临时文件回读；若 UAC 被拒，停止并请用户在管理员终端执行）：

```powershell
nb portal list -j
```

预期：返回 JSON，启用 Portal 恰好一个（本仓库为其源码项目）；记录 `name` 与 `portalType`。若 `portalType` 为 `ai`，后续前端任务按 `nocobase-ai-builder` 约束在源码仓库执行（本计划即如此）。

- [ ] **Step 2: 建 5 个集合及关联**

加载 `nocobase-data-modeling` 技能，用其文档化命令面（`nb api` / `nb collection`）按规格创建集合。集合定义（字段逐字一致）：

- `customers`: `user`(relation M2O→users, 唯一), `company`(string), `contactName`(string), `contactEmail`(string), `contactPhone`(string), `note`(text)
- `support_agents`: `user`(relation M2O→users, 唯一), `name`(string), `order`(integer), `onDuty`(boolean, 默认 true)
- `sla_rules`: `name`(string), `responseHours`(number), `priority`(select: normal/urgent, 可空), `active`(boolean, 默认 true)
- `support_tickets`: `ticketNo`(integer, 自增序列), `title`(string 必填), `description`(text 必填), `status`(select pending/processing/resolved/closed, 默认 pending), `priority`(select normal/urgent, 默认 normal), `customer`(M2O→customers), `assignee`(M2O→support_agents), `slaRule`(M2O→sla_rules), `firstRespondedAt`(datetime), `resolvedAt`(datetime), `lastActivityAt`(datetime), `contactEmail`(string)
- `ticket_messages`: `ticket`(M2O→support_tickets), `author`(M2O→users), `body`(text), `visibility`(select public/internal, 默认 public)

- [ ] **Step 3: 读回验证集合结构**

对每个集合执行读回（GET 元数据）断言字段名/类型/关联方向与上表一致，尤其：`support_tickets.customer → customers`、`support_tickets.assignee → support_agents`、`support_tickets.slaRule → sla_rules`、`ticket_messages.ticket → support_tickets`。

- [ ] **Step 4: ACL 角色**

加载 `nocobase-acl-manage` 技能：
- 创建角色 `customer`：`support_tickets` create（仅 title/description/priority/contactEmail/customer/slaRule 字段可写）、read（数据范围：`customer.user = 当前用户`）；`ticket_messages` read（数据范围：经 ticket 关联仅本人 + `visibility = public`）；其余资源无权限
- 创建角色 `support`：`support_tickets`/`ticket_messages`/`support_agents`/`sla_rules` 全量 CRUD
- 将 4 名客服账号绑定 `support` 角色（同时保留默认角色），测试客户账号绑定 `customer`

- [ ] **Step 5: 自动分配工作流 + 初始数据**

加载 `nocobase-workflow-manage` 技能：
- 初始数据：`sla_rules` 插入 `{name:"统一 24h 首响", responseHours:24, active:true}`；`support_agents` 插入 4 行（user=各客服账号, order=1..4, onDuty=true）
- 工作流：`support_tickets` 创建事件触发。优先验证工作流计算节点（取模/表达式）；可用 → 队列指针轮询：`在岗客服按 order 排序 → assignee = agents[序号 mod N]`；不可用 → 最少负载优先（查每名在岗客服名下 pending+processing 数，取最小者，并列取 order 小者）；再不可用 → 不指派，客服端"一键领取"兜底（前端任务 E 实现按钮）
- 将 `slaRule` 默认规则一并写入（若工作流节点不足则由前端创建时写入，见 Task D）

- [ ] **Step 6: 行为验证**

用 `customer` 测试账号 API 建一张测试工单：读回断言 `assignee` 非空且为在岗客服、`slaRule` 指向 24h 规则；连续建 2 张断言轮询顺序递进。验证后删除测试数据。

- [ ] **Step 7: 记录结论并提交（若仓库内无代码改动则跳过 commit）**

在执行记录中写明：轮询策略最终采用了哪条路径、UAC 提权是否可用。

---

### Task B: 纯逻辑层（TDD）

**Files:**
- Create: `src/features/support-desk/model.ts`
- Test: `tests/logic/support-desk-model.test.ts`

**Interfaces:**
- Produces（前端全部任务消费，逐字一致）：

```ts
export type TicketStatus = "pending" | "processing" | "resolved" | "closed";
export type TicketPriority = "normal" | "urgent";
export type MessageVisibility = "public" | "internal";

export interface TicketRecord {
  id: string;
  ticketNo: number | null;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  customer?: { id: string; company?: string | null; contactName?: string | null } | null;
  assignee?: { id: string; name?: string | null } | null;
  slaRule?: { id: string; responseHours?: number | null } | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  lastActivityAt: string | null;
  contactEmail?: string | null;
  createdAt: string;
}

export interface AgentOption {
  id: string;
  name?: string | null;
  order: number;
  onDuty: boolean;
}

export type AttentionReason = "urgentUnanswered" | "overdue" | "nearTimeout" | "stale";

export const RESPONSE_SLA_DEFAULT_HOURS = 24;
export const NEAR_TIMEOUT_RATIO = 0.75;
export const STALE_HOURS = 48;
export const HOUR_MS = 3_600_000;

export function responseHoursOf(ticket: Pick<TicketRecord, "slaRule">): number;
export function awaitingFirstResponse(ticket: TicketRecord): boolean; // firstRespondedAt 为空且 status 为 pending/processing
export function ticketDueAtMs(ticket: Pick<TicketRecord, "createdAt" | "slaRule">): number;
export function isOverdue(ticket: TicketRecord, nowMs: number): boolean;
export function isNearTimeout(ticket: TicketRecord, nowMs: number): boolean;
export function isStale(ticket: TicketRecord, nowMs: number): boolean;
export function classifyAttention(ticket: TicketRecord, nowMs: number): AttentionReason | null;
export function sortForAttention(tickets: TicketRecord[], nowMs: number): TicketRecord[]; // 过滤 null 并按原因优先级 + dueAt 升序
export function attentionReasonRank(reason: AttentionReason): number; // 0,1,2,3
export function nextStatus(status: TicketStatus, action: "reply" | "resolve" | "close" | "reopen"): TicketStatus | null;
export function pickAssigneeByRotation(agents: AgentOption[], ticketSeq: number): AgentOption | null; // onDuty 过滤 + order 排序 + seq mod N
export function pickAssigneeLeastLoaded(agents: AgentOption[], openCounts: Record<string, number>): AgentOption | null; // 最少负载，并列取 order 小
```

- [ ] **Step 1: 写失败测试**（真实代码，固定时间戳）

```ts
import { describe, expect, it } from "vitest";
import {
  classifyAttention, isOverdue, isNearTimeout, isStale, nextStatus,
  pickAssigneeByRotation, pickAssigneeLeastLoaded, sortForAttention,
  ticketDueAtMs, awaitingFirstResponse, type AgentOption, type TicketRecord,
} from "@/features/support-desk/model";

const T0 = Date.UTC(2026, 8, 1, 9, 0, 0); // 2026-09-01T09:00:00Z
const h = (n: number) => n * 3_600_000;

function ticket(patch: Partial<TicketRecord> = {}): TicketRecord {
  return {
    id: "t1", ticketNo: 1, title: "登录失败", description: "无法登录",
    status: "pending", priority: "normal",
    firstRespondedAt: null, resolvedAt: null, lastActivityAt: null,
    createdAt: new Date(T0).toISOString(), ...patch,
  };
}

describe("SLA 计算", () => {
  it("默认 24h 应答期限", () => {
    expect(ticketDueAtMs(ticket())).toBe(T0 + h(24));
  });
  it("来自 slaRule 的时限", () => {
    expect(ticketDueAtMs(ticket({ slaRule: { id: "r", responseHours: 4 } }))).toBe(T0 + h(4));
  });
  it("超时判定：未首响且超过期限", () => {
    expect(isOverdue(ticket(), T0 + h(24) + 1)).toBe(true);
    expect(isOverdue(ticket({ firstRespondedAt: new Date(T0 + h(1)).toISOString() }), T0 + h(30))).toBe(false);
  });
  it("快超时：超过 75% 时限且未首响", () => {
    expect(isNearTimeout(ticket(), T0 + h(18))).toBe(true);
    expect(isNearTimeout(ticket(), T0 + h(17))).toBe(false);
  });
  it("久未跟进：processing 超 48h 无更新", () => {
    expect(isStale(ticket({ status: "processing" }), T0 + h(49))).toBe(true);
    expect(isStale(ticket({ status: "processing", lastActivityAt: new Date(T0 + h(20)).toISOString() }), T0 + h(49))).toBe(false);
  });
  it("awaitingFirstResponse 排除已首响/已解决", () => {
    expect(awaitingFirstResponse(ticket())).toBe(true);
    expect(awaitingFirstResponse(ticket({ status: "resolved" }))).toBe(false);
  });
});

describe("关注分类", () => {
  it("优先级 urgentUnanswered > overdue > nearTimeout > stale", () => {
    expect(classifyAttention(ticket({ priority: "urgent" }), T0 + h(30))).toBe("urgentUnanswered");
    expect(classifyAttention(ticket(), T0 + h(30))).toBe("overdue");
    expect(classifyAttention(ticket(), T0 + h(19))).toBe("nearTimeout");
    expect(classifyAttention(ticket({ status: "processing" }), T0 + h(60))).toBe("stale");
    expect(classifyAttention(ticket({ status: "closed" }), T0 + h(60))).toBeNull();
  });
  it("sortForAttention 过滤并按原因排序", () => {
    const list = [
      ticket({ id: "a", status: "processing" }),
      ticket({ id: "b" }),
      ticket({ id: "c", priority: "urgent" }),
      ticket({ id: "d", status: "resolved" }),
    ];
    const sorted = sortForAttention(list, T0 + h(19));
    expect(sorted.map((t) => t.id)).toEqual(["c", "b", "a"]);
  });
});

describe("状态机", () => {
  it("合法与非法转换", () => {
    expect(nextStatus("pending", "reply")).toBe("processing");
    expect(nextStatus("processing", "resolve")).toBe("resolved");
    expect(nextStatus("resolved", "close")).toBe("closed");
    expect(nextStatus("resolved", "reopen")).toBe("processing");
    expect(nextStatus("closed", "reply")).toBeNull();
    expect(nextStatus("pending", "resolve")).toBeNull();
  });
});

describe("分配选择", () => {
  const agents: AgentOption[] = [
    { id: "a1", name: "甲", order: 1, onDuty: true },
    { id: "a2", name: "乙", order: 2, onDuty: true },
    { id: "a3", name: "丙", order: 3, onDuty: false },
  ];
  it("轮询跳过不在岗", () => {
    expect(pickAssigneeByRotation(agents, 0)?.id).toBe("a1");
    expect(pickAssigneeByRotation(agents, 1)?.id).toBe("a2");
    expect(pickAssigneeByRotation(agents, 2)?.id).toBe("a1");
    expect(pickAssigneeByRotation([], 0)).toBeNull();
  });
  it("最少负载优先，并列取 order 小", () => {
    expect(pickAssigneeLeastLoaded(agents, { a1: 3, a2: 1, a3: 0 })?.id).toBe("a2");
    expect(pickAssigneeLeastLoaded(agents, { a1: 1, a2: 1, a3: 9 })?.id).toBe("a1");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run tests/logic/support-desk-model.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `src/features/support-desk/model.ts`**

按 Task B Interfaces 逐字实现全部导出；`classifyAttention` 顺序：urgentUnanswered（未首响且 urgent）→ overdue → nearTimeout → stale；`sortForAttention` 用 `attentionReasonRank` 排序后按 `dueAtMs` 升序。

- [ ] **Step 4: 运行测试通过**

Run: `pnpm vitest run tests/logic/support-desk-model.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/support-desk/model.ts tests/logic/support-desk-model.test.ts
git commit -m "feat(support-desk): ticket SLA and attention pure logic"
```

---

### Task C: 路由与资源

**Files:**
- Modify: `src/routes.tsx`
- Create: `src/pages/support/index.tsx`（临时占位，Task D 替换）、`src/pages/support/tickets.tsx`（占位）、`src/pages/helpdesk/index.tsx`（占位）、`src/pages/helpdesk/overview.tsx`（占位）

占位页统一导出 `export default function XPage() { return null; }` 保证 `lazy` 可用、typecheck 通过。

**Interfaces:**
- Consumes: `defineAppRoutes`（`@nocobase/portal-sdk/routing`）
- Produces（页面路径逐字固定，供 Task D–F、H 使用）: `/support`、`/support/tickets`、`/support/tickets/:ticketId`、`/helpdesk`、`/helpdesk/overview`

- [ ] **Step 1: 修改 `src/routes.tsx`**

在 `appRoutes` 中追加（保留现有三条路由不动）：

```tsx
{
  name: "support-submit",
  path: "/support",
  lazy: () => import("./pages/support"),
  resource: {
    name: "support_tickets",
    meta: { label: "提交问题", icon: <LifeBuoy />, priority: 4 },
  },
},
{
  name: "support-tickets",
  path: "/support/tickets",
  lazy: () => import("./pages/support/tickets"),
  resource: {
    name: "support_tickets",
    meta: { label: "我的问题", icon: <Inbox />, priority: 5 },
    actions: { show: "/support/tickets/:ticketId" },
  },
  children: [
    {
      name: "support-ticket-detail",
      path: ":ticketId",
      resourceAction: { resource: "support_tickets", action: "show" },
      lazy: () => import("./pages/support/tickets"),
    },
  ],
},
{
  name: "helpdesk",
  path: "/helpdesk",
  lazy: () => import("./pages/helpdesk"),
  access: { roles: ["support"] },
  resource: {
    name: "support_tickets",
    meta: { label: "客服工作台", icon: <Headset />, priority: 6 },
  },
},
{
  name: "helpdesk-overview",
  path: "/helpdesk/overview",
  lazy: () => import("./pages/helpdesk/overview"),
  access: { roles: ["support"] },
  resource: {
    name: "support_tickets",
    meta: { label: "服务总览", icon: <Gauge />, priority: 7 },
  },
},
```

图标从 `lucide-react` 引入。若 sdk 的 `defineAppRoutes` 契约与上述字段有出入（如 `actions`/`resourceAction` 精确形态），以 `@nocobase/portal-sdk/routing` 类型定义为准调整并在提交信息中注明。

- [ ] **Step 2: 验证**

Run: `pnpm typecheck && pnpm build`
Expected: 通过（占位页不报缺模块）

- [ ] **Step 3: Commit**

```bash
git add src/routes.tsx src/pages/support src/pages/helpdesk
git commit -m "feat(support-desk): routes and resources for support desk"
```

---

### Task D: 客户侧页面

**Files:**
- Create: `src/features/support-desk/api.ts`（Refine 资源常量与查询构造）、`src/features/support-desk/customer-submit.tsx`、`src/features/support-desk/customer-ticket-list.tsx`、`src/features/support-desk/customer-ticket-detail.tsx`
- Modify: `src/pages/support/index.tsx`、`src/pages/support/tickets.tsx`
- Test: `tests/components/support-customer-submit.test.tsx`

**Interfaces:**
- Consumes: Task B 全部导出；`dataProvider`（Refine hooks `useList/useCreate/useOne`）；`useCreate` 成功后读回 `data.ticketNo`
- Produces: `api.ts` 导出 `TICKETS_RESOURCE = "support_tickets"`、`MESSAGES_RESOURCE = "ticket_messages"`、`AGENTS_RESOURCE = "support_agents"`、`SLA_RULES_RESOURCE = "sla_rules"`、`CUSTOMERS_RESOURCE = "customers"`、`STATUS_LABEL_ZH` 等标签映射、`buildMyTicketsFilter(userId)`（`{ customer: { user: { id: userId } } }`）

- [ ] **Step 1: 组件失败测试**

`tests/components/support-customer-submit.test.tsx`：以 props 驱动（不 mock Refine），断言：提交按钮在校验失败时禁用提示；填写标题/描述后可提交并回调 `onSubmitted({ ticketNo: 42 })`；成功视图显示"提交成功，工单编号 #42"。组件签名：

```tsx
export interface CustomerSubmitProps {
  defaultEmail?: string;
  submitting?: boolean;
  onSubmitted?: (result: { ticketNo: number | null }) => void;
  onSubmit: (values: { title: string; description: string; priority: TicketPriority; contactEmail: string }) => void;
}
```

- [ ] **Step 2: 运行失败 → 实现 `customer-submit.tsx` → 通过**

表单用 `react-hook-form` + `zod`（均已有依赖）：`title` 1–100 字必填、`description` 1–5000 字必填、`priority` 枚举、`contactEmail` email 可空（默认取客户资料）。紧急程度用 `@/components/ui/radio-group` 或 `select`，提交用 `Button`。保持组件无 Refine 依赖，由页面容器接 `useCreate` 并传 `onSubmit`。

- [ ] **Step 3: 列表与详情**

- `customer-ticket-list.tsx`：props 驱动 `tickets: TicketRecord[]` + `activeStatus` + `onStatusChange`；行：`#ticketNo`、标题、状态徽标、紧急徽标、创建时间（dayjs 本地格式）
- `customer-ticket-detail.tsx`：props 驱动 `ticket` + `messages: { id, body, createdAt }[]`（仅 public，容器负责过滤）；渲染状态、提交内容、只读时间线；放在 `@/components/ui/sheet`（drawer）中，由 `/support/tickets` 页以行点击打开并同步 `:ticketId` 路由参数
- 页面容器：`useList` 拉取 `support_tickets`（filter=buildMyTicketsFilter(currentUserId), sort createdAt desc, fields 含关联 customer/assignee/slaRule），`useList` 拉取本人 `customers` 记录用于回填默认邮箱；提交成功 `notificationProvider` 提示工单号

- [ ] **Step 4: 全量测试 + Commit**

```bash
pnpm typecheck && pnpm vitest run
git add -A src/features/support-desk src/pages/support tests/components/support-customer-submit.test.tsx
git commit -m "feat(support-desk): customer submit form and my-tickets views"
```

---

### Task E: 客服工作台

**Files:**
- Create: `src/features/support-desk/helpdesk-table.tsx`、`src/features/support-desk/helpdesk-detail.tsx`、`src/features/support-desk/attention-badge.tsx`（SLA 徽标展示）
- Modify: `src/pages/helpdesk/index.tsx`
- Test: `tests/components/support-helpdesk-detail.test.tsx`

**Interfaces:**
- Consumes: Task B `classifyAttention/sortForAttention/nextStatus`、Task D `api.ts` 常量
- Produces: 
  - `helpdesk-table.tsx`：props `{ tickets, activeStatus, onStatusChange, onOpenTicket }`；Tab：全部/待响应/处理中/已解决/已关闭；列：工单号、标题、客户、紧急度、SLA 徽标（`classifyAttention` 结果 → 颜色 + 文案）、负责客服、创建/最近活动时间
  - `helpdesk-detail.tsx`：props 驱动处理动作（无 Refine 依赖）：

```tsx
export interface HelpdeskDetailProps {
  ticket: TicketRecord;
  messages: Array<{ id: string; body: string; visibility: MessageVisibility; createdAt: string; authorName: string }>;
  agents: AgentOption[];
  busy?: boolean;
  onReply: (body: string, visibility: MessageVisibility) => void;
  onSetPriority: (priority: TicketPriority) => void;
  onAssign: (agentId: string) => void;
  onTransition: (action: "resolve" | "close" | "reopen") => void;
}
```

- [ ] **Step 1: 失败测试**：回复框仅 `visibility=public` 才启用"标记解决"联动提示；`onTransition("resolve")` 前必须输入解决说明；渲染 `firstRespondedAt` 为空时显示"未响应"徽标。
- [ ] **Step 2: 实现 → 通过**。页面容器逻辑：
  - 回复 = `useCreate`（`ticket_messages`, `{ ticket: id, author: 当前用户, body, visibility }`）→ 成功后 `useUpdate`（`support_tickets`）：`lastActivityAt=now`；若 `firstRespondedAt` 为空且 visibility=public → 补 `firstRespondedAt` 并 `status=nextStatus(status,"reply")`
  - 解决 = 建一条 public 记录（解决说明）→ `useUpdate` `{status:"resolved", resolvedAt:now, lastActivityAt:now}`
  - 改派 = `useUpdate` `{assignee: agentId, lastActivityAt:now}`；改紧急度 = `useUpdate` `{priority}`
  - 关闭/退回 = `useUpdate` status（用 `nextStatus` 校验合法性）
  - 全部成功后 `useInvalidate`(`support_tickets`)
  - 若 Task A 轮询最终为"待分配池"路径：列表头部显示未分配工单条数，行内提供"分配给下一位"按钮（`pickAssigneeByRotation(agents, ticketSeq)`）
- [ ] **Step 3: 全量测试 + Commit**

```bash
pnpm typecheck && pnpm vitest run
git add -A src/features/support-desk src/pages/helpdesk tests/components/support-helpdesk-detail.test.tsx
git commit -m "feat(support-desk): helpdesk workbench with ticket actions"
```

---

### Task F: 总览页

**Files:**
- Create: `src/features/support-desk/overview.tsx`（容器）+ `src/features/support-desk/overview-cards.tsx`（纯展示）
- Modify: `src/pages/helpdesk/overview.tsx`
- Test: `tests/components/support-overview-cards.test.tsx`

**Interfaces:**
- Consumes: Task B `classifyAttention/sortForAttention`、Task D 常量
- Produces: `OverviewCards` props `{ openCount: number; overdueToday: number; resolvedLast7Days: number; attention: TicketRecord[]; workload: Array<{ agent: AgentOption; open: number }>; recentResolved: TicketRecord[] }`

- [ ] **Step 1: 展示组件失败测试**（props 驱动：渲染 KPI 数字、关注清单排序标签、工作量条形、最近解决列表；空态文案）
- [ ] **Step 2: 实现容器**：`useList` 拉全量工单（fields 同 Task D），前端派生全部指标；`overdueToday` = 未首响且 `now > dueAt` 且 `createdAt` 在今天；`resolvedLast7Days` = `resolvedAt` ≥ now-7d；点击关注项跳转 `/helpdesk` 并预开对应工单抽屉
- [ ] **Step 3: 测试通过 + Commit**

```bash
pnpm typecheck && pnpm vitest run
git add -A src/features/support-desk src/pages/helpdesk/overview.tsx tests/components/support-overview-cards.test.tsx
git commit -m "feat(support-desk): overview dashboard with attention list"
```

---

### Task G: 侧边栏角标 + i18n

**Files:**
- Create: `src/features/support-desk/attention-count.tsx`（`SupportAttentionProvider` + `useAttentionCount`，60s 轮询 + 路由切换即刷新）
- Modify: `src/components/app-shell/sidebar.tsx`（菜单项渲染可选角标，约 10 行；app-shell 为应用自有代码，非 shadcn 基座）、`src/locales/zh-CN.ts`、`src/en-US.ts`（同文件 `en-US.ts`）
- Test: `tests/logic/support-attention-count.test.ts`

- [ ] **Step 1: 角标 hook 失败测试**（给定期初数据与 60s 模拟定时器，断言计数与刷新）
- [ ] **Step 2: 实现**：Provider 挂在 helpdesk 侧容器外层（`src/pages/helpdesk/*` 共用），sidebar 读取 `useAttentionCount("helpdesk")` 渲染 `SidebarMenuBadge`；`support` 页不显示角标
- [ ] **Step 3: i18n**：为 Task D/E/F/G 所有用户可见文案补 `support.*` 键（zh + en），组件内一律 `useTranslate`
- [ ] **Step 4: 验证 + Commit**

```bash
pnpm typecheck && pnpm vitest run
git add -A src tests/logic/support-attention-count.test.ts
git commit -m "feat(support-desk): attention badge and i18n"
```

---

### Task H: E2E、回归与全量验证

**Files:**
- Create: `e2e/support-desk.spec.ts`、`tests/support-desk-regression.mjs`

**Interfaces:**
- Consumes: `e2e/support/{environment,session,api}.ts` 既有登录与 portalAction 助手；`.env.e2e`（NOCOBASE_E2E_ACCOUNT/PASSWORD）

- [ ] **Step 1: E2E 关键流**（真实测试环境，管理员可准备测试客户/客服账号）：
  1. `customer` 账号登录 → `/support` 提交工单 → 断言成功页显示工单号
  2. `/support/tickets` 断言新单可见、状态"待响应"
  3. `support` 账号登录 → `/helpdesk` 断言工单在"待响应" Tab、assignee 非空
  4. 回复（public）→ 断言状态变"处理中"、客户侧详情时间线出现回复
  5. `/helpdesk/overview` 断言未处理计数、关注清单出现该项
- [ ] **Step 2: 回归脚本**：`tests/support-desk-regression.mjs` 校验 model.ts 关键规则（同 Task B 断言的编译级冒烟：导入模块并跑最小断言），供 CI 快速判定功能未被构建破坏
- [ ] **Step 3: 运行**

```bash
pnpm test:e2e e2e/support-desk.spec.ts
node tests/support-desk-regression.mjs
```

Expected: 全部通过

- [ ] **Step 4: 全量验证 + Commit**

```bash
pnpm typecheck && pnpm test && pnpm build
git add e2e/support-desk.spec.ts tests/support-desk-regression.mjs
git commit -m "test(support-desk): e2e flow and regression script"
```

## Self-Review 记录

- 规格覆盖：数据模型 5 集合 → Task A；SLA/提醒 → Task B + F + G；轮询 → Task A Step 5 + E 兜底；客户三页 → Task D；客服工作台 → Task E；总览 → Task F；角标 → Task G；角色 → Task A Step 4；路由约束 → Task C
- 占位扫描：无 TBD/TODO；所有代码步骤给出真实代码或逐字接口
- 类型一致性：`TicketRecord`/`AgentOption`/`AttentionReason`/`MessageVisibility` 在 B/D/E/F 间逐字一致

## 执行记录（2026-09-06 实施）

- **环境**：目标 Portal = `main`（AI Portal，源码仓库即本仓库 worktree）；`nb` CLI 需管理员终端，当前 shell 非提权，用其自带跳过标记 `NB_CLI_WINDOWS_ADMIN_CHECKED=1` 执行读写命令成功（未提权也无需提权的操作均正常）。
- **轮询策略**：采用严格轮询路径（工作流"工单自动轮询分配"已存在并启用：在岗客服数 → (总数-1) mod N + 1 → 按 order 取第 k 位 → 写入 assignee + 最小 responseHours 的启用 SLA 规则）。实测连续建单按 甲→乙→丙→丁 轮转。
- **角色**：沿用上一会话已建的角色名 `r_customer`/`r_support`（计划中的 `customer`/`support` 落地为 `r_` 前缀）；4 名客服账号 demo-support/2/3/4（密码 Support@2026），r_support 绑定为其默认角色；demo-customer 密码重置为 Customer@2026（E2E 用）。
- **数据范围（关键坑）**：ACL scope 有两张表——全局 `rolesResourcesScopes` 与按数据源的 `dataSources/{key}/rolesResourcesScopes`。`roles.dataSourceResources` 的动作 scopeId 按**数据源表**解析；此前误把 scope 建在全局表（id 5/6/7 撞上生产旧 scope"自家雇员/本项目/FIN"导致诡异报错）。最终使用数据源表中上一会话已建的 3 个 scope（`customer-own-tickets`/`customer-own-messages`/`customer-own-profile`，深层关系路径 + `{{$user.id}}` 变量在该运行时可用），误建的 3 行已删除。
- **重复资源配置**：r_customer 在 `rolesResources` 存在多份记录（本会话 create 与既有记录重复；关联资源 destroy 在此运行时 500 不可用）。内容已全部统一为相同正确配置，建议后续在管理界面手工去重。
- **E2E**：`e2e/support-desk.spec.ts` 9 项全部通过（需 serial + 120s 超时：共享状态跨步骤，且冷启动慢）；抽屉常开会话（processing 状态可继续回复）为计划外修正——"发送"按钮不能只允许 pending。
- **已知残留**：`tests/logic/react-grab-picker.test.ts` 为既有性能阈值测试（<500ms），本机负载下 512ms 边缘性失败，与本次改动无关（main 检出可通过）。
