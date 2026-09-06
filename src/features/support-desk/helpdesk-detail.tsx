import { useTranslate } from "@refinedev/core";
import { useState } from "react";
import dayjs from "dayjs";
import { AlarmClockOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { ticketNoOf } from "./api";
import { nextStatus } from "./model";
import type {
  AgentOption,
  MessageVisibility,
  TicketPriority,
  TicketRecord,
} from "./model";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
  VisibilityBadge,
} from "./status-badges";
import { formatDateTime } from "./customer-ticket-list";

export type HelpdeskMessage = {
  id: string;
  body: string;
  visibility: MessageVisibility;
  createdAt: string;
  authorName: string;
};

export interface HelpdeskDetailProps {
  ticket: TicketRecord;
  messages: HelpdeskMessage[];
  agents: AgentOption[];
  busy?: boolean;
  onReply: (body: string, visibility: MessageVisibility) => void;
  onSetPriority: (priority: TicketPriority) => void;
  onAssign: (agentId: string) => void;
  onTransition: (action: "resolve" | "close" | "reopen") => void;
  className?: string;
}

export function HelpdeskDetail({
  ticket,
  messages,
  agents,
  busy = false,
  onReply,
  onSetPriority,
  onAssign,
  onTransition,
  className,
}: HelpdeskDetailProps) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "starter" }, fallback);

  const [replyBody, setReplyBody] = useState("");
  const [visibility, setVisibility] = useState<MessageVisibility>("public");

  const canResolve =
    visibility === "public" && replyBody.trim().length > 0 && !busy;
  const replyAllowed = nextStatus(ticket.status, "reply") !== null;
  const transition = (action: "resolve" | "close" | "reopen") => {
    // Resolve is allowed from pending or processing: it sends the public
    // solution note (which itself completes the first response) and the
    // container applies the status change. Close/reopen follow the state
    // machine strictly.
    if (action !== "resolve" && nextStatus(ticket.status, action) === null) {
      return;
    }
    if (action === "resolve") {
      onReply(replyBody.trim(), "public");
      setReplyBody("");
    }
    onTransition(action);
  };

  const assigneeName = ticket.assignee?.name || "";
  const selectedAgent = agents.find((agent) => agent.id === ticket.assignee?.id);
  const assigneeLabel = assigneeName || selectedAgent?.name || "-";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
        <TicketStatusBadge status={ticket.status} />
        {ticket.priority === "urgent" ? (
          <TicketPriorityBadge priority={ticket.priority} />
        ) : null}
        {ticket.firstRespondedAt == null && ticket.status !== "closed" ? (
          <Badge
            variant="outline"
            data-testid="no-response-badge"
            className="h-6 gap-1 rounded-md border-red-300/80 bg-red-50 px-2 text-[11px] font-medium text-red-700 shadow-none dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-300"
          >
            <AlarmClockOff className="size-3" />
            {t("support.helpdesk.noResponse", "未响应")}
          </Badge>
        ) : null}
        <span className="font-mono text-xs text-muted-foreground">
          {ticketNoOf(ticket.ticketNo) != null
            ? `#${String(ticketNoOf(ticket.ticketNo)).padStart(6, "0")}`
            : "-"}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("support.field.createdAt", "提交时间")}：
          {formatDateTime(ticket.createdAt)}
        </span>
      </div>

      <div className="grid gap-4 px-5 pt-4 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              {t("support.helpdesk.customerRequest", "客户请求")}
            </h3>
            <p className="mt-1 text-sm font-medium">{ticket.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {ticket.description}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {ticket.customer?.company || ticket.customer?.contactName || "-"}
              {ticket.contactEmail ? ` · ${ticket.contactEmail}` : ""}
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium text-foreground">
              {t("support.customer.timeline", "处理进度")}
            </h3>
            {messages.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                {t("support.helpdesk.timelineEmpty", "还没有沟通记录")}
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className="rounded-lg border bg-muted/30 px-4 py-3"
                    data-testid={`helpdesk-message-${message.id}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {message.authorName || "-"}
                      </span>
                      <span>
                        {dayjs(message.createdAt).format("YYYY-MM-DD HH:mm")}
                      </span>
                      <VisibilityBadge visibility={message.visibility} />
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

        <div className="grid content-start gap-4">
          <div className="grid gap-2">
            <Label htmlFor="helpdesk-assignee">
              {t("support.helpdesk.assigneeLabel", "负责客服")}
            </Label>
            <Select
              value={ticket.assignee?.id ?? ""}
              onValueChange={(value) => value && onAssign(value)}
              disabled={busy}
            >
              <SelectTrigger id="helpdesk-assignee" aria-label={t("support.helpdesk.assigneeLabel", "负责客服")} className="w-full">
                <SelectValue>{assigneeLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name || agent.id}
                    {!agent.onDuty
                      ? ` · ${t("support.helpdesk.offDuty", "不在岗")}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t("support.customer.priorityLabel", "紧急程度")}</Label>
            <div className="flex gap-2">
              {(["normal", "urgent"] as TicketPriority[]).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={ticket.priority === value ? "secondary" : "outline"}
                  disabled={busy || ticket.priority === value}
                  onClick={() => onSetPriority(value)}
                >
                  {t(
                    value === "urgent"
                      ? "support.priority.urgent"
                      : "support.priority.normal",
                    value === "urgent" ? "紧急" : "普通"
                  )}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="helpdesk-reply-body">
              {t("support.helpdesk.replyLabel", "回复 / 备注")}
            </Label>
            <Textarea
              id="helpdesk-reply-body"
              aria-label={t("support.helpdesk.replyLabel", "回复 / 备注")}
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              rows={4}
              placeholder={t(
                "support.helpdesk.replyPlaceholder",
                "写给客户的回复，或仅团队可见的内部备注"
              )}
              disabled={busy}
            />
            <RadioGroup
              value={visibility}
              onValueChange={(value) => setVisibility(value as MessageVisibility)}
              className="flex flex-row gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="public" id="visibility-public" />
                <Label htmlFor="visibility-public" className="font-normal">
                  {t("support.visibility.public", "客户可见")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="internal" id="visibility-internal" />
                <Label htmlFor="visibility-internal" className="font-normal">
                  {t("support.visibility.internal", "内部备注")}
                </Label>
              </div>
            </RadioGroup>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy || !replyBody.trim() || !replyAllowed}
                onClick={() => {
                  onReply(replyBody.trim(), visibility);
                  setReplyBody("");
                }}
              >
                {t("support.helpdesk.reply", "发送")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canResolve || !replyAllowed}
                title={
                  visibility !== "public"
                    ? t(
                        "support.helpdesk.resolveNeedsPublic",
                        "标记解决需选择“客户可见”并填写解决说明"
                      )
                    : replyBody.trim()
                      ? undefined
                      : t(
                          "support.helpdesk.resolveNeedsBody",
                          "请先输入解决说明"
                        )
                }
                onClick={() => transition("resolve")}
              >
                {t("support.helpdesk.resolve", "标记解决")}
              </Button>
            </div>
            {visibility === "internal" ? (
              <p className="text-xs text-muted-foreground">
                {t(
                  "support.helpdesk.internalHint",
                  "内部备注不会展示给客户；标记解决需要先发送公开的解决说明。"
                )}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {ticket.status === "resolved" ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => transition("close")}
                >
                  {t("support.helpdesk.close", "关闭工单")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => transition("reopen")}
                >
                  {t("support.helpdesk.reopen", "退回处理")}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
