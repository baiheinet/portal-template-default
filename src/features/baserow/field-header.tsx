"use client";

import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowDownAZ, ArrowUpAZ, ArrowLeftRight, ChevronDown, EyeOff, Pencil, Trash2, XCircle, MoveLeft, MoveRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { useBaserow } from "./store";
import { FieldTypeIcon } from "./ui-primitives";
import { ALL_FIELD_TYPES, FIELD_TYPE_LABELS, type BaserowField, type SortSpec } from "./model";

export interface FieldHeaderProps {
  tableId: string;
  field: BaserowField;
  sort: SortSpec | undefined;
  onToggleSort: (direction: "asc" | "desc") => void;
  onClearSort: () => void;
  onHide: () => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export function FieldHeader({
  tableId,
  field,
  sort,
  onToggleSort,
  onClearSort,
  onHide,
  onResizeStart,
}: FieldHeaderProps) {
  const { dispatch } = useBaserow();
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(field.name);

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (trimmed.length > 0 && trimmed !== field.name) {
      dispatch({ type: "updateField", tableId, fieldId: field.id, patch: { name: trimmed } });
    }
    setRenaming(false);
  };

  return (
    <div className="group relative flex h-full min-w-0 items-center gap-1 px-2" data-testid={"baserow-header-" + field.id}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded px-1 text-left text-[13px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground data-[state=open]:bg-accent"
            />
          }
        >
          <FieldTypeIcon type={field.type} className="size-3.5 shrink-0 opacity-70" />
          <span className="truncate">{field.name}</span>
          {sort ? <ArrowUpAZ className="size-3 shrink-0 text-primary" /> : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {renaming ? (
            <form
              className="flex items-center gap-1 p-1"
              onSubmit={(event) => {
                event.preventDefault();
                commitRename();
              }}
            >
              <Input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setRenaming(false);
                }}
                className="h-7 text-xs"
                aria-label="字段名称"
              />
              <Button type="submit" size="icon" variant="ghost" className="size-7" aria-label="确认名称">
                <Check />
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <FieldTypeIcon type={field.type} />
              <span className="truncate text-sm font-medium">{field.name}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">{FIELD_TYPE_LABELS[field.type]}</span>
            </div>
          )}
          {!renaming && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  setDraftName(field.name);
                  setRenaming(true);
                }}
              >
                <Pencil /> 重命名
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowLeftRight /> 字段类型
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-72 overflow-auto">
                  {ALL_FIELD_TYPES.map((type) => (
                    <DropdownMenuItem
                      key={type}
                      disabled={type === field.type}
                      onSelect={() => dispatch({ type: "updateField", tableId, fieldId: field.id, patch: { type } })}
                    >
                      <FieldTypeIcon type={type} /> {FIELD_TYPE_LABELS[type]}
                      {type === field.type ? <Check className="ml-auto size-3.5" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onToggleSort("asc")}>
                <ArrowDownAZ /> 升序排序
                {sort?.direction === "asc" ? <Check className="ml-auto size-3.5 text-primary" /> : null}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onToggleSort("desc")}>
                <ArrowUpAZ /> 降序排序
                {sort?.direction === "desc" ? <Check className="ml-auto size-3.5 text-primary" /> : null}
              </DropdownMenuItem>
              {sort ? (
                <DropdownMenuItem onSelect={onClearSort}>
                  <XCircle /> 清除该列排序
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => dispatch({ type: "moveField", tableId, fieldId: field.id, direction: -1 })}>
                <MoveLeft /> 左移一列
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => dispatch({ type: "moveField", tableId, fieldId: field.id, direction: 1 })}>
                <MoveRight /> 右移一列
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onHide}>
                <EyeOff /> 隐藏字段
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => dispatch({ type: "deleteField", tableId, fieldId: field.id })}
              >
                <Trash2 /> 删除字段
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ChevronDown className="size-3 shrink-0 text-muted-foreground/50" aria-hidden="true" />
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={"调整列宽 " + field.name}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onResizeStart(event);
        }}
        className="absolute inset-y-1 right-0 z-10 w-1.5 cursor-col-resize touch-none rounded opacity-0 transition group-hover:opacity-100 hover:bg-primary/40"
      />
    </div>
  );
}