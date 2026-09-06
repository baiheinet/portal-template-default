import { useTranslate } from "@refinedev/core";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  ATTENTION_LABEL_KEYS,
  PRIORITY_LABEL_KEYS,
  STATUS_LABEL_KEYS,
  VISIBILITY_LABEL_KEYS,
} from "./api";
import type { AttentionReason } from "./model";

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
  processing: "border-blue-300/70 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300",
  resolved: "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  closed: "border-neutral-300/70 bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400",
};

const PRIORITY_STYLES: Record<string, string> = {
  normal: "border-neutral-300/70 bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400",
  urgent: "border-red-300/70 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300",
};

const ATTENTION_STYLES: Record<string, string> = {
  urgentUnanswered: "border-red-300/80 bg-red-50 text-red-700 dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-300",
  overdue: "border-orange-300/80 bg-orange-50 text-orange-800 dark:border-orange-800/70 dark:bg-orange-950/50 dark:text-orange-300",
  nearTimeout: "border-amber-300/80 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-300",
  stale: "border-purple-300/80 bg-purple-50 text-purple-800 dark:border-purple-800/70 dark:bg-purple-950/50 dark:text-purple-300",
};

export function TicketStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const translate = useTranslate();
  const key = (status ?? "") as keyof typeof STATUS_LABEL_KEYS;
  const label = STATUS_LABEL_KEYS[key]
    ? translate(STATUS_LABEL_KEYS[key], { ns: "starter" }, key)
    : (status ?? "-");

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 rounded-md border-border/80 bg-card px-2 text-[11px] font-medium shadow-none",
        STATUS_STYLES[key] ?? "",
        className
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}

export function TicketPriorityBadge({
  priority,
  className,
}: {
  priority: string | null | undefined;
  className?: string;
}) {
  const translate = useTranslate();
  const key = (priority ?? "") as keyof typeof PRIORITY_LABEL_KEYS;
  const label = PRIORITY_LABEL_KEYS[key]
    ? translate(PRIORITY_LABEL_KEYS[key], { ns: "starter" }, key)
    : (priority ?? "-");

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 rounded-md border-border/80 bg-card px-2 text-[11px] font-medium shadow-none",
        PRIORITY_STYLES[key] ?? "",
        className
      )}
    >
      {label}
    </Badge>
  );
}

export function AttentionBadge({
  reason,
  className,
}: {
  reason: AttentionReason;
  className?: string;
}) {
  const translate = useTranslate();
  const labelKey = ATTENTION_LABEL_KEYS[reason];

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 rounded-md px-2 text-[11px] font-medium shadow-none",
        ATTENTION_STYLES[reason] ?? "",
        className
      )}
    >
      {translate(labelKey, { ns: "starter" }, reason)}
    </Badge>
  );
}

export function VisibilityBadge({
  visibility,
  className,
}: {
  visibility: string | null | undefined;
  className?: string;
}) {
  const translate = useTranslate();
  const key = (visibility ?? "") as keyof typeof VISIBILITY_LABEL_KEYS;
  const label = VISIBILITY_LABEL_KEYS[key]
    ? translate(VISIBILITY_LABEL_KEYS[key], { ns: "starter" }, key)
    : (visibility ?? "-");

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-md border-border/80 bg-card px-2 text-[11px] font-normal text-muted-foreground shadow-none",
        key === "internal" && "border-dashed",
        className
      )}
    >
      {label}
    </Badge>
  );
}
