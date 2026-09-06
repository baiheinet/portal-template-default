import {
  useGetIdentity,
  useInvalidate,
  useList,
} from "@refinedev/core";
import { useLocation } from "react-router";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { TICKETS_RESOURCE } from "./api";
import { toTicketRecord, type RawTicket } from "./map-record";
import { classifyAttention } from "./model";
import type { TicketRecord } from "./model";

export const ATTENTION_POLL_INTERVAL_MS = 60_000;

// Roles that may read the helpdesk workload; everyone else skips the query.
const ATTENTION_ROLE_NAMES = ["r_support", "admin", "root"];

export function countAttentionTickets(
  tickets: TicketRecord[],
  nowMs: number
): number {
  return tickets.reduce(
    (total, ticket) => (classifyAttention(ticket, nowMs) ? total + 1 : total),
    0
  );
}

type AttentionCount = {
  count: number;
  refresh: () => void;
  refreshes?: number;
};

const SupportAttentionContext = createContext<AttentionCount | null>(null);

/**
 * Generic poll-and-refresh counter used by the attention provider. Exposed
 * separately so the timing behavior is testable without a backend.
 */
export function usePolledCount(
  fetcher: () => void,
  intervalMs = ATTENTION_POLL_INTERVAL_MS
): AttentionCount {
  const [count, setCount] = useState(0);
  const [refreshes, setRefreshes] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(fetcher, intervalMs);
    return () => window.clearInterval(timer);
  }, [fetcher, intervalMs]);

  const refresh = () => {
    fetcher();
    setRefreshes((value) => value + 1);
  };

  return { count, refresh, refreshes: refreshes };
}

export type { AttentionCount };

/**
 * Counts tickets that currently need attention (urgent unanswered, overdue,
 * near timeout, stale). One provider per app shell: polls every 60s and
 * refreshes on route changes so the sidebar badge stays current.
 */
export function SupportAttentionProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const invalidate = useInvalidate();
  const { data: identity } = useGetIdentity<{
    id: number | string;
    roles?: Array<{ name?: string } | string>;
  }>();
  const [manualRefreshes, setManualRefreshes] = useState(0);

  const canReadTickets = useMemo(() => {
    const roles = (identity?.roles ?? []).map((role) =>
      typeof role === "string" ? role : (role?.name ?? "")
    );
    return roles.some((role) => ATTENTION_ROLE_NAMES.includes(role));
  }, [identity]);

  const { result: ticketsResult } = useList<RawTicket>({
    resource: TICKETS_RESOURCE,
    meta: { appends: ["slaRule"] },
    sorters: [{ field: "createdAt", order: "desc" }],
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    queryOptions: { retry: false, enabled: canReadTickets },
    errorNotification: false,
  });

  const tickets = useMemo<TicketRecord[]>(
    () => (ticketsResult?.data ?? []).map(toTicketRecord),
    [ticketsResult]
  );

  const fetcher = () => {
    if (!canReadTickets) return;
    invalidate({ resource: TICKETS_RESOURCE, invalidates: ["list"] });
  };

  // Owns the 60s polling interval; the count itself derives from useList data.
  usePolledCount(fetcher);

  // Refresh whenever the user navigates between routes.
  useEffect(() => {
    if (!canReadTickets) return;
    invalidate({ resource: TICKETS_RESOURCE, invalidates: ["list"] });
  }, [location.pathname, invalidate, canReadTickets]);

  const count = canReadTickets ? countAttentionTickets(tickets, Date.now()) : 0;

  const value = useMemo<AttentionCount>(
    () => ({
      count,
      refresh: () => {
        fetcher();
        setManualRefreshes((value) => value + 1);
      },
      refreshes: manualRefreshes,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, manualRefreshes]
  );

  return (
    <SupportAttentionContext.Provider value={value}>
      {children}
    </SupportAttentionContext.Provider>
  );
}

export function useAttentionCount(): number {
  const value = useContext(SupportAttentionContext);
  return value?.count ?? 0;
}
