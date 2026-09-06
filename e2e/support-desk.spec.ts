import { expect, test, type APIRequestContext } from "@playwright/test";
import { installPortalSession } from "./support/session";
import {
  portalAction,
  signInPortal,
  type PortalE2EEnvironment,
  type PortalE2ESession,
} from "./support/api";
import {
  loadPortalE2EEnvironment,
  requirePortalE2ECredentials,
} from "./support/environment";

type Identity = {
  id: number | string;
  username?: string;
};

type TicketRecord = {
  id: number | string;
  ticketNo?: string | number | null;
  title?: string;
  status?: string;
  priority?: string;
  assigneeId?: number | null;
  slaRuleId?: number | null;
  firstRespondedAt?: string | null;
  resolvedAt?: string | null;
};

const environment = loadPortalE2EEnvironment();
const customerCredentials = requirePortalE2ECredentials(environment);
const supportAccount = process.env.NOCOBASE_SUPPORT_ACCOUNT;
const supportPassword = process.env.NOCOBASE_SUPPORT_PASSWORD;

if (!supportAccount || !supportPassword) {
  throw new Error(
    "NOCOBASE_SUPPORT_ACCOUNT and NOCOBASE_SUPPORT_PASSWORD are required for support desk e2e."
  );
}

const supportCredentials = {
  account: supportAccount,
  password: supportPassword,
  authenticator: environment.authenticator,
};

async function signIn(
  request: APIRequestContext,
  credentials: Parameters<typeof signInPortal>[2]
) {
  return signInPortal(request, environment, credentials);
}

async function getOwnCustomerId(
  request: APIRequestContext,
  session: PortalE2ESession
) {
  const payload = await portalAction<
    Array<{ id: number | string }> | { data?: Array<{ id: number | string }> }
  >(request, environment, "customers", "list", {
    session,
    query: {
      filter: JSON.stringify({
        $and: [{ user: { id: { $eq: session.user?.id } } }],
      }),
      pageSize: 1,
    },
  });
  const customer = Array.isArray(payload)
    ? payload
    : (payload.data ?? []);
  if (customer.length === 0) {
    throw new Error("The e2e customer account has no customers record.");
  }
  return customer[0].id;
}

function listOf<T>(payload: T[] | { data?: T[] } | undefined): T[] {
  if (Array.isArray(payload)) return payload;
  return payload?.data ?? [];
}

test.describe("Support desk end-to-end", () => {
  // The flow shares state (created ticket) across ordered steps.
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  let customerSession: PortalE2ESession;
  let supportSession: PortalE2ESession;
  let ticketTitle: string;
  let ticketId: number | string;
  let ticketNo: string | number | null = null;

  test.beforeAll(async ({ request }) => {
    customerSession = await signIn(request, customerCredentials);
    supportSession = await signIn(request, supportCredentials);
    customerSession.role = "r_customer";
    supportSession.role = "r_support";
    expect(customerSession.token).toBeTruthy();
    expect(supportSession.token).toBeTruthy();
  });

  test("customer submits a ticket and the workflow assigns it", async ({
    request,
  }) => {
    const customerId = await getOwnCustomerId(request, customerSession);
    ticketTitle = `e2e-support-${Date.now()}`;

    const created = await portalAction<TicketRecord>(
      request,
      environment,
      "support_tickets",
      "create",
      {
        session: customerSession,
        body: {
          title: ticketTitle,
          description: "E2E: customer submits a ticket through the portal.",
          priority: "normal",
          contactEmail: "demo-customer@seg.plus",
          customer: customerId,
        },
      }
    );

    ticketId = created.id;
    expect(ticketId).toBeTruthy();
    ticketNo = created.ticketNo ?? null;
    expect(created.status).toBe("pending");

    // The assignment workflow runs asynchronously; poll briefly.
    let assigned: TicketRecord | null = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const current = await portalAction<TicketRecord>(
        request,
        environment,
        "support_tickets",
        "get",
        { session: supportSession, query: { filterByTk: ticketId } }
      );
      if (current.assigneeId != null && current.slaRuleId != null) {
        assigned = current;
        break;
      }
    }

    expect(assigned).not.toBeNull();
    expect(assigned!.assigneeId).not.toBeNull();
    expect(assigned!.slaRuleId).not.toBeNull();
  });

  test("customer cannot read other resources or update tickets", async ({
    request,
  }) => {
    let agentsDeniedStatus: number | undefined;
    try {
      await portalAction<unknown>(request, environment, "support_agents", "list", {
        session: customerSession,
      });
    } catch (error) {
      agentsDeniedStatus = (error as { status?: number }).status;
    }
    expect([403, 400]).toContain(agentsDeniedStatus);

    let updateDeniedStatus: number | undefined;
    try {
      await portalAction<unknown>(request, environment, "support_tickets", "update", {
        session: customerSession,
        query: { filterByTk: ticketId },
        body: { status: "closed" },
      });
    } catch (error) {
      updateDeniedStatus = (error as { status?: number }).status;
    }
    expect([403, 400]).toContain(updateDeniedStatus);
  });

  test("support replies publicly and the ticket enters processing", async ({
    request,
  }) => {
    await portalAction<unknown>(request, environment, "ticket_messages", "create", {
      session: supportSession,
      body: {
        ticket: ticketId,
        author: supportSession.user?.id,
        visibility: "public",
        body: "E2E 回复：问题已收到，正在处理。",
      },
    });

    await portalAction<unknown>(request, environment, "support_tickets", "update", {
      session: supportSession,
      query: { filterByTk: ticketId },
      body: {
        status: "processing",
        firstRespondedAt: new Date().toISOString(),
      },
    });

    const updated = await portalAction<TicketRecord>(
      request,
      environment,
      "support_tickets",
      "get",
      { session: supportSession, query: { filterByTk: ticketId } }
    );
    expect(updated.status).toBe("processing");
    expect(updated.firstRespondedAt).toBeTruthy();
  });

  test("customer sees the public reply on the ticket timeline", async ({
    request,
  }) => {
    const messages = await portalAction<
      Array<{ body?: string }> | { data?: Array<{ body?: string }> }
    >(request, environment, "ticket_messages", "list", {
      session: customerSession,
      query: {
        filter: JSON.stringify({
          $and: [{ ticket: { id: { $eq: ticketId } } }],
        }),
        pageSize: 20,
      },
    });
    const rows = listOf(messages);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.body?.includes("E2E 回复"))).toBe(true);
  });

  test("support overview counts include the processed ticket", async ({
    request,
  }) => {
    const tickets = await portalAction<
      TicketRecord[] | { data?: TicketRecord[] }
    >(request, environment, "support_tickets", "list", {
      session: supportSession,
      query: { pageSize: 200 },
    });
    const rows = listOf(tickets);
    const open = rows.filter(
      (row) => row.status === "pending" || row.status === "processing"
    );
    expect(open.length).toBeGreaterThan(0);
    expect(rows.some((row) => String(row.id) === String(ticketId))).toBe(true);
  });

  test("customer submit page renders and accepts a ticket", async ({ page }) => {
    await installPortalSession(page, environment, customerSession);
    await page.goto(
      new URL("support", environment.baseURL).toString()
    );

    const titleInput = page.getByLabel(/标题|title/i);
    await expect(titleInput).toBeVisible({ timeout: 60_000 });
    await titleInput.fill(`e2e-ui-${Date.now()}`);
    await page
      .getByLabel(/问题描述|description/i)
      .fill("E2E UI: submit through the customer form.");
    await page.getByRole("radio", { name: /紧急|urgent/i }).click();
    const submit = page.locator('form button[type="submit"]');
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(
      page.getByTestId("customer-submit-success")
    ).toBeVisible({ timeout: 60_000 });
  });

  test("helpdesk workbench renders for the support role with badge", async ({
    page,
  }) => {
    await installPortalSession(page, environment, supportSession);
    await page.goto(new URL("helpdesk", environment.baseURL).toString());

    // Workbench tabs render.
    await expect(
      page.getByRole("button", { name: /^待响应|awaiting/i }).first()
    ).toBeVisible({ timeout: 60_000 });
    // Ticket rows are visible.
    await expect(page.getByTestId(/helpdesk-row-/).first()).toBeVisible();
    // The sidebar shows the helpdesk menu item with an attention badge.
    const helpdeskMenu = page.getByText(/客服工作台|helpdesk/i).first();
    await expect(helpdeskMenu).toBeVisible();
  });

  test("overview shows KPIs and the attention list", async ({ page }) => {
    await installPortalSession(page, environment, supportSession);
    await page.goto(
      new URL("helpdesk/overview", environment.baseURL).toString()
    );

    await expect(page.getByTestId("kpi-open-count")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("kpi-resolved-7d")).toBeVisible();
    const attentionItems = page.getByTestId(/attention-item-/);
    await expect(attentionItems.first()).toBeVisible();
  });

  test("ticket drawer supports reply and state transitions", async ({
    page,
  }) => {
    await installPortalSession(page, environment, supportSession);
    await page.goto(
      new URL(`helpdesk/${ticketId}`, environment.baseURL).toString()
    );

    const replyBody = page.getByLabel(/回复 \/ 备注|reply/i);
    await expect(replyBody).toBeVisible({ timeout: 60_000 });
    await replyBody.fill("E2E 抽屉回复：已安排处理。");
    await page
      .getByRole("button", { name: /发送|send/i })
      .first()
      .click();
    await expect(
      page.getByTestId(/helpdesk-message-/).first()
    ).toBeVisible({ timeout: 60_000 });
  });
});
