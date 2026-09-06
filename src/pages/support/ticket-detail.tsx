import { useList, useOne, useTranslate } from "@refinedev/core";
import { useLocation, useParams } from "react-router";

import { RouteDrawer } from "@/extensions/nocobase-route-surfaces";
import { MESSAGES_RESOURCE, TICKETS_RESOURCE } from "@/features/support-desk/api";
import {
  CustomerTicketDetail,
  type CustomerTicketMessage,
} from "@/features/support-desk/customer-ticket-detail";
import {
  toTicketMessage,
  toTicketRecord,
  type RawMessage,
  type RawTicket,
} from "@/features/support-desk/map-record";

export default function SupportTicketDetailRoute() {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "starter" }, fallback);
  const { ticketId } = useParams<{ ticketId: string }>();
  const location = useLocation();
  const closeTo =
    (location.state as { from?: string } | null)?.from ?? "/support/tickets";

  const { result: ticketResult, query: ticketQuery } =
    useOne<RawTicket>({
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
        value: [
          { field: "ticket.id", operator: "eq", value: ticketId },
          { field: "visibility", operator: "eq", value: "public" },
        ],
      },
    ],
    sorters: [{ field: "createdAt", order: "asc" }],
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    queryOptions: { retry: false, enabled: Boolean(ticketId) },
    errorNotification: false,
  });

  const ticket = ticketResult ? toTicketRecord(ticketResult) : null;
  const messages: CustomerTicketMessage[] = (messagesResult?.data ?? []).map(
    (raw) => {
      const message = toTicketMessage(raw);
      return {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        authorName: message.authorName,
      };
    }
  );

  const no = ticket?.ticketNo;
  const title = no != null ? `#${String(no).padStart(6, "0")}` : "";

  return (
    <RouteDrawer
      title={
        ticketQuery.isLoading && !ticket ? (
          t("support.customer.detailLoading", "加载中…")
        ) : (
          <span className="flex items-center gap-2">
            {title ? <span className="font-mono text-sm">{title}</span> : null}
            <span className="line-clamp-1">{ticket?.title}</span>
          </span>
        )
      }
      description={t(
        "support.customer.detailDescription",
        "查看处理进度与客服回复。"
      )}
      closeLabel={t("support.close", "关闭")}
      closeTo={closeTo}
    >
      <CustomerTicketDetail
        className="min-h-0 flex-1 overflow-y-auto"
        ticket={ticket}
        messages={messages}
        loading={ticketQuery.isLoading}
      />
    </RouteDrawer>
  );
}
