import { useList, useOne, useTranslate } from "@refinedev/core";
import { useLocation, useParams } from "react-router";
import { useMemo } from "react";

import {
  AIEmployeeShortcut,
  AIPageContextScope,
  useAI,
  useAIPageElement,
  type AIEmployeeTask,
} from "@/extensions/nocobase-ai";
import { RouteDrawer } from "@/extensions/nocobase-route-surfaces";
import {
  AGENTS_RESOURCE,
  MESSAGES_RESOURCE,
  TICKETS_RESOURCE,
} from "@/features/support-desk/api";
import {
  HelpdeskDetail,
  type HelpdeskMessage,
} from "@/features/support-desk/helpdesk-detail";
import {
  toAgentOption,
  toTicketMessage,
  toTicketRecord,
  type AgentRecord,
  type RawMessage,
  type RawTicket,
} from "@/features/support-desk/map-record";
import { useTicketActions } from "@/features/support-desk/use-ticket-actions";

// Business employees only; developer-category employees must not be bound to
// customer-facing support surfaces.
const EXCLUDED_AI_USERNAMES = new Set(["nathan", "dara", "lina", "orin"]);
const PREFERRED_AI_USERNAME = "dex";

export default function HelpdeskTicketDetailRoute() {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "starter" }, fallback);
  const { ticketId } = useParams<{ ticketId: string }>();
  const location = useLocation();
  const closeTo =
    (location.state as { from?: string } | null)?.from ?? "/helpdesk";

  const { configurationStatus, hasEnabledModels, employees } = useAI();
  const aiReady =
    configurationStatus === "ready" && hasEnabledModels && employees.length > 0;
  const aiEmployee = useMemo(() => {
    const business = employees.filter(
      (employee) =>
        !EXCLUDED_AI_USERNAMES.has(employee.username.toLowerCase())
    );
    return (
      business.find(
        (employee) => employee.username.toLowerCase() === PREFERRED_AI_USERNAME
      ) ?? business[0]
    );
  }, [employees]);

  const { result: ticketResult, query: ticketQuery } = useOne<RawTicket>({
    resource: TICKETS_RESOURCE,
    id: ticketId,
    meta: { appends: ["customer", "assignee", "slaRule"] },
    queryOptions: { retry: false, enabled: Boolean(ticketId) },
    errorNotification: false,
  });

  const { result: messagesResult } = useList<RawMessage>({
    resource: MESSAGES_RESOURCE,
    meta: { appends: ["author"] },
    filters: [
      {
        operator: "and",
        value: [{ field: "ticket.id", operator: "eq", value: ticketId }],
      },
    ],
    sorters: [{ field: "createdAt", order: "asc" }],
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    queryOptions: { retry: false, enabled: Boolean(ticketId) },
    errorNotification: false,
  });

  const { result: agentsResult } = useList<AgentRecord>({
    resource: AGENTS_RESOURCE,
    sorters: [{ field: "order", order: "asc" }],
    pagination: { mode: "server", currentPage: 1, pageSize: 100 },
    queryOptions: { retry: false },
    errorNotification: false,
  });

  const ticket = ticketResult ? toTicketRecord(ticketResult) : null;
  const actions = useTicketActions(ticket);

  const messages: HelpdeskMessage[] = (messagesResult?.data ?? []).map(
    (raw) => {
      const message = toTicketMessage(raw);
      return {
        id: message.id,
        body: message.body,
        visibility: message.visibility,
        createdAt: message.createdAt,
        authorName: message.authorName || "-",
      };
    }
  );

  const agents = (agentsResult?.data ?? []).map(toAgentOption);
  const no = ticket?.ticketNo;

  const pageElement = useAIPageElement({
    id: `helpdesk-ticket-${ticketId ?? "unknown"}`,
    title: ticket
      ? `#${String(no ?? "").padStart(6, "0")} · ${ticket.title}`
      : t("support.nav.helpdesk", "客服工作台"),
    kind: "record-detail",
    getContext: () => ({
      resource: TICKETS_RESOURCE,
      record: ticket
        ? {
            id: ticket.id,
            ticketNo: ticket.ticketNo,
            title: ticket.title,
            status: ticket.status,
            priority: ticket.priority,
            customer: ticket.customer?.company || ticket.customer?.contactName,
            contactEmail: ticket.contactEmail,
            createdAt: ticket.createdAt,
            description: ticket.description,
            conversation: messages.map((message) => ({
              visibility: message.visibility,
              author: message.authorName,
              body: message.body,
            })),
          }
        : null,
    }),
  });

  const aiTasks = useMemo<AIEmployeeTask[]>(
    () => [
      {
        title: t("support.ai.draftReply", "起草客户回复"),
        message: {
          system: t(
            "support.ai.draftReplySystem",
            "You assist a customer service agent. Draft a concise, professional customer reply in the customer's language based on the ticket context and conversation history. Do not invent facts about the product."
          ),
          user: t(
            "support.ai.draftReplyUser",
            "基于当前工单的上下文与沟通记录，起草一条客户可见的回复：先确认问题与影响，再给出下一步处理方案或所需信息。"
          ),
        },
        autoSend: false,
      },
      {
        title: t("support.ai.summarizeTicket", "总结工单现状"),
        message: {
          system: t(
            "support.ai.summarizeSystem",
            "You assist a customer service team. Summarize the ticket status, open risks, and the recommended next action in a compact bullet list."
          ),
          user: t(
            "support.ai.summarizeUser",
            "总结当前工单：问题、已做处理、当前状态、下一步建议。"
          ),
        },
        autoSend: false,
      },
    ],
    [t]
  );

  return (
    <RouteDrawer
      title={
        ticketQuery.isLoading && !ticket ? (
          t("support.customer.detailLoading", "加载中…")
        ) : (
          <span className="flex items-center gap-2">
            {no != null ? (
              <span className="font-mono text-sm">
                #{String(no).padStart(6, "0")}
              </span>
            ) : null}
            <span className="line-clamp-1">{ticket?.title}</span>
          </span>
        )
      }
      description={t(
        "support.helpdesk.detailDescription",
        "回复客户、记录内部备注并推进工单状态。"
      )}
      closeLabel={t("support.close", "关闭")}
      closeTo={closeTo}
      actions={
        aiReady && aiEmployee && ticket ? (
          <AIEmployeeShortcut
            aiEmployee={aiEmployee.username}
            tasks={aiTasks}
            label={t("support.ai.ask", "问 AI")}
            size={30}
          />
        ) : null
      }
    >
      <AIPageContextScope
        context={{
          type: "page-element",
          id: `helpdesk-ticket-${ticketId ?? "unknown"}`,
          title: ticket
            ? `#${String(no ?? "").padStart(6, "0")} · ${ticket.title}`
            : t("support.nav.helpdesk", "客服工作台"),
        }}
      >
        <div ref={pageElement} className="flex min-h-0 flex-1 flex-col">
          {ticket ? (
            <HelpdeskDetail
              className="min-h-0 flex-1 overflow-y-auto"
              ticket={ticket}
              messages={messages}
              agents={agents}
              busy={actions.busy}
              onReply={(body, visibility) =>
                void actions.onReply(body, visibility)
              }
              onSetPriority={(priority) => void actions.onSetPriority(priority)}
              onAssign={(agentId) => void actions.onAssign(agentId)}
              onTransition={(action) => void actions.onTransition(action)}
            />
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              {t("support.customer.detailMissing", "工单不存在或无权查看")}
            </p>
          )}
        </div>
      </AIPageContextScope>
    </RouteDrawer>
  );
}
