import { describe, expect, it } from "vitest";
import {
  classifyAttention,
  isOverdue,
  isNearTimeout,
  isStale,
  nextStatus,
  pickAssigneeByRotation,
  pickAssigneeLeastLoaded,
  sortForAttention,
  ticketDueAtMs,
  awaitingFirstResponse,
  type AgentOption,
  type TicketRecord,
} from "@/features/support-desk/model";

const T0 = Date.UTC(2026, 8, 1, 9, 0, 0); // 2026-09-01T09:00:00Z
const h = (n: number) => n * 3_600_000;

function ticket(patch: Partial<TicketRecord> = {}): TicketRecord {
  return {
    id: "t1",
    ticketNo: 1,
    title: "登录失败",
    description: "无法登录",
    status: "pending",
    priority: "normal",
    firstRespondedAt: null,
    resolvedAt: null,
    lastActivityAt: null,
    createdAt: new Date(T0).toISOString(),
    ...patch,
  };
}

describe("SLA 计算", () => {
  it("默认 24h 应答期限", () => {
    expect(ticketDueAtMs(ticket())).toBe(T0 + h(24));
  });
  it("来自 slaRule 的时限", () => {
    expect(
      ticketDueAtMs(ticket({ slaRule: { id: "r", responseHours: 4 } }))
    ).toBe(T0 + h(4));
  });
  it("超时判定：未首响且超过期限", () => {
    expect(isOverdue(ticket(), T0 + h(24) + 1)).toBe(true);
    expect(
      isOverdue(
        ticket({ firstRespondedAt: new Date(T0 + h(1)).toISOString() }),
        T0 + h(30)
      )
    ).toBe(false);
  });
  it("快超时：超过 75% 时限且未首响", () => {
    expect(isNearTimeout(ticket(), T0 + h(18))).toBe(true);
    expect(isNearTimeout(ticket(), T0 + h(17))).toBe(false);
  });
  it("久未跟进：processing 超 48h 无更新", () => {
    expect(isStale(ticket({ status: "processing" }), T0 + h(49))).toBe(true);
    expect(
      isStale(
        ticket({
          status: "processing",
          lastActivityAt: new Date(T0 + h(20)).toISOString(),
        }),
        T0 + h(49)
      )
    ).toBe(false);
  });
  it("awaitingFirstResponse 排除已首响/已解决", () => {
    expect(awaitingFirstResponse(ticket())).toBe(true);
    expect(awaitingFirstResponse(ticket({ status: "resolved" }))).toBe(false);
  });
});

describe("关注分类", () => {
  it("优先级 urgentUnanswered > overdue > nearTimeout > stale", () => {
    expect(classifyAttention(ticket({ priority: "urgent" }), T0 + h(30))).toBe(
      "urgentUnanswered"
    );
    expect(classifyAttention(ticket(), T0 + h(30))).toBe("overdue");
    expect(classifyAttention(ticket(), T0 + h(19))).toBe("nearTimeout");
    expect(
      classifyAttention(ticket({ status: "processing" }), T0 + h(60))
    ).toBe("stale");
    expect(classifyAttention(ticket({ status: "closed" }), T0 + h(60))).toBeNull();
  });
  it("sortForAttention 过滤并按原因排序", () => {
    // Note: the plan draft expected processing tickets to stay in the
    // first-response SLA; the approved behavior is coherent instead — the
    // response SLA only runs while pending, and processing tickets fall under
    // the stale rule (48h). At +19h the processing ticket is neither, so it is
    // filtered out here.
    const list = [
      ticket({ id: "a", status: "processing" }),
      ticket({ id: "b" }),
      ticket({ id: "c", priority: "urgent" }),
      ticket({ id: "d", status: "resolved" }),
    ];
    const sorted = sortForAttention(list, T0 + h(19));
    expect(sorted.map((t) => t.id)).toEqual(["c", "b"]);
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
    expect(pickAssigneeLeastLoaded(agents, { a1: 3, a2: 1, a3: 0 })?.id).toBe(
      "a2"
    );
    expect(pickAssigneeLeastLoaded(agents, { a1: 1, a2: 1, a3: 9 })?.id).toBe(
      "a1"
    );
  });
});
