import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import BaserowPage from "@/pages/baserow";
import { BaserowProvider } from "@/features/baserow/store";

describe("<BaserowPage />", () => {
  const renderPage = () => render(<BaserowProvider><BaserowPage /></BaserowProvider>);

  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => cleanup());

  it("renders the seeded CRM grid with sidebar and view toolbar", () => {
    const { container } = renderPage();
    expect(screen.getByText("Baserow 表格")).toBeTruthy();
    expect(screen.getByTestId("baserow-sidebar")).toBeTruthy();
    expect(screen.getByTestId("baserow-header-f-company")).toBeTruthy();
    expect(container.querySelectorAll("tr[data-row-id]")).toHaveLength(8);
    expect(screen.getAllByRole("button", { name: "新建行" }).length).toBeGreaterThan(0);
  });

  it("switches tables from the sidebar and swaps columns accordingly", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByTestId("baserow-table-item")[1]);
    expect(screen.getByTestId("baserow-header-t-name")).toBeTruthy();
    expect(screen.queryByTestId("baserow-header-f-company")).toBeNull();
  });

  it("commits an inline text edit when pressing Enter", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    const cellText = within(container.querySelector('tr[data-row-id="r-1"]')!).getByText("北方智造集团");
    await user.dblClick(cellText);
    const editor = document.querySelector('input[data-baserow-editor="text"]') as HTMLInputElement;
    expect(editor.value).toBe("北方智造集团");
    await user.clear(editor);
    await user.type(editor, "新北方集团");
    await user.keyboard("{Enter}");
    expect(within(container.querySelector('tr[data-row-id="r-1"]')!).getByText("新北方集团")).toBeTruthy();
  });

  it("toggles a boolean cell directly without entering edit mode", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    const rowElement = container.querySelector('tr[data-row-id="r-8"]')!;
    const control = within(rowElement).getByTestId("baserow-boolean");
    expect(control.getAttribute("aria-checked")).toBe("true");
    await user.click(control);
    expect(control.getAttribute("aria-checked")).toBe("false");
  });

  it("sets a rating by clicking stars", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    const rowElement = container.querySelector('tr[data-row-id="r-6"]')!;
    await user.click(within(rowElement).getByRole("button", { name: "评分为 3" }));
    expect(rowElement.querySelectorAll(".text-amber-500")).toHaveLength(3);
  });

  it("opens the single-select picker and applies a choice", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    const rowElement = container.querySelector('tr[data-row-id="r-1"]')!;
    await user.dblClick(within(rowElement).getByText("商机"));
    await user.click(screen.getByRole("option", { name: /赢单/ }));
    expect(within(rowElement).getByText("赢单")).toBeTruthy();
    expect(document.querySelector("[data-baserow-floating-panel]")).toBeNull();
  });

  it("narrows rows through global search and reflects counts", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.type(screen.getByLabelText("搜索表格内容"), "物流");
    expect(container.querySelectorAll("tr[data-row-id]")).toHaveLength(1);
    expect(screen.getByText("1 / 8 行")).toBeTruthy();
  });

  it("adds an empty row at the bottom", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(screen.getAllByRole("button", { name: "新建行" })[0]);
    expect(container.querySelectorAll("tr[data-row-id]")).toHaveLength(9);
  });

  it("expands a row drawer and persists edited values back to the grid", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(screen.getByRole("button", { name: "展开第 1 行" }));
    const emailInput = screen.getByLabelText("编辑字段 邮箱") as HTMLInputElement;
    expect(emailInput.value).toBe("shen@northmfg.cn");
    await user.clear(emailInput);
    await user.type(emailInput, "shen2@northmfg.cn");
    await user.tab(); // blur commits
    expect(within(container.querySelector('tr[data-row-id="r-1"]')!).getByText("shen2@northmfg.cn")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "关闭" }));
  });
});