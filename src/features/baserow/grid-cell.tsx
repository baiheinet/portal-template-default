"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { FloatingPanel, ChoiceChip } from "./ui-primitives";
import {
  displayCell,
  emptyCellValue,
  getChoice,
  type BaserowField,
  type CellValue,
  type RowHeight,
} from "./model";

const LONG_TEXT_LINES: Record<RowHeight, number> = { compact: 1, regular: 3, tall: 5 };

function useAutoFocus(selectAll = false) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.focus();
    if (selectAll && "select" in node && typeof node.select === "function") node.select();
  }, [selectAll]);
  return ref;
}

/* ---------------------------------------------------------------- */
/* Read-only display                                                 */
/* ---------------------------------------------------------------- */

export function CellDisplay({ field, value, rowHeight }: { field: BaserowField; value: CellValue; rowHeight: RowHeight }) {
  switch (field.type) {
    case "boolean":
      return (
        <span
          aria-checked={value === true}
          role="checkbox"
          className={cn(
            "pointer-events-none inline-flex size-[15px] items-center justify-center rounded border transition",
            value === true ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 bg-background",
          )}
        >
          {value === true && <Check className="size-3" strokeWidth={3} />}
        </span>
      );
    case "rating": {
      const max = field.ratingMax ?? 5;
      const current = typeof value === "number" ? value : 0;
      return (
        <span className="flex items-center gap-0.5 text-[13px] leading-none">
          {Array.from({ length: max }, (_, index) => (
            <span key={index} className={index < current ? "text-amber-500" : "text-muted-foreground/30"}>★</span>
          ))}
        </span>
      );
    }
    case "singleSelect": {
      const choiceId = typeof value === "string" ? value : null;
      const choice = choiceId ? getChoice(field, choiceId) : undefined;
      return choice ? <ChoiceChip choice={choice} /> : null;
    }
    case "multiSelect": {
      const ids = Array.isArray(value) ? value : [];
      if (ids.length === 0) return null;
      return (
        <span className="flex min-w-0 flex-wrap items-center gap-1 overflow-hidden" style={{ maxHeight: LONG_TEXT_LINES[rowHeight] * 18 }}>
          {ids.map((id) => {
            const choice = getChoice(field, id);
            return choice ? <ChoiceChip key={id} choice={choice} /> : null;
          })}
        </span>
      );
    }
    case "number":
      return <span>{typeof value === "number" ? value.toLocaleString("zh-CN") : ""}</span>;
    case "longText":
      return (
        <span className="whitespace-pre-wrap break-words text-left leading-snug">{displayCell(field, value)}</span>
      );
    default:
      return <span className="truncate">{displayCell(field, value)}</span>;
  }
}

/* ---------------------------------------------------------------- */
/* Select picker panel                                               */
/* ---------------------------------------------------------------- */

interface PickerProps {
  field: BaserowField;
  value: CellValue;
  anchorRect: DOMRect | null;
  multiple: boolean;
  onPick: (next: CellValue) => void;
  onClose: () => void;
}

export function SelectPickerPanel({ field, value, anchorRect, multiple, onPick, onClose }: PickerProps) {
  const choices = field.choices ?? [];
  const selected = multiple ? (Array.isArray(value) ? value : []) : typeof value === "string" && value ? [value] : [];

  const toggle = (choiceId: string) => {
    if (!multiple) {
      onPick(selected[0] === choiceId ? emptyCellValue(field) : choiceId);
      onClose();
      return;
    }
    const next = selected.includes(choiceId)
      ? selected.filter((id) => id !== choiceId)
      : [...selected, choiceId];
    onPick(next);
  };

  return (
    <FloatingPanel anchorRect={anchorRect} onClose={onClose} width={236}>
      <div role="presentation" className="p-1">
        <p className="px-2 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {multiple ? "多选字段" : "单选字段"}
        </p>
        {choices.map((choice) => {
          const active = selected.includes(choice.id);
          return (
            <button
              key={choice.id}
              type="button"
              role="option"
              aria-selected={active}
              data-baserow-choice={choice.name}
              onClick={() => toggle(choice.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-accent",
                active && "bg-accent/70",
              )}
            >
              <ChoiceChip choice={choice} />
              {active && <Check className="ml-auto size-3.5 text-primary" />}
            </button>
          );
        })}
        {!multiple && (
          <button
            type="button"
            onClick={() => {
              onPick(emptyCellValue(field));
              onClose();
            }}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            清除选择
          </button>
        )}
      </div>
    </FloatingPanel>
  );
}

/* ---------------------------------------------------------------- */
/* Inline text editors                                               */
/* ---------------------------------------------------------------- */

interface EditorPaths {
  commit: (raw: unknown) => void;
  cancel: () => void;
  moveDown?: () => void;
}

export function TextCellEditor({
  field,
  value,
  multiline,
  seedText,
  paths,
}: {
  field: BaserowField;
  value: CellValue;
  multiline: boolean;
  seedText?: string | null;
  paths: EditorPaths;
}) {
  const [draft, setDraft] = useState(() =>
    seedText !== null && seedText !== undefined ? seedText : value === null || value === undefined ? "" : String(value),
  );
  const inputRef = useAutoFocus(!multiline);

  if (multiline) {
    return (
      <textarea
        ref={(node) => {
          if (node) inputRef.current = node;
        }}
        data-baserow-editor="longText"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => paths.commit(draft)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            paths.cancel();
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            paths.commit(draft);
            paths.cancel();
          }
        }}
        placeholder="输入长文本，Ctrl+Enter 保存"
        className="absolute inset-x-1 top-0 z-40 min-h-[88px] w-[calc(100%-8px)] rounded-lg border bg-popover px-2 py-1.5 text-sm shadow-xl outline-none ring-2 ring-ring/40"
      />
    );
  }

  const numeric = field.type === "number";
  return (
    <input
      ref={(node) => {
        if (node) inputRef.current = node;
      }}
      data-baserow-editor={field.type}
      type={field.type === "date" ? "date" : "text"}
      inputMode={numeric ? "decimal" : undefined}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => paths.commit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          paths.cancel();
        }
        if (event.key === "Enter") {
          event.preventDefault();
          paths.commit(draft);
          // Close the editor before moving focus so the committed text renders.
          paths.cancel();
          paths.moveDown?.();
        }
      }}
      placeholder={numeric ? "0" : undefined}
      className="h-full w-full bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground/50"
    />
  );
}

/* ---------------------------------------------------------------- */
/* Direct-manipulation controls                                      */
/* ---------------------------------------------------------------- */

export function BooleanControl({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <span
      role="checkbox"
      aria-checked={value}
      data-testid="baserow-boolean"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        "inline-flex size-[15px] cursor-pointer items-center justify-center rounded border transition",
        value ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 bg-background hover:border-primary/60",
      )}
    >
      {value && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}

export function RatingControl({
  max,
  value,
  onChange,
}: {
  max: number;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, index) => {
        const filled = index < value;
        return (
          <span
            key={index}
            role="button"
            aria-label={"评分为 " + (index + 1)}
            onClick={(event) => {
              event.stopPropagation();
              onChange(filled && value === index + 1 ? index : index + 1);
            }}
            className={cn(
              "cursor-pointer text-[13px] leading-none transition",
              filled ? "text-amber-500" : "text-muted-foreground/30 hover:text-amber-300",
            )}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* Cell orchestrator                                                 */
/* ---------------------------------------------------------------- */

export interface GridCellProps {
  field: BaserowField;
  value: CellValue;
  rowHeight: RowHeight;
  active: boolean;
  editing: boolean;
  seedText?: string | null;
  alignRight?: boolean;
  onActivate: () => void;
  onStartEdit: (anchorRect: DOMRect | null) => void;
  onCommitRaw: (raw: unknown) => void;
  onCancelEdit: () => void;
  onEditMoveDown: () => void;
}

const INLINE_EDITOR_TYPES = ["text", "longText", "number", "date"];
const SELECT_TYPES = ["singleSelect", "multiSelect"];

export function GridCell({
  field,
  value,
  rowHeight,
  active,
  editing,
  seedText,
  alignRight,
  onActivate,
  onStartEdit,
  onCommitRaw,
  onCancelEdit,
  onEditMoveDown,
}: GridCellProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [pickerAnchor, setPickerAnchor] = useState<DOMRect | null>(null);
  const isSelect = SELECT_TYPES.includes(field.type);
  const isInline = INLINE_EDITOR_TYPES.includes(field.type);

  useEffect(() => {
    if (!editing || !isSelect) return;
    setPickerAnchor(hostRef.current?.getBoundingClientRect() ?? null);
  }, [editing, isSelect]);

  if (editing && isSelect) {
    return (
      <div className="relative h-full w-full">
        <div ref={hostRef} className="flex h-full w-full items-center px-2">
          <CellDisplay field={field} value={value} rowHeight={rowHeight} />
        </div>
        <SelectPickerPanel
          field={field}
          value={value}
          anchorRect={pickerAnchor}
          multiple={field.type === "multiSelect"}
          onPick={onCommitRaw}
          onClose={onCancelEdit}
        />
      </div>
    );
  }

  if (editing && isInline) {
    return (
      <div className="relative h-full w-full">
        <TextCellEditor
          field={field}
          value={value}
          multiline={field.type === "longText"}
          seedText={seedText}
          paths={{ commit: onCommitRaw, cancel: onCancelEdit, moveDown: onEditMoveDown }}
        />
      </div>
    );
  }

  let control: ReactNode;
  if (field.type === "boolean") {
    const checked = value === true;
    control = <BooleanControl value={checked} onToggle={() => onCommitRaw(!checked)} />;
  } else if (field.type === "rating") {
    control = (
      <RatingControl max={field.ratingMax ?? 5} value={typeof value === "number" ? value : 0} onChange={(next) => onCommitRaw(next)} />
    );
  } else {
    control = <CellDisplay field={field} value={value} rowHeight={rowHeight} />;
  }

  return (
    <div
      ref={hostRef}
      tabIndex={-1}
      data-baserow-cell-active={active ? "true" : undefined}
      className={cn(
        "flex h-full w-full cursor-default select-none items-center overflow-hidden px-2 text-sm outline-none",
        alignRight && "justify-end tabular-nums",
        (field.type === "boolean") && "justify-center",
      )}
      onMouseDown={(event) => {
        event.preventDefault();
        onActivate();
      }}
      onDoubleClick={() => {
        if (!isInline && !isSelect) return;
        onStartEdit(hostRef.current?.getBoundingClientRect() ?? null);
      }}
    >
      {control}
    </div>
  );
}