import { useTranslate } from "@refinedev/core";
import { ChevronRight } from "lucide-react";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { ticketNoOf } from "./api";
import type { AttentionReason, TicketRecord, TicketStatus } from "./model";
import {
  AttentionBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "./status-badges";
import { formatDateTime } from "./customer-ticket-list";

export type HelpdeskTableProps = {
  tickets: TicketRecord[];
  attentionByTicketId?: Map<string, AttentionReason>;
  activeStatus: TicketStatus | "all";
  onStatusChange: (status: TicketStatus | "all") => void;
  onOpenTicket: (ticket: TicketRecord) => void;
  loading?: boolean;
  className?: string;
};

export function HelpdeskTable({
  tickets,
  attentionByTicketId,
  activeStatus,
  onStatusChange,
  onOpenTicket,
  loading = false,
  className,
}: HelpdeskTableProps) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "starter" }, fallback);

  const tabs: Array<{ value: TicketStatus | "all"; label: string }> = [
    { value: "all", label: t("support.status.all", "全部") },
    { value: "pending", label: t("support.status.pending", "待响应") },
    { value: "processing", label: t("support.status.processing", "处理中") },
    { value: "resolved", label: t("support.status.resolved", "已解决") },
    { value: "closed", label: t("support.status.closed", "已关闭") },
  ];

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            variant={activeStatus === tab.value ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              activeStatus === tab.value &&
                "border border-border bg-primary/10 text-primary hover:!bg-primary/15"
            )}
            onClick={() => onStatusChange(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">
                {t("support.field.ticketNo", "工单号")}
              </TableHead>
              <TableHead>{t("support.field.title", "标题")}</TableHead>
              <TableHead className="w-36">
                {t("support.field.customer", "客户")}
              </TableHead>
              <TableHead className="w-20">
                {t("support.field.priority", "紧急度")}
              </TableHead>
              <TableHead className="w-28">
                {t("support.field.attention", "关注")}
              </TableHead>
              <TableHead className="w-28">
                {t("support.field.assignee", "负责客服")}
              </TableHead>
              <TableHead className="w-36">
                {t("support.field.lastActivityAt", "最近活动")}
              </TableHead>
              <TableHead className="w-10" aria-hidden="true" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {t("support.helpdesk.listEmpty", "没有符合条件的工单")}
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const reason = attentionByTicketId?.get(ticket.id);
                return (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer"
                    onClick={() => onOpenTicket(ticket)}
                    data-testid={`helpdesk-row-${ticket.id}`}
                  >
                    <TableCell className="font-mono text-xs">
                      {ticketNoOf(ticket.ticketNo) != null
                        ? `#${String(ticketNoOf(ticket.ticketNo)).padStart(6, "0")}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-1 font-medium">
                        {ticket.title}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {ticket.customer?.company ||
                        ticket.customer?.contactName ||
                        "-"}
                    </TableCell>
                    <TableCell>
                      {ticket.priority === "urgent" ? (
                        <TicketPriorityBadge priority="urgent" />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("support.priority.normal", "普通")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {reason ? <AttentionBadge reason={reason} /> : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {ticket.assignee?.name || (
                        <span className="text-xs text-muted-foreground">
                          {t("support.helpdesk.unassigned", "未分配")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(
                        ticket.lastActivityAt ?? ticket.createdAt
                      )}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {dayjs().format("YYYY-MM-DD HH:mm")} ·{" "}
        {t("support.helpdesk.updatedNow", "以上时间按当前时刻计算")}
      </p>
    </div>
  );
}
