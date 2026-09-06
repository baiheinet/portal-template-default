import { useTranslate } from "@refinedev/core";
import dayjs from "dayjs";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import type { TicketRecord, TicketStatus } from "./model";
import { TicketPriorityBadge, TicketStatusBadge } from "./status-badges";

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm") : "-";
}

export type CustomerTicketListProps = {
  tickets: TicketRecord[];
  activeStatus: TicketStatus | "all";
  onStatusChange: (status: TicketStatus | "all") => void;
  onOpenTicket?: (ticket: TicketRecord) => void;
  loading?: boolean;
  className?: string;
};

export function CustomerTicketList({
  tickets,
  activeStatus,
  onStatusChange,
  onOpenTicket,
  loading = false,
  className,
}: CustomerTicketListProps) {
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
      <div className="mb-3 flex flex-wrap gap-2">
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
              <TableHead className="w-24">
                {t("support.field.status", "状态")}
              </TableHead>
              <TableHead className="w-20">
                {t("support.field.priority", "紧急度")}
              </TableHead>
              <TableHead className="w-40">
                {t("support.field.createdAt", "提交时间")}
              </TableHead>
              <TableHead className="w-10" aria-hidden="true" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {t("support.customer.listEmpty", "还没有提交过问题")}
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const no = ticketNoOf(ticket.ticketNo);
                return (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer"
                    onClick={() => onOpenTicket?.(ticket)}
                    data-testid={`ticket-row-${ticket.id}`}
                  >
                    <TableCell className="font-mono text-xs">
                      {no != null ? `#${String(no).padStart(6, "0")}` : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-1 font-medium">
                        {ticket.title}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TicketStatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      {ticket.priority === "urgent" ? (
                        <TicketPriorityBadge priority="urgent" />
                      ) : (
                        <Badge
                          variant="outline"
                          className="h-6 rounded-md border-transparent bg-transparent px-2 text-[11px] font-normal text-muted-foreground shadow-none"
                        >
                          {t("support.priority.normal", "普通")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(ticket.createdAt)}
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
    </div>
  );
}
