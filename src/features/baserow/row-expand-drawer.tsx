"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Copy, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { useBaserow } from "./store";
import { BooleanControl, RatingControl } from "./grid-cell";
import { ChoiceChip, FieldTypeIcon } from "./ui-primitives";
import { getChoice, type BaserowField, type BaserowRow, type CellValue } from "./model";

export interface RowExpandDrawerProps {
  tableId: string;
  fields: BaserowField[];
  row: BaserowRow | null;
  position: number;
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateRow: (delta: number) => void;
}

export function RowExpandDrawer({
  tableId,
  fields,
  row,
  position,
  total,
  open,
  onOpenChange,
  onNavigateRow,
}: RowExpandDrawerProps) {
  const { dispatch } = useBaserow();

  const commit = (field: BaserowField, raw: unknown) => {
    if (!row) return;
    dispatch({ type: "updateCell", tableId, rowId: row.id, fieldId: field.id, raw });
  };

  const rowIndexLabel = useMemo(
    () => (row ? "第 " + (position + 1) + " 行，共 " + total + " 行" : ""),
    [row, position, total],
  );

  return (
    <Drawer open={open && Boolean(row)} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh]">
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden">
          <DrawerHeader className="flex-row items-center justify-between border-b">            <div>
              <DrawerTitle>行详情</DrawerTitle>
              <p className="text-xs text-muted-foreground">{rowIndexLabel}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" size="icon" variant="ghost" className="size-7" aria-label="上一行" disabled={position <= 0} onClick={() => onNavigateRow(-1)}><ChevronLeft /></Button>
              <Button type="button" size="icon" variant="ghost" className="size-7" aria-label="下一行" disabled={position >= total - 1} onClick={() => onNavigateRow(1)}><ChevronRight /></Button>
            </div>
          </DrawerHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {row ? fields.map((field) => (
              <div key={field.id} className="grid grid-cols-[130px_minmax(0,1fr)] items-start gap-3">
                <div className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
                  <FieldTypeIcon type={field.type} className="size-3.5 opacity-70" />
                  <span className="truncate">{field.name}</span>
                </div>
                <ExpandControl field={field} value={row.cells[field.id] ?? null} onCommit={(raw) => commit(field, raw)} />
              </div>
            )) : null}
          </div>
          <DrawerFooter className="flex-row items-center justify-between gap-2 border-t">
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant="outline" disabled={!row} onClick={() => row && dispatch({ type: "duplicateRow", tableId, rowId: row.id })}><Copy /> 复制行</Button>
              <Button type="button" size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={!row} onClick={() => { if (row) { dispatch({ type: "deleteRows", tableId, rowIds: [row.id] }); onOpenChange(false); } }}>
                <Trash2 /> 删除行
              </Button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>改动实时保存到本地演示数据。</span>
              <Button type="button" size="sm" variant="secondary" onClick={() => onOpenChange(false)}>关闭</Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ExpandControl({
  field,
  value,
  onCommit,
}: {
  field: BaserowField;
  value: CellValue;
  onCommit: (raw: unknown) => void;
}) {
  const controlKey = field.type + "-" + field.id;

  if (field.type === "boolean") {
    return (
      <span className="flex items-center gap-2 pt-1.5"><Checkbox checked={value === true} onCheckedChange={(checked) => onCommit(checked === true)} aria-label={"设置字段 " + field.name} data-testid={"baserow-expand-" + field.id} /> <BooleanControl value={value === true} onToggle={() => onCommit(!(value === true))} /></span>
    );
  }
  if (field.type === "rating") {
    return (
      <span className="pt-1"><RatingControl max={field.ratingMax ?? 5} value={typeof value === "number" ? value : 0} onChange={onCommit} /></span>
    );
  }
  if (field.type === "singleSelect") {
    return (
      <NativeSelect
        key={controlKey}
        aria-label={"选择字段 " + field.name}
        data-testid={"baserow-expand-" + field.id}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onCommit(event.target.value || null)}
        className="h-8 max-w-xs text-sm"
      >
        <NativeSelectOption value="">未选择</NativeSelectOption>
        {(field.choices ?? []).map((choiceItem) => <NativeSelectOption key={choiceItem.id} value={choiceItem.id}>{choiceItem.name}</NativeSelectOption>)}
      </NativeSelect>
    );
  }
  if (field.type === "multiSelect") {
    const ids = Array.isArray(value) ? value : [];
    const remaining = (field.choices ?? []).filter((choiceItem) => !ids.includes(choiceItem.id));
    return (
      <div className="space-y-1.5" data-testid={"baserow-expand-" + field.id}>
        <div className="flex min-h-7 flex-wrap items-center gap-1">
          {ids.length === 0 ? <span className="text-xs text-muted-foreground">点击下方下拉框添加标签。</span> : ids.map((id) => {
            const choice = getChoice(field, id);
            if (!choice) return null;
            return <ChoiceChip key={id} choice={choice} removable onRemove={() => onCommit(ids.filter((existing) => existing !== id))} />;
          })}
        </div>
        <NativeSelect
          aria-label={"添加标签 " + field.name}
          value=""
          disabled={remaining.length === 0}
          onChange={(event) => {
            const nextId = event.target.value;
            if (nextId) onCommit([...ids, nextId]);
          }}
          className="h-8 max-w-xs text-xs"
        >
          <NativeSelectOption value="">添加标签…</NativeSelectOption>
          {remaining.map((choiceItem) => <NativeSelectOption key={choiceItem.id} value={choiceItem.id}>{choiceItem.name}</NativeSelectOption>)}
        </NativeSelect>
      </div>
    );
  }
  if (field.type === "longText") {
    return (
      <Textarea
        key={controlKey}
        defaultValue={typeof value === "string" ? value : ""}
        onBlur={(event) => onCommit(event.target.value)}
        aria-label={"编辑字段 " + field.name}
        data-testid={"baserow-expand-" + field.id}
        className="min-h-[90px] text-sm"
      />
    );
  }
  if (field.type === "date") {
    return (
      <Input
        key={controlKey}
        type="date"
        defaultValue={typeof value === "string" ? value.slice(0, 10) : ""}
        onBlur={(event) => onCommit(event.target.value)}
        aria-label={"编辑字段 " + field.name}
        data-testid={"baserow-expand-" + field.id}
        className="h-8 w-44 text-sm"
      />
    );
  }
  return (
    <Input
      key={controlKey}
      defaultValue={value === null || value === undefined ? "" : String(value)}
      inputMode={field.type === "number" ? "decimal" : undefined}
      onBlur={(event) => onCommit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      aria-label={"编辑字段 " + field.name}
      data-testid={"baserow-expand-" + field.id}
      className="h-8 text-sm"
    />
  );
}