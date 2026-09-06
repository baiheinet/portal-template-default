import { ticketNoOf } from "./api";
import type {
  MessageVisibility,
  TicketPriority,
  TicketRecord,
  TicketStatus,
} from "./model";

type RawRelation = { id: number | string } & Record<string, unknown>;

type RawTicket = {
  id: number | string;
  ticketNo?: number | string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  contactEmail?: string | null;
  firstRespondedAt?: string | null;
  resolvedAt?: string | null;
  lastActivityAt?: string | null;
  createdAt?: string | null;
  customer?: RawRelation | null;
  assignee?: RawRelation | null;
  slaRule?: RawRelation | null;
};

const asStringId = (value: unknown): string | undefined =>
  value == null ? undefined : String(value);

export function toTicketRecord(raw: RawTicket): TicketRecord {
  const customer = raw.customer ?? null;
  const assignee = raw.assignee ?? null;
  const slaRule = raw.slaRule ?? null;

  return {
    id: String(raw.id),
    ticketNo: ticketNoOf(raw.ticketNo),
    title: raw.title ?? "",
    description: raw.description ?? "",
    status: (raw.status ?? "pending") as TicketStatus,
    priority: (raw.priority ?? "normal") as TicketPriority,
    customer: customer
      ? {
          id: String(customer.id),
          company: (customer.company as string | null) ?? null,
          contactName: (customer.contactName as string | null) ?? null,
        }
      : null,
    assignee: assignee
      ? { id: String(assignee.id), name: (assignee.name as string | null) ?? null }
      : null,
    slaRule: slaRule
      ? {
          id: String(slaRule.id),
          responseHours: (slaRule.responseHours as number | null) ?? null,
        }
      : null,
    firstRespondedAt: raw.firstRespondedAt ?? null,
    resolvedAt: raw.resolvedAt ?? null,
    lastActivityAt: raw.lastActivityAt ?? null,
    contactEmail: raw.contactEmail ?? null,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
  };
}

export type AgentRecord = {
  id: number | string;
  name?: string | null;
  order?: number | null;
  onDuty?: boolean | null;
};

export function toAgentOption(raw: AgentRecord) {
  return {
    id: String(raw.id),
    name: raw.name ?? null,
    order: typeof raw.order === "number" ? raw.order : Number(raw.order ?? 0),
    onDuty: Boolean(raw.onDuty),
  };
}

export type RawMessage = {
  id: number | string;
  body?: string | null;
  visibility?: string | null;
  createdAt?: string | null;
  author?: RawRelation | null;
  ticket?: RawRelation | null;
};

export function toTicketMessage(raw: RawMessage) {
  return {
    id: String(raw.id),
    body: raw.body ?? "",
    visibility: (raw.visibility ?? "public") as MessageVisibility,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
    authorId: asStringId(raw.author?.id) ?? null,
    authorName: (raw.author?.nickname as string | null) ?? null,
    ticketId: asStringId(raw.ticket?.id) ?? null,
  };
}

export type { RawTicket };
