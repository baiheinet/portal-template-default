import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HelpdeskDetail } from "@/features/support-desk/helpdesk-detail";
import type { AgentOption, TicketRecord } from "@/features/support-desk/model";

const T0 = Date.UTC(2026, 8, 1, 9, 0, 0);

function ticket(patch: Partial<TicketRecord> = {}): TicketRecord {
  return {
    id: "t1",
    ticketNo: 3,
    title: "无法登录",
    description: "登录一直转圈",
    status: "pending",
    priority: "normal",
    customer: { id: "c1", company: "测试客户公司", contactName: "测试客户" },
    assignee: { id: "a1", name: "测试客服" },
    slaRule: { id: "r1", responseHours: 24 },
    firstRespondedAt: null,
    resolvedAt: null,
    lastActivityAt: null,
    contactEmail: "demo-customer@seg.plus",
    createdAt: new Date(T0).toISOString(),
    ...patch,
  };
}

const agents: AgentOption[] = [
  { id: "a1", name: "测试客服", order: 1, onDuty: true },
  { id: "a2", name: "测试客服乙", order: 2, onDuty: true },
];

const baseProps = {
  ticket: ticket(),
  messages: [],
  agents,
  onReply: vi.fn(),
  onSetPriority: vi.fn(),
  onAssign: vi.fn(),
  onTransition: vi.fn(),
};

describe("HelpdeskDetail", () => {
  it("未首响工单显示未响应徽标", () => {
    render(<HelpdeskDetail {...baseProps} />);
    expect(screen.getByTestId("no-response-badge")).toBeInTheDocument();
  });

  it("已首响工单不显示未响应徽标", () => {
    render(
      <HelpdeskDetail
        {...baseProps}
        ticket={ticket({
          status: "processing",
          firstRespondedAt: new Date(T0 + 3_600_000).toISOString(),
        })}
      />
    );
    expect(screen.queryByTestId("no-response-badge")).not.toBeInTheDocument();
  });

  it("标记解决需先输入公开解决说明", async () => {
    const user = userEvent.setup();
    const onTransition = vi.fn();
    const onReply = vi.fn();
    render(<HelpdeskDetail {...baseProps} onReply={onReply} onTransition={onTransition} />);

    const resolveButton = screen.getByRole("button", {
      name: /标记解决|mark resolved/i,
    });
    expect(resolveButton).toBeDisabled();

    await user.type(screen.getByLabelText(/回复|reply/i), "已修复，请重试");
    await user.click(
      screen.getByRole("radio", { name: /客户可见|public/i })
    );
    await waitFor(() => expect(resolveButton).toBeEnabled());
    await user.click(resolveButton);

    expect(onReply).toHaveBeenCalledWith("已修复，请重试", "public");
    expect(onTransition).toHaveBeenCalledWith("resolve");
  });

  it("内部备注不启用标记解决", async () => {
    const user = userEvent.setup();
    render(<HelpdeskDetail {...baseProps} />);

    await user.type(screen.getByLabelText(/回复|reply/i), "内部排查中");
    await user.click(
      screen.getByRole("radio", { name: /内部备注|internal/i })
    );

    expect(
      screen.getByRole("button", { name: /标记解决|mark resolved/i })
    ).toBeDisabled();
  });

  it("已解决工单提供关闭与退回操作", async () => {
    const user = userEvent.setup();
    const onTransition = vi.fn();
    render(
      <HelpdeskDetail
        {...baseProps}
        ticket={ticket({
          status: "resolved",
          firstRespondedAt: new Date(T0).toISOString(),
          resolvedAt: new Date(T0).toISOString(),
        })}
        onTransition={onTransition}
      />
    );

    await user.click(screen.getByRole("button", { name: /关闭工单|close ticket/i }));
    await user.click(
      screen.getByRole("button", { name: /退回处理|reopen/i })
    );
    expect(onTransition).toHaveBeenCalledWith("close");
    expect(onTransition).toHaveBeenCalledWith("reopen");
  });

  it("改派调用 onAssign", async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn();
    render(<HelpdeskDetail {...baseProps} onAssign={onAssign} />);

    const select = screen.getByLabelText(/负责客服|assignee/i);
    await user.click(select);
    await user.click(await screen.findByText("测试客服乙"));
    expect(onAssign).toHaveBeenCalledWith("a2");
  });
});
