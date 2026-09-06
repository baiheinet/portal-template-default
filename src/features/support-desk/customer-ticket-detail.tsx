import { useTranslate } from "@refinedev/core";
import dayjs from "dayjs";

import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { ticketNoOf } from "./api";
import type { TicketRecord } from "./model";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "./status-badges";
import { formatDateTime } from "./customer-ticket-list";

export type CustomerTicketMessage = {
  id: string;
  body: string;
  createdAt: string;
  authorName?: string | null;
};

export type CustomerTicketDetailProps = {
  ticket: TicketRecord | null;
  messages: CustomerTicketMessage[];
  loading?: boolean;
  className?: string;
};

export function CustomerTicketDetail({
  ticket,
  messages,
  loading = false,
  className,
}: CustomerTicketDetailProps) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "starter" }, fallback);

  if (loading && !ticket) {
    return (
      <div className={className}>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className={className}>
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("support.customer.detailMissing", "工单不存在或无权查看")}
        </p>
      </div>
    );
  }

  const no = ticketNoOf(ticket.ticketNo);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
        <TicketStatusBadge status={ticket.status} />
        {ticket.priority === "urgent" ? (
          <TicketPriorityBadge priority={ticket.priority} />
        ) : null}
        <span className="font-mono text-xs text-muted-foreground">
          {no != null ? `#${String(no).padStart(6, "0")}` : "-"}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("support.field.createdAt", "提交时间")}：
          {formatDateTime(ticket.createdAt)}
        </span>
        {ticket.resolvedAt ? (
          <span className="text-xs text-muted-foreground">
            {t("support.field.resolvedAt", "解决时间")}：
            {formatDateTime(ticket.resolvedAt)}
          </span>
        ) : null}
      </div>

      <div className="px-5 pt-4">
        <h3 className="text-sm font-medium text-foreground">
          {t("support.customer.submittedContent", "你提交的内容")}
        </h3>
        <p className="mt-1 text-sm font-medium">{ticket.title}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
          {ticket.description}
        </p>
      </div>

      <Separator className="my-4" />

      <div className="px-5 pb-5">
        <h3 className="text-sm font-medium text-foreground">
          {t("support.customer.timeline", "处理进度")}
        </h3>
        {messages.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            {t(
              "support.customer.timelineEmpty",
              "客服还没有回复，我们会尽快处理。"
            )}
          </p>
        ) : (
          <ol className="mt-3 space-y-4">
            {messages.map((message) => (
              <li
                key={message.id}
                className="rounded-lg border bg-muted/30 px-4 py-3"
                data-testid={`customer-message-${message.id}`}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {message.authorName ||
                      t("support.customer.supportTeam", "客服团队")}
                  </span>
                  <span>{dayjs(message.createdAt).format("YYYY-MM-DD HH:mm")}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm">
                  {message.body}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
