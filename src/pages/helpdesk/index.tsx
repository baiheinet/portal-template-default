import { useGetIdentity, useList, useTranslate } from "@refinedev/core";
import { useLocation, useNavigate } from "react-router";
import { useMemo, useState } from "react";

import { LoadingState } from "@/components/app-shell/loading-state";
import { TICKETS_RESOURCE, AGENTS_RESOURCE } from "@/features/support-desk/api";
import { HelpdeskTable } from "@/features/support-desk/helpdesk-table";
import {
  toAgentOption,
  toTicketRecord,
  type AgentRecord,
  type RawTicket,
} from "@/features/support-desk/map-record";
import type {
  AttentionReason,
  TicketRecord,
  TicketStatus,
} from "@/features/support-desk/model";
import { classifyAttention } from "@/features/support-desk/model";
import { useNowMs } from "@/features/support-desk/use-ticket-actions";

type Identity = { id: number | string };

export default function HelpdeskPage() {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "starter" }, fallback);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStatus, setActiveStatus] = useState<TicketStatus | "all">("all");
  const nowMs = useNowMs();

  const { data: identity } = useGetIdentity<Identity>();

  const { result: ticketsResult, query: ticketsQuery } = useList<RawTicket>({
    resource: TICKETS_RESOURCE,
    meta: { appends: ["customer", "assignee", "slaRule"] },
    sorters: [{ field: "createdAt", order: "desc" }],
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    queryOptions: { enabled: identity != null, retry: false },
    errorNotification: false,
  });

  const { result: agentsResult } = useList<AgentRecord>({
    resource: AGENTS_RESOURCE,
    sorters: [{ field: "order", order: "asc" }],
    pagination: { mode: "server", currentPage: 1, pageSize: 100 },
    queryOptions: { retry: false },
    errorNotification: false,
  });

  const tickets = useMemo<TicketRecord[]>(
    () => (ticketsResult?.data ?? []).map(toTicketRecord),
    [ticketsResult]
  );

  const attentionByTicketId = useMemo(() => {
    const map = new Map<string, AttentionReason>();
    for (const ticket of tickets) {
      const reason = classifyAttention(ticket, nowMs);
      if (reason) map.set(ticket.id, reason);
    }
    return map;
  }, [tickets, nowMs]);

  const filtered = useMemo(
    () =>
      activeStatus === "all"
        ? tickets
        : tickets.filter((ticket) => ticket.status === activeStatus),
    [tickets, activeStatus]
  );

  const agents = useMemo(
    () => (agentsResult?.data ?? []).map(toAgentOption),
    [agentsResult]
  );

  const openTicket = (ticket: TicketRecord) => {
    navigate(`./${ticket.id}`, {
      state: { from: `${location.pathname}${location.search}` },
    });
  };

  if (identity == null) {
    return <LoadingState />;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {t("support.nav.helpdesk", "客服工作台")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "support.helpdesk.description",
            "跟进所有工单：回复客户、推进状态、改派与升级。"
          )}
        </p>
      </div>
      <HelpdeskTable
        tickets={filtered}
        attentionByTicketId={attentionByTicketId}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        onOpenTicket={openTicket}
        loading={ticketsQuery.isLoading && tickets.length === 0}
      />
    </div>
  );
}
