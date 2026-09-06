import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OverviewCards } from "@/features/support-desk/overview-cards";
import type { AgentOption, TicketRecord } from "@/features/support-desk/model";

const T0 = Date.UTC(2026, 8, 1, 9, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString();
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
    createdAt: iso(T0),
    ...patch,
  };
}

const agents: AgentOption[] = [
  { id: "a1", name: "客服甲", order: 1, onDuty: true },
  { id: "a2", name: "客服乙", order: 2, onDuty: true },
];

const nowMs = T0 + h(30);

describe("OverviewCards", () => {
  it("渲染 KPI 数字与空态", () => {
    render(
      <OverviewCards
        openCount={7}
        overdueToday={2}
        resolvedLast7Days={5}
        attention={[]}
        workload={[
          { agent: agents[0], open: 3 },
          { agent: agents[1], open: 0 },
        ]}
        recentResolved={[]}
      />
    );

    expect(screen.getByTestId("kpi-open-count")).toHaveTextContent("7");
    expect(screen.getByTestId("kpi-overdue-today")).toHaveTextContent("2");
    expect(screen.getByTestId("kpi-resolved-7d")).toHaveTextContent("5");
    expect(
      screen.getByText(/暂无需要关注的工单|no tickets need attention/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/最近 7 天还没有解决记录|no resolved tickets/i)
    ).toBeInTheDocument();
  });

  it("关注清单按原因优先排序并渲染徽标", () => {
    render(
      <OverviewCards
        openCount={3}
        overdueToday={0}
        resolvedLast7Days={0}
        attention={[
          ticket({ id: "urgent", priority: "urgent" }),
          ticket({ id: "overdue" }),
          ticket({ id: "stale", status: "processing" }),
        ]}
        workload={[]}
        recentResolved={[]}
      />
    );

    const items = screen.getAllByTestId(/^attention-item-/);
    expect(items.map((item) => item.dataset.testid)).toEqual([
      "attention-item-urgent",
      "attention-item-overdue",
      "attention-item-stale",
    ]);
  });

  it("渲染工作量与最近解决列表", () => {
    render(
      <OverviewCards
        openCount={4}
        overdueToday={0}
        resolvedLast7Days={2}
        attention={[]}
        workload={[
          { agent: agents[0], open: 3 },
          { agent: agents[1], open: 1 },
        ]}
        recentResolved={[
          ticket({
            id: "done",
            status: "resolved",
            title: "导出报错",
            resolvedAt: iso(T0),
          }),
        ]}
      />
    );

    expect(screen.getByText("客服甲")).toBeInTheDocument();
    expect(screen.getByText("客服乙")).toBeInTheDocument();
    expect(screen.getByText(/导出报错/)).toBeInTheDocument();
  });
});
