import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CustomerSubmit } from "@/features/support-desk/customer-submit";

describe("CustomerSubmit", () => {
  it("校验失败时提交按钮禁用并显示必填提示", async () => {
    const onSubmit = vi.fn();
    render(<CustomerSubmit onSubmit={onSubmit} />);

    const submit = screen.getByRole("button", { name: /提交问题|submit/i });
    expect(submit).toBeDisabled();

    const user = userEvent.setup();
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/请输入标题|title is required/i)
    ).toBeInTheDocument();
  });

  it("填写标题与描述后可提交并展示成功工单编号", async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ ticketNo: 42 });
    const onSubmitted = vi.fn();
    render(
      <CustomerSubmit
        defaultEmail="demo-customer@seg.plus"
        onSubmit={onSubmit}
        onSubmitted={onSubmitted}
      />
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/标题|title/i), "无法导出报表");
    await user.type(
      screen.getByLabelText(/问题描述|description/i),
      "点击导出按钮没有反应"
    );
    await user.click(
      screen.getByRole("radio", { name: /紧急|urgent/i })
    );

    const submit = screen.getByRole("button", { name: /提交问题|submit/i });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith({
      title: "无法导出报表",
      description: "点击导出按钮没有反应",
      priority: "urgent",
      contactEmail: "demo-customer@seg.plus",
    });
    expect(onSubmitted).toHaveBeenCalledWith({ ticketNo: 42 });
    const successView = await screen.findByTestId("customer-submit-success");
    expect(successView).toHaveTextContent(/提交成功|successfully/i);
    expect(successView).toHaveTextContent("42");
  });
});
