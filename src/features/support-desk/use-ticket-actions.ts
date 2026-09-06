import {
  useCreate,
  useGetIdentity,
  useInvalidate,
  useUpdate,
  type HttpError,
} from "@refinedev/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import { MESSAGES_RESOURCE, TICKETS_RESOURCE } from "./api";
import { nextStatus } from "./model";
import type { MessageVisibility, TicketPriority, TicketStatus } from "./model";

type Identity = { id: number | string };

export type TicketActions = {
  createMessage: (values: {
    ticketId: string;
    body: string;
    visibility: MessageVisibility;
  }) => Promise<void>;
  patchTicket: (values: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigneeId?: string | null;
    firstRespondedAt?: string | null;
    resolvedAt?: string | null;
  }) => Promise<void>;
  onReply: (body: string, visibility: MessageVisibility) => Promise<void>;
  onSetPriority: (priority: TicketPriority) => Promise<void>;
  onAssign: (agentId: string) => Promise<void>;
  onTransition: (
    action: "resolve" | "close" | "reopen"
  ) => Promise<void>;
  busy: boolean;
};

/**
 * Shared helpdesk mutation logic. Kept as one hook so the workbench page and
 * the ticket drawer route apply identical business rules (first response,
 * last activity, state transitions).
 */
export function useTicketActions(
  ticket: { id: string; status: TicketStatus; firstRespondedAt: string | null } | null
): TicketActions {
  const invalidate = useInvalidate();
  const { data: identity } = useGetIdentity<Identity>();
  const { mutateAsync: createMessageMutation, mutation: createMutation } =
    useCreate<{ id: string }, HttpError>();
  const { mutateAsync: updateTicketMutation, mutation: updateMutation } =
    useUpdate<{ id: string }, HttpError>();

  const busy = createMutation.isPending || updateMutation.isPending;

  const refresh = useCallback(() => {
    invalidate({ resource: TICKETS_RESOURCE, invalidates: ["list", "many", "detail"] });
    invalidate({ resource: MESSAGES_RESOURCE, invalidates: ["list", "many"] });
  }, [invalidate]);

  const createMessage = useCallback(
    async (values: { ticketId: string; body: string; visibility: MessageVisibility }) => {
      await createMessageMutation({
        resource: MESSAGES_RESOURCE,
        values: {
          ticket: values.ticketId,
          author: identity?.id,
          body: values.body,
          visibility: values.visibility,
        },
        errorNotification: (_error, _values, resource) => ({
          key: `${resource}-create-error`,
          type: "error",
          message: "发送失败，请重试",
        }),
        successNotification: false,
      });
    },
    [createMessageMutation, identity?.id]
  );

  const patchTicket = useCallback(
    async (values: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assigneeId?: string | null;
      firstRespondedAt?: string | null;
      resolvedAt?: string | null;
    }) => {
      if (!ticket) return;
      await updateTicketMutation({
        resource: TICKETS_RESOURCE,
        id: ticket.id,
        values: {
          ...(values.status ? { status: values.status } : {}),
          ...(values.priority ? { priority: values.priority } : {}),
          ...(values.assigneeId !== undefined
            ? { assignee: values.assigneeId }
            : {}),
          ...(values.firstRespondedAt !== undefined
            ? { firstRespondedAt: values.firstRespondedAt }
            : {}),
          ...(values.resolvedAt !== undefined
            ? { resolvedAt: values.resolvedAt }
            : {}),
          lastActivityAt: dayjs().toISOString(),
        },
        successNotification: false,
        errorNotification: (_error, _values, resource) => ({
          key: `${resource}-update-error`,
          type: "error",
          message: "更新失败，请重试",
        }),
      });
    },
    [ticket, updateTicketMutation]
  );

  const onReply = useCallback(
    async (body: string, visibility: MessageVisibility) => {
      if (!ticket || !body) return;
      await createMessage({ ticketId: ticket.id, body, visibility });
      if (visibility === "public" && !ticket.firstRespondedAt) {
        const target = nextStatus(ticket.status, "reply") ?? ticket.status;
        await patchTicket({
          firstRespondedAt: dayjs().toISOString(),
          status: target,
        });
      } else {
        await patchTicket({});
      }
      refresh();
    },
    [createMessage, patchTicket, refresh, ticket]
  );

  const onSetPriority = useCallback(
    async (priority: TicketPriority) => {
      if (!ticket) return;
      await patchTicket({ priority });
      refresh();
    },
    [patchTicket, refresh, ticket]
  );

  const onAssign = useCallback(
    async (agentId: string) => {
      if (!ticket) return;
      await patchTicket({ assigneeId: agentId });
      refresh();
    },
    [patchTicket, refresh, ticket]
  );

  const onTransition = useCallback(
    async (action: "resolve" | "close" | "reopen") => {
      if (!ticket) return;
      const now = dayjs().toISOString();
      if (action === "resolve") {
        await patchTicket({
          status: nextStatus(ticket.status, "resolve") ?? "resolved",
          resolvedAt: now,
        });
      } else if (action === "close") {
        await patchTicket({
          status: nextStatus(ticket.status, "close") ?? "closed",
        });
      } else if (action === "reopen") {
        await patchTicket({
          status: nextStatus(ticket.status, "reopen") ?? "processing",
        });
      }
      refresh();
    },
    [patchTicket, refresh, ticket]
  );

  return useMemo(
    () => ({
      createMessage,
      patchTicket,
      onReply,
      onSetPriority,
      onAssign,
      onTransition,
      busy,
    }),
    [
      busy,
      createMessage,
      onAssign,
      onReply,
      onSetPriority,
      onTransition,
      patchTicket,
    ]
  );
}

export function useNowMs(intervalMs = 60_000) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return nowMs;
}
