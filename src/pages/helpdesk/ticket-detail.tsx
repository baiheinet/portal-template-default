import { useList, useOne, useTranslate } from "@refinedev/core";
import { useLocation, useParams } from "react-router";

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

export default function HelpdeskTicketDetailRoute() {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "starter" }, fallback);
  const { ticketId } = useParams<{ ticketId: string }>();
  const location = useLocation();
  const closeTo =
    (location.state as { from?: string } | null)?.from ?? "/helpdesk";

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
    >
      {ticket ? (
        <HelpdeskDetail
          className="min-h-0 flex-1 overflow-y-auto"
          ticket={ticket}
          messages={messages}
          agents={agents}
          busy={actions.busy}
          onReply={(body, visibility) => void actions.onReply(body, visibility)}
          onSetPriority={(priority) => void actions.onSetPriority(priority)}
          onAssign={(agentId) => void actions.onAssign(agentId)}
          onTransition={(action) => void actions.onTransition(action)}
        />
      ) : (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          {t("support.customer.detailMissing", "工单不存在或无权查看")}
        </p>
      )}
    </RouteDrawer>
  );
}
