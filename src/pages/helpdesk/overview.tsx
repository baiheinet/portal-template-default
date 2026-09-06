import { useList, useTranslate } from "@refinedev/core";
import { useLocation, useNavigate } from "react-router";
import { useMemo } from "react";
import dayjs from "dayjs";

import { LoadingState } from "@/components/app-shell/loading-state";
import {
  AGENTS_RESOURCE,
  TICKETS_RESOURCE,
} from "@/features/support-desk/api";
import { OverviewCards } from "@/features/support-desk/overview-cards";
import {
  toAgentOption,
  toTicketRecord,
  type AgentRecord,
  type RawTicket,
} from "@/features/support-desk/map-record";
import type { AgentOption, TicketRecord } from "@/features/support-desk/model";
import {
  awaitingFirstResponse,
  isOverdue,
  sortForAttention,
} from "@/features/support-desk/model";
import { useNowMs } from "@/features/support-desk/use-ticket-actions";

export default function HelpdeskOverviewPage() {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "starter" }, fallback);
  const navigate = useNavigate();
  const location = useLocation();
  const nowMs = useNowMs();

  const { result: ticketsResult, query: ticketsQuery } = useList<RawTicket>({
    resource: TICKETS_RESOURCE,
    meta: { appends: ["customer", "assignee", "slaRule"] },
    sorters: [{ field: "createdAt", order: "desc" }],
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    queryOptions: { retry: false },
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
  const agents = useMemo<AgentOption[]>(
    () => (agentsResult?.data ?? []).map(toAgentOption),
    [agentsResult]
  );

  const now = dayjs(nowMs);

  const openCount = useMemo(
    () =>
      tickets.filter(
        (ticket) => ticket.status === "pending" || ticket.status === "processing"
      ).length,
    [tickets]
  );

  const overdueToday = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (!awaitingFirstResponse(ticket)) return false;
        if (!isOverdue(ticket, nowMs)) return false;
        return dayjs(ticket.createdAt).isSame(now, "day");
      }).length,
    [tickets, nowMs, now]
  );

  const resolvedLast7Days = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (!ticket.resolvedAt) return false;
        return dayjs(ticket.resolvedAt).isAfter(now.subtract(7, "day"));
      }).length,
    [tickets, now, nowMs]
  );

  const attention = useMemo(
    () => sortForAttention(tickets, nowMs),
    [tickets, nowMs]
  );

  const workload = useMemo(
    () =>
      agents.map((agent) => ({
        agent,
        open: tickets.filter(
          (ticket) =>
            ticket.assignee?.id === agent.id &&
            (ticket.status === "pending" || ticket.status === "processing")
        ).length,
      })),
    [agents, tickets]
  );

  const recentResolved = useMemo(
    () =>
      tickets
        .filter((ticket) => ticket.resolvedAt)
        .sort((left, right) =>
          (right.resolvedAt ?? "").localeCompare(left.resolvedAt ?? "")
        ),
    [tickets]
  );

  const openTicket = (ticket: TicketRecord) => {
    navigate(`/helpdesk/${ticket.id}`, {
      state: { from: `${location.pathname}${location.search}` },
    });
  };

  if (ticketsQuery.isLoading && tickets.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {t("support.nav.overview", "服务总览")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "support.overview.description",
            "当前积压、超时提醒与近期解决情况一目了然。"
          )}
        </p>
      </div>
      <OverviewCards
        openCount={openCount}
        overdueToday={overdueToday}
        resolvedLast7Days={resolvedLast7Days}
        attention={attention}
        workload={workload}
        recentResolved={recentResolved}
        onOpenTicket={openTicket}
        nowMs={nowMs}
      />
    </div>
  );
}
