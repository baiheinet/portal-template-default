export type TicketStatus = "pending" | "processing" | "resolved" | "closed";
export type TicketPriority = "normal" | "urgent";
export type MessageVisibility = "public" | "internal";

export interface TicketRecord {
  id: string;
  ticketNo: number | null;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  customer?:
    | { id: string; company?: string | null; contactName?: string | null }
    | null;
  assignee?: { id: string; name?: string | null } | null;
  slaRule?: { id: string; responseHours?: number | null } | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  lastActivityAt: string | null;
  contactEmail?: string | null;
  createdAt: string;
}

export interface AgentOption {
  id: string;
  name?: string | null;
  order: number;
  onDuty: boolean;
}

export type AttentionReason =
  | "urgentUnanswered"
  | "overdue"
  | "nearTimeout"
  | "stale";

export const RESPONSE_SLA_DEFAULT_HOURS = 24;
export const NEAR_TIMEOUT_RATIO = 0.75;
export const STALE_HOURS = 48;
export const HOUR_MS = 3_600_000;

export const attentionReasonRank: Record<AttentionReason, number> = {
  urgentUnanswered: 0,
  overdue: 1,
  nearTimeout: 2,
  stale: 3,
};

export function responseHoursOf(
  ticket: Pick<TicketRecord, "slaRule">
): number {
  const hours = ticket.slaRule?.responseHours;
  return typeof hours === "number" && hours > 0
    ? hours
    : RESPONSE_SLA_DEFAULT_HOURS;
}

export function awaitingFirstResponse(ticket: TicketRecord): boolean {
  // The first-response SLA only runs while a ticket is still waiting for its
  // first reply (pending). Once work has started the attention signal is the
  // stale rule (48h without activity), not the response deadline.
  return ticket.firstRespondedAt == null && ticket.status === "pending";
}

export function ticketDueAtMs(
  ticket: Pick<TicketRecord, "createdAt" | "slaRule">
): number {
  const createdAtMs = new Date(ticket.createdAt).getTime();
  const hours = responseHoursOf(ticket);
  return createdAtMs + hours * HOUR_MS;
}

export function isOverdue(ticket: TicketRecord, nowMs: number): boolean {
  if (!awaitingFirstResponse(ticket)) return false;
  return nowMs > ticketDueAtMs(ticket);
}

export function isNearTimeout(ticket: TicketRecord, nowMs: number): boolean {
  if (!awaitingFirstResponse(ticket)) return false;
  const dueMs = ticketDueAtMs(ticket);
  const nearMs =
    dueMs - (1 - NEAR_TIMEOUT_RATIO) * responseHoursOf(ticket) * HOUR_MS;
  return nowMs >= nearMs && nowMs <= dueMs;
}

export function isStale(ticket: TicketRecord, nowMs: number): boolean {
  if (ticket.status !== "processing") return false;
  const baseMs = ticket.lastActivityAt
    ? new Date(ticket.lastActivityAt).getTime()
    : new Date(ticket.createdAt).getTime();
  return nowMs - baseMs > STALE_HOURS * HOUR_MS;
}

export function classifyAttention(
  ticket: TicketRecord,
  nowMs: number
): AttentionReason | null {
  if (
    ticket.priority === "urgent" &&
    awaitingFirstResponse(ticket) &&
    nowMs > new Date(ticket.createdAt).getTime()
  ) {
    return "urgentUnanswered";
  }
  if (isOverdue(ticket, nowMs)) return "overdue";
  if (isNearTimeout(ticket, nowMs)) return "nearTimeout";
  if (isStale(ticket, nowMs)) return "stale";
  return null;
}

export function sortForAttention(
  tickets: TicketRecord[],
  nowMs: number
): TicketRecord[] {
  return tickets
    .map((ticket) => ({ ticket, reason: classifyAttention(ticket, nowMs) }))
    .filter(
      (entry): entry is { ticket: TicketRecord; reason: AttentionReason } =>
        entry.reason !== null
    )
    .sort((left, right) => {
      const byReason =
        attentionReasonRank[left.reason] - attentionReasonRank[right.reason];
      if (byReason !== 0) return byReason;
      return ticketDueAtMs(left.ticket) - ticketDueAtMs(right.ticket);
    })
    .map((entry) => entry.ticket);
}

export type StatusAction = "reply" | "resolve" | "close" | "reopen";

export function nextStatus(
  status: TicketStatus,
  action: StatusAction
): TicketStatus | null {
  switch (action) {
    case "reply":
      return status === "pending" ? "processing" : null;
    case "resolve":
      return status === "processing" ? "resolved" : null;
    case "close":
      return status === "resolved" ? "closed" : null;
    case "reopen":
      return status === "resolved" ? "processing" : null;
    default:
      return null;
  }
}

export function pickAssigneeByRotation(
  agents: AgentOption[],
  ticketSeq: number
): AgentOption | null {
  const onDuty = agents
    .filter((agent) => agent.onDuty)
    .sort((left, right) => left.order - right.order);
  if (onDuty.length === 0) return null;
  const index = ((ticketSeq % onDuty.length) + onDuty.length) % onDuty.length;
  return onDuty[index];
}

export function pickAssigneeLeastLoaded(
  agents: AgentOption[],
  openCounts: Record<string, number>
): AgentOption | null {
  const onDuty = agents
    .filter((agent) => agent.onDuty)
    .sort((left, right) => left.order - right.order);
  if (onDuty.length === 0) return null;
  let best: AgentOption | null = null;
  for (const agent of onDuty) {
    if (best === null) {
      best = agent;
      continue;
    }
    const count = openCounts[agent.id] ?? 0;
    const bestCount = openCounts[best.id] ?? 0;
    if (count < bestCount) best = agent;
  }
  return best;
}
