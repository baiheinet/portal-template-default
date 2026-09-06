import { useTranslate } from "@refinedev/core";
import dayjs from "dayjs";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ticketNoOf } from "./api";
import { classifyAttention } from "./model";
import type { AgentOption, TicketRecord } from "./model";
import { AttentionBadge } from "./status-badges";
import { formatDateTime } from "./customer-ticket-list";

export interface OverviewCardsProps {
  openCount: number;
  overdueToday: number;
  resolvedLast7Days: number;
  attention: TicketRecord[];
  workload: Array<{ agent: AgentOption; open: number }>;
  recentResolved: TicketRecord[];
  onOpenTicket?: (ticket: TicketRecord) => void;
  nowMs?: number;
  className?: string;
}

function KpiCard({
  label,
  value,
  tone,
  hint,
  testId,
}: {
  label: string;
  value: number;
  tone: "neutral" | "warning" | "success";
  hint?: string;
  testId: string;
}) {
  return (
    <Card className="py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p
          data-testid={testId}
          className={cn(
            "text-3xl font-semibold tracking-[-0.02em]",
            tone === "warning" && "text-orange-600 dark:text-orange-400",
            tone === "success" && "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function OverviewCards({
  openCount,
  overdueToday,
  resolvedLast7Days,
  attention,
  workload,
  recentResolved,
  onOpenTicket,
  nowMs = Date.now(),
  className,
}: OverviewCardsProps) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "starter" }, fallback);

  const maxOpen = Math.max(1, ...workload.map((row) => row.open));

  return (
    <div className={cn("grid gap-6", className)}>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          testId="kpi-open-count"
          label={t("support.overview.openCount", "未处理工单")}
          value={openCount}
          tone="neutral"
          hint={t("support.overview.openCountHint", "待响应 + 处理中")}
        />
        <KpiCard
          testId="kpi-overdue-today"
          label={t("support.overview.overdueToday", "今日超时未响应")}
          value={overdueToday}
          tone="warning"
          hint={t("support.overview.overdueHint", "需要立即跟进")}
        />
        <KpiCard
          testId="kpi-resolved-7d"
          label={t("support.overview.resolved7d", "近 7 天解决")}
          value={resolvedLast7Days}
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {t("support.overview.attentionTitle", "需要关注")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t(
                  "support.overview.attentionEmpty",
                  "暂无需要关注的工单，状态良好。"
                )}
              </p>
            ) : (
              <ol className="flex flex-col gap-2">
                {attention.slice(0, 10).map((ticket) => (
                  <li key={ticket.id} data-testid={`attention-item-${ticket.id}`}>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto w-full justify-between gap-3 px-4 py-3 text-left"
                      onClick={() => onOpenTicket?.(ticket)}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {ticketNoOf(ticket.ticketNo) != null
                            ? `#${String(ticketNoOf(ticket.ticketNo)).padStart(6, "0")}`
                            : "-"}
                        </span>
                        <span className="line-clamp-1 text-sm font-medium">
                          {ticket.title}
                        </span>
                        <AttentionReasonBadge ticket={ticket} nowMs={nowMs} />
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        {formatDateTime(ticket.lastActivityAt ?? ticket.createdAt)}
                        <ChevronRight className="size-4" />
                      </span>
                    </Button>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("support.overview.workloadTitle", "客服在办量")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {workload.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  {t("support.overview.workloadEmpty", "暂无客服数据")}
                </p>
              ) : (
                workload.map(({ agent, open }) => (
                  <div key={agent.id} className="grid gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{agent.name || agent.id}</span>
                      <span className="font-medium tabular-nums">{open}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${Math.round((open / maxOpen) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("support.overview.recentResolved", "最近解决")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentResolved.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  {t("support.overview.recentEmpty", "最近 7 天还没有解决记录")}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {recentResolved.slice(0, 5).map((ticket) => (
                    <li
                      key={ticket.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="line-clamp-1 text-sm">{ticket.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {dayjs(ticket.resolvedAt ?? ticket.createdAt).format(
                          "MM-DD HH:mm"
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AttentionReasonBadge({
  ticket,
  nowMs,
}: {
  ticket: TicketRecord;
  nowMs: number;
}) {
  const reason = classifyAttention(ticket, nowMs);
  if (!reason) return null;
  return <AttentionBadge reason={reason} />;
}
