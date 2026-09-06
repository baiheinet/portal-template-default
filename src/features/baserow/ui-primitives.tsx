"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignLeft,
  CalendarDays,
  Circle,
  Hash,
  Star,
  SquareCheck,
  Tags,
  Type,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

import type { BaserowFieldType, ChipColor, SelectChoice } from "./model";

/* ------------------------------------------------------------------ */
/* Choice chips                                                        */
/* ------------------------------------------------------------------ */

export const CHIP_STYLES: Record<ChipColor, { backgroundColor: string; color: string }> = {
  blue: { backgroundColor: "#ccdaff", color: "#1046ad" },
  green: { backgroundColor: "#c4f0c8", color: "#1f6f34" },
  yellow: { backgroundColor: "#ffeab6", color: "#846224" },
  red: { backgroundColor: "#ffd3dc", color: "#a81d44" },
  orange: { backgroundColor: "#ffe0c2", color: "#96491a" },
  purple: { backgroundColor: "#e7d9ff", color: "#6233b8" },
  teal: { backgroundColor: "#c6efee", color: "#086b64" },
  slate: { backgroundColor: "#e3e8ef", color: "#39485e" },
};

export function ChoiceChip({
  choice,
  className,
  removable,
  onRemove,
}: {
  choice: SelectChoice;
  className?: string;
  removable?: boolean;
  onRemove?: () => void;
}) {
  const style = CHIP_STYLES[choice.color] ?? CHIP_STYLES.slate;
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-px text-[11px] font-medium leading-4",
        className,
      )}
      style={{ backgroundColor: style.backgroundColor, color: style.color }}
    >
      <span className="truncate">{choice.name}</span>
      {removable && (
        <button
          type="button"
          aria-label={"移除标签 " + choice.name}
          className="rounded-sm opacity-60 transition hover:opacity-100"
          onPointerDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onRemove?.();
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Field type icons                                                    */
/* ------------------------------------------------------------------ */

const FIELD_TYPE_ICONS: Record<BaserowFieldType, LucideIcon> = {
  text: Type,
  longText: AlignLeft,
  number: Hash,
  singleSelect: Circle,
  multiSelect: Tags,
  date: CalendarDays,
  boolean: SquareCheck,
  rating: Star,
};

export function FieldTypeIcon({ type, className }: { type: BaserowFieldType; className?: string }) {
  const Icon = FIELD_TYPE_ICONS[type];
  return <Icon className={cn("size-3.5", className)} />;
}

/* ------------------------------------------------------------------ */
/* Floating panel                                                      */
/* ------------------------------------------------------------------ */

/**
 * Renders children in a fixed-position layer near an anchor rectangle.
 * position: fixed keeps the panel clear of the scrolling grid container:
 * no clipped popups and no stretched scroll extents.
 */
export function FloatingPanel({
  anchorRect,
  onClose,
  children,
  width = 248,
  align = "start",
}: {
  anchorRect: DOMRect | null;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  align?: "start" | "end";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!anchorRect) return;
    const margin = 4;
    let left = align === "end" ? anchorRect.right - width : anchorRect.left;
    left = Math.min(Math.max(left, 8), Math.max(window.innerWidth - width - 8, 8));
    const estimatedTop = anchorRect.bottom + margin;
    const fallbackTop = Math.max(8, Math.min(estimatedTop, window.innerHeight - 320));
    setStyle({ left, top: estimatedTop > window.innerHeight - 80 ? fallbackTop : estimatedTop });
  }, [anchorRect, width, align]);

  useEffect(() => {
    if (!anchorRect) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-floating-anchor='true']")) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [anchorRect, onClose]);

  if (!anchorRect || !style) return null;

  return (
    <div
      ref={panelRef}
      role="listbox"
      data-baserow-floating-panel="true"
      className="fixed z-[70] max-h-72 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg"
      style={{ left: style.left, top: style.top, width }}
    >
      {children}
    </div>
  );
}
