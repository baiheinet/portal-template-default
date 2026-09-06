import type {
  AgentOption,
  MessageVisibility,
  TicketPriority,
  TicketStatus,
} from "./model";

/** Refine/NocoBase resource names (server collections, verbatim). */
export const TICKETS_RESOURCE = "support_tickets";
export const MESSAGES_RESOURCE = "ticket_messages";
export const AGENTS_RESOURCE = "support_agents";
export const SLA_RULES_RESOURCE = "sla_rules";
export const CUSTOMERS_RESOURCE = "customers";

export const TICKET_STATUSES: TicketStatus[] = [
  "pending",
  "processing",
  "resolved",
  "closed",
];

export const TICKET_PRIORITIES: TicketPriority[] = ["normal", "urgent"];

export const MESSAGE_VISIBILITIES: MessageVisibility[] = [
  "public",
  "internal",
];

/**
 * i18n keys for each enum value; resolved through the `starter` namespace so
 * menus, badges, and filters share the same terminology.
 */
export const STATUS_LABEL_KEYS: Record<TicketStatus, string> = {
  pending: "support.status.pending",
  processing: "support.status.processing",
  resolved: "support.status.resolved",
  closed: "support.status.closed",
};

export const PRIORITY_LABEL_KEYS: Record<TicketPriority, string> = {
  normal: "support.priority.normal",
  urgent: "support.priority.urgent",
};

export const VISIBILITY_LABEL_KEYS: Record<MessageVisibility, string> = {
  public: "support.visibility.public",
  internal: "support.visibility.internal",
};

export const ATTENTION_LABEL_KEYS: Record<string, string> = {
  urgentUnanswered: "support.attention.urgentUnanswered",
  overdue: "support.attention.overdue",
  nearTimeout: "support.attention.nearTimeout",
  stale: "support.attention.stale",
};

export const TICKET_FIELDS = [
  "id",
  "ticketNo",
  "title",
  "description",
  "status",
  "priority",
  "contactEmail",
  "firstRespondedAt",
  "resolvedAt",
  "lastActivityAt",
  "customer",
  "assignee",
  "slaRule",
  "createdAt",
] as const;

/**
 * Scope for a customer's own tickets. NocoBase evaluates this server-side via
 * the r_customer view scope; the same filter is used client-side so staff
 * views can reuse it for demo/impersonation contexts.
 */
export function buildMyTicketsFilter(userId: string | number | undefined) {
  return {
    $and: [{ customer: { user: { id: { $eq: userId } } } }],
  };
}

export function ticketNoOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export type { AgentOption, MessageVisibility, TicketPriority, TicketStatus };
