import { useGetIdentity, useList, useTranslate } from "@refinedev/core";
import { useLocation, useNavigate } from "react-router";
import { useMemo, useState } from "react";

import { LoadingState } from "@/components/app-shell/loading-state";
import { TICKETS_RESOURCE } from "@/features/support-desk/api";
import {
  CustomerTicketList,
} from "@/features/support-desk/customer-ticket-list";
import { toTicketRecord, type RawTicket } from "@/features/support-desk/map-record";
import type { TicketRecord, TicketStatus } from "@/features/support-desk/model";

type Identity = { id: number | string };

export default function SupportTicketsPage() {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "starter" }, fallback);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStatus, setActiveStatus] = useState<TicketStatus | "all">("all");

  const { data: identity } = useGetIdentity<Identity>();

  const { result: ticketsResult, query: ticketsQuery } = useList<RawTicket>({
    resource: TICKETS_RESOURCE,
    meta: { appends: ["customer", "assignee", "slaRule"] },
    filters: [
      {
        operator: "and",
        value: [{ field: "customer.user.id", operator: "eq", value: identity?.id }],
      },
    ],
    sorters: [{ field: "createdAt", order: "desc" }],
    pagination: { mode: "server", currentPage: 1, pageSize: 100 },
    queryOptions: { enabled: identity != null, retry: false },
    errorNotification: false,
  });

  const tickets = useMemo<TicketRecord[]>(
    () => (ticketsResult?.data ?? []).map(toTicketRecord),
    [ticketsResult]
  );

  const filtered = useMemo(
    () =>
      activeStatus === "all"
        ? tickets
        : tickets.filter((ticket) => ticket.status === activeStatus),
    [tickets, activeStatus]
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {t("support.nav.myTickets", "我的问题")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "support.customer.listDescription",
            "你提交的问题与处理进度都在这里。"
          )}
        </p>
      </div>
      <CustomerTicketList
        tickets={filtered}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        onOpenTicket={openTicket}
        loading={ticketsQuery.isLoading && tickets.length === 0}
      />
    </div>
  );
}
