"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpToLine, Copy, Ellipsis, Maximize2, Plus, Rows3, Table2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useBaserow } from "./store";
import { FieldHeader } from "./field-header";
import { GridCell } from "./grid-cell";
import { ALL_FIELD_TYPES, FIELD_TYPE_LABELS, createNewField, emptyCellValue, type BaserowTable, type SortSpec, type ViewPrefs, type VisibleRow } from "./model";

const GUTTER_WIDTH = 52;
const ADD_COLUMN_WIDTH = 48;

const INLINE_EDITOR_TYPES = ["text", "longText", "number", "date"];
const SELECT_EDITOR_TYPES = ["singleSelect", "multiSelect"];

interface CellPosition {
  rowIndex: number;
  columnIndex: number;
}

interface EditingPosition extends CellPosition {
  seedText: string | null;
}

export interface GridViewProps {
  table: BaserowTable;
  rows: VisibleRow[];
  prefs: ViewPrefs;
  expandedRowId: string | null;
  onExpandRow: (rowId: string | null) => void;
  onPrefsChange: (patch: Partial<ViewPrefs>) => void;
}

export function GridView({ table, rows, prefs, expandedRowId, onExpandRow, onPrefsChange }: GridViewProps) {
  const { dispatch } = useBaserow();
  const [active, setActive] = useState<CellPosition | null>(null);
  const [editing, setEditing] = useState<EditingPosition | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLTableCellElement>());
  const resizingRef = useRef<{ fieldId: string; startX: number; startWidth: number } | null>(null);

  const fields = useMemo(
    () => table.fields.filter((field) => !prefs.hiddenFieldIds.includes(field.id)),
    [table.fields, prefs.hiddenFieldIds],
  );

  // Reset transient grid state whenever the underlying table changes.
  useEffect(() => {
    setActive(null);
    setEditing(null);
  }, [table.id]);

  // Keep the active cell focused and scrolled into view.
  useEffect(() => {
    if (!active || editing) return;
    const key = active.rowIndex + ":" + active.columnIndex;
    const node = cellRefs.current.get(key);
    if (!node) return;
    node.focus({ preventScroll: true });
    // jsdom and some embedded webviews do not implement scrollIntoView.
    if (typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [active, editing]);

  const setSortForField = (fieldId: string, direction: "asc" | "desc" | null) => {
    if (direction === null) {
      onPrefsChange({ sorts: prefs.sorts.filter((sort) => sort.fieldId !== fieldId) });
      return;
    }
    const existing = prefs.sorts.find((sort) => sort.fieldId === fieldId);
    let next: SortSpec[];
    if (existing) {
      next = prefs.sorts.map((sort) => (sort.fieldId === fieldId ? { ...sort, direction } : sort));
    } else {
      next = [...prefs.sorts, { fieldId, direction }];
    }
    onPrefsChange({ sorts: next });
  };

  const hideField = (fieldId: string) => {
    if (!prefs.hiddenFieldIds.includes(fieldId)) {
      onPrefsChange({ hiddenFieldIds: [...prefs.hiddenFieldIds, fieldId] });
    }
  };

  const beginEdit = (rowIndex: number, columnIndex: number, seedText: string | null) => {
    const field = fields[columnIndex];
    if (!field) return;
    if (!(INLINE_EDITOR_TYPES.includes(field.type) || SELECT_EDITOR_TYPES.includes(field.type))) return;
    setActive({ rowIndex, columnIndex });
    setEditing({ rowIndex, columnIndex, seedText });
  };

  const finishEditing = () => setEditing(null);

  const moveActive = (rowDelta: number, columnDelta: number) => {
    setActive((current) => {
      const base = current ?? { rowIndex: 0, columnIndex: 0 };
      const rowIndex = Math.min(Math.max(base.rowIndex + rowDelta, 0), Math.max(rows.length - 1, 0));
      const columnIndex = Math.min(Math.max(base.columnIndex + columnDelta, 0), fields.length - 1);
      return { rowIndex, columnIndex };
    });
  };

  const clearActiveCell = () => {
    if (!active || !rows[active.rowIndex]) return;
    const field = fields[active.columnIndex];
    if (!field) return;
    dispatch({
      type: "updateCell",
      tableId: table.id,
      rowId: rows[active.rowIndex].id,
      fieldId: field.id,
      raw: emptyCellValue(field),
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing || rows.length === 0 || fields.length === 0) return;
    const key = event.key;
    switch (key) {
      case "ArrowUp":
        event.preventDefault();
        moveActive(-1, 0);
        return;
      case "ArrowDown":
        event.preventDefault();
        moveActive(1, 0);
        return;
      case "ArrowLeft":
        event.preventDefault();
        moveActive(0, -1);
        return;
      case "ArrowRight":
        event.preventDefault();
        moveActive(0, 1);
        return;
      case "Tab":
        event.preventDefault();
        moveActive(0, event.shiftKey ? -1 : 1);
        return;
      default:
        break;
    }
    if (!active) return;
    const field = fields[active.columnIndex];
    if (!field) return;
    if (key === "Enter" || key === "F2") {
      event.preventDefault();
      if (SELECT_EDITOR_TYPES.includes(field.type)) beginEdit(active.rowIndex, active.columnIndex, null);
      else if (INLINE_EDITOR_TYPES.includes(field.type)) beginEdit(active.rowIndex, active.columnIndex, null);
      return;
    }
    if ((key === "Delete" || key === "Backspace")) {
      event.preventDefault();
      clearActiveCell();
      return;
    }
    if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey && field.type === "text") {
      event.preventDefault();
      beginEdit(active.rowIndex, active.columnIndex, key);
    }
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>, fieldId: string) => {
    const field = table.fields.find((item) => item.id === fieldId);
    if (!field) return;
    resizingRef.current = { fieldId, startX: event.clientX, startWidth: field.width };
    const handleMove = (moveEvent: PointerEvent) => {
      const currentResize = resizingRef.current;
      if (!currentResize) return;
      const width = currentResize.startWidth + (moveEvent.clientX - currentResize.startX);
      dispatch({ type: "resizeField", tableId: table.id, fieldId: currentResize.fieldId, width });
    };
    const handleUp = () => {
      resizingRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const registerCellRef = (key: string) => (node: HTMLTableCellElement | null) => {
    if (node) cellRefs.current.set(key, node);
    else cellRefs.current.delete(key);
  };

  const rowHeightClass = prefs.rowHeight === "compact" ? "h-[33px]" : prefs.rowHeight === "tall" ? "h-[81px]" : "h-[55px]";
  const hasFilterNoise = prefs.search.trim().length > 0 || prefs.filters.length > 0;

  const columnCount = fields.length + 2; // gutter + fields + add-column

  return (
    <div ref={scrollRef} className="relative h-full min-h-0 w-full overflow-auto" onKeyDown={handleKeyDown} role="grid" aria-label={table.name + " 网格视图"}>
      <table className="w-max min-w-full select-none border-separate border-spacing-0 text-sm">
        <colgroup>
          <col style={{ width: GUTTER_WIDTH }} />
          {fields.map((field) => (
            <col key={field.id} style={{ width: field.width }} />
          ))}
          <col style={{ width: ADD_COLUMN_WIDTH }} />
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              aria-label="行号"
              className="sticky left-0 top-0 z-30 border-b border-r bg-muted/60 p-0"
              style={{ width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }}
            >
              <div className="flex h-9 items-center justify-center text-muted-foreground"><Rows3 className="size-3.5" /></div>
            </th>
            {fields.map((field, index) => {
              const sort = prefs.sorts.find((item) => item.fieldId === field.id);
              return (
                <th
                  key={field.id}
                  scope="col"
                  className="sticky top-0 z-20 border-b border-r bg-muted/60 p-0 text-left font-medium"
                  style={{ width: field.width, minWidth: field.width }}
                >
                  <div className="h-full min-h-9">
                    <FieldHeader
                      tableId={table.id}
                      field={field}
                      sort={sort}
                      onToggleSort={(direction) => setSortForField(field.id, direction)}
                      onClearSort={() => setSortForField(field.id, null)}
                      onHide={() => hideField(field.id)}
                      onResizeStart={(pointerEvent) => startResize(pointerEvent, field.id)}
                    />
                  </div>
                  {index === -1 ? <span className="hidden">{FIELD_TYPE_LABELS[field.type]}</span> : null}
                </th>
              );
            })}
            <th scope="col" className="sticky top-0 z-20 border-b bg-muted/40 p-0" style={{ width: ADD_COLUMN_WIDTH, minWidth: ADD_COLUMN_WIDTH }}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<button type="button" aria-label="添加字段" className="flex h-9 w-full items-center justify-center text-muted-foreground transition hover:bg-accent hover:text-foreground" />}
                >
                  <Plus className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {ALL_FIELD_TYPES.map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onSelect={() => dispatch({ type: "addField", tableId: table.id, base: createNewField(type) })}
                    >
                      + {FIELD_TYPE_LABELS[type]}字段
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id} data-row-id={row.id} className="group/row hover:bg-muted/30">
              <td
                ref={registerCellRef(rowIndex + ":-1")}
                tabIndex={-1}
                className={cn(
                  "sticky left-0 z-10 border-b border-r p-0 text-center align-middle bg-background group-hover/row:bg-muted/40",
                  rowHeightClass,
                )}
                style={{ width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }}
              >
                <span className={cn("text-[11px] tabular-nums text-muted-foreground/70", row.id !== expandedRowId && "group-hover/row:hidden")}>{rowIndex + 1}</span>
                <span className={cn("items-center justify-center gap-0.5", row.id === expandedRowId ? "flex" : "hidden group-hover/row:flex")}>
                  <button
                    type="button"
                    aria-label={"展开第 " + (rowIndex + 1) + " 行"}
                    aria-expanded={row.id === expandedRowId}
                    onClick={() => onExpandRow(row.id)}
                    className={cn("rounded p-0.5 transition hover:bg-accent hover:text-foreground", row.id === expandedRowId ? "bg-primary/10 text-primary" : "text-muted-foreground")}
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<button type="button" aria-label={"第 " + (rowIndex + 1) + " 行操作"} className="rounded p-0.5 text-muted-foreground transition hover:bg-accent hover:text-foreground" />}
                    >
                      <Ellipsis className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem onSelect={() => onExpandRow(row.id)}><Maximize2 /> 展开行</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => dispatch({ type: "duplicateRow", tableId: table.id, rowId: row.id })}><Copy /> 复制行</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => dispatch({ type: "addRow", tableId: table.id, aboveRowId: row.id })}><ArrowUpToLine /> 在上方插入行</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => dispatch({ type: "addRow", tableId: table.id, aboveRowId: rows[rowIndex + 1]?.id })}><ArrowDownToLine /> 在下方插入行</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => dispatch({ type: "deleteRows", tableId: table.id, rowIds: [row.id] })}>
                        <Trash2 /> 删除行
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </span>
              </td>
              {fields.map((field, columnIndex) => {
                const key = rowIndex + ":" + columnIndex;
                const isActive = active?.rowIndex === rowIndex && active?.columnIndex === columnIndex;
                const isEditing = editing?.rowIndex === rowIndex && editing?.columnIndex === columnIndex;
                return (
                  <td
                    key={field.id}
                    ref={registerCellRef(key)}
                    tabIndex={isActive && !isEditing ? 0 : -1}
                    aria-selected={isActive}
                    className={cn(
                      "relative border-b border-r p-0 outline-none align-middle bg-background transition-shadow group-hover/row:bg-muted/20",
                      rowHeightClass,
                      isActive && "z-[5] shadow-[inset_0_0_0_2px_hsl(var(--ring))] bg-background",
                    )}
                  >
                    <GridCell
                      field={field}
                      value={row.cells[field.id] ?? null}
                      rowHeight={prefs.rowHeight}
                      active={isActive}
                      editing={Boolean(isEditing)}
                      alignRight={field.type === "number"}
                      seedText={isEditing ? editing.seedText : null}
                      onActivate={() => setActive({ rowIndex, columnIndex })}
                      onStartEdit={(anchorRect) => beginEditWithAnchor(anchorRect, rowIndex, columnIndex)}
                      onCommitRaw={(raw) => dispatch({ type: "updateCell", tableId: table.id, rowId: row.id, fieldId: field.id, raw })}
                      onCancelEdit={finishEditing}
                      onEditMoveDown={() => moveActive(1, 0)}
                    />
                  </td>
                );
              })}
              <td className="border-b bg-background p-0" />
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="border-b p-0">
                <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
                  <Table2 className="size-5 opacity-50" />
                  {hasFilterNoise ? "没有符合当前筛选或搜索的行。" : "这张表还没有数据，先新增一行吧。"}
                </div>
              </td>
            </tr>
          ) : null}
          <tr>
            <td colSpan={columnCount} className="border-b p-0">
              <button
                type="button"
                onClick={() => dispatch({ type: "addRow", tableId: table.id })}
                className="flex h-9 w-full items-center gap-2 px-3 text-left text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-3.5" /> 新建行
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  function beginEditWithAnchor(_anchorRect: DOMRect | null, rowIndex: number, columnIndex: number) {
    void _anchorRect;
    beginEdit(rowIndex, columnIndex, null);
  }
}