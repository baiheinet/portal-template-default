"use client";

import { useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Download, EyeOff, Funnel, Plus, Rows2, Rows3, Rows4, Search, Table2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

import { filterOpNeedsValue, filterOperatorsFor, FILTER_OP_LABELS, type BaserowTable, type FilterItem, type FilterOperator, type RowHeight, type ViewPrefs } from "./model";
import { FieldTypeIcon } from "./ui-primitives";

const ROW_HEIGHT_CYCLE: RowHeight[] = ["compact", "regular", "tall"];
const ROW_HEIGHT_LABEL: Record<RowHeight, string> = { compact: "紧凑行高", regular: "适中行高", tall: "宽松行高" };
const ROW_HEIGHT_ICON: Record<RowHeight, typeof Rows3> = { compact: Rows2, regular: Rows3, tall: Rows4 };

export interface ViewToolbarProps {
  table: BaserowTable;
  prefs: ViewPrefs;
  filteredCount: number;
  onPrefsChange: (patch: Partial<ViewPrefs>) => void;
  onExportCsv: () => void;
}

export function ViewToolbar({ table, prefs, filteredCount, onPrefsChange, onExportCsv }: ViewToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);

  const setFilters = (filters: FilterItem[]) => onPrefsChange({ filters });

  const addFilter = () => {
    const firstField = table.fields[0];
    if (!firstField) return;
    const op = filterOperatorsFor(firstField.type)[0];
    setFilters([...prefs.filters, { fieldId: firstField.id, op, value: "" }]);
  };

  const patchFilter = (index: number, patch: Partial<FilterItem>) => {
    setFilters(prefs.filters.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addSort = () => {
    const sortedIds = new Set(prefs.sorts.map((item) => item.fieldId));
    const candidate = table.fields.find((field) => !sortedIds.has(field.id)) ?? table.fields[0];
    if (!candidate) return;
    onPrefsChange({ sorts: [...prefs.sorts.filter((s) => s.fieldId !== candidate.id), { fieldId: candidate.id, direction: "asc" }] });
  };

  const toggleHidden = (fieldId: string) => {
    onPrefsChange({
      hiddenFieldIds: prefs.hiddenFieldIds.includes(fieldId)
        ? prefs.hiddenFieldIds.filter((id) => id !== fieldId)
        : [...prefs.hiddenFieldIds, fieldId],
    });
  };

  const HeightIcon = ROW_HEIGHT_ICON[prefs.rowHeight];
  const nextRowHeight = () => {
    const index = ROW_HEIGHT_CYCLE.indexOf(prefs.rowHeight);
    onPrefsChange({ rowHeight: ROW_HEIGHT_CYCLE[(index + 1) % ROW_HEIGHT_CYCLE.length] });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b px-2.5 py-2">
      <span className="flex h-7 items-center gap-1.5 rounded-md bg-primary/10 px-2 text-xs font-medium text-primary">
        <Table2 className="size-3.5" /> 网格视图
      </span>
      <Separator orientation="vertical" className="mx-0.5 h-4" />

      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger
          render={<Button type="button" variant="ghost" size="sm" data-testid="baserow-filter-button" className={cn("h-7 gap-1.5 px-2 text-xs", prefs.filters.length > 0 && "text-primary")} />}
        >
          <Funnel className="size-3.5" /> 筛选
          {prefs.filters.length > 0 ? <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold">{prefs.filters.length}</span> : null}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[380px] p-3">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center rounded-md border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onPrefsChange({ groupOperator: "and" })}
                className={cn("rounded px-2 py-0.5 transition", prefs.groupOperator === "and" ? "bg-accent font-medium" : "text-muted-foreground")}
              >且（全部满足）</button>
              <button
                type="button"
                onClick={() => onPrefsChange({ groupOperator: "or" })}
                className={cn("rounded px-2 py-0.5 transition", prefs.groupOperator === "or" ? "bg-accent font-medium" : "text-muted-foreground")}
              >或（任一满足）</button>
            </div>
            {prefs.filters.length > 0 ? (
              <Button type="button" size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={() => setFilters([])}><X /> 清空</Button>
            ) : null}
          </div>
          {prefs.filters.length === 0 ? (
            <p className="pb-2 pt-1 text-xs text-muted-foreground">还没有筛选条件，所有行都会显示。</p>
          ) : (
            <ul className="space-y-1.5 py-1">
              {prefs.filters.map((filter, index) => {
                const field = table.fields.find((f) => f.id === filter.fieldId) ?? table.fields[0];
                if (!field) return null;
                const ops = filterOperatorsFor(field.type);
                return (
                  <li key={index} className="flex items-center gap-1.5">
                    <NativeSelect
                      aria-label="筛选字段"
                      value={field.id}
                      onChange={(event) => patchFilter(index, { fieldId: event.target.value, op: filterOperatorsFor(table.fields.find((f) => f.id === event.target.value)?.type ?? "text")[0] })}
                      className="h-7 w-[104px] shrink-0 text-xs"
                    >
                      {table.fields.map((f) => <NativeSelectOption key={f.id} value={f.id}>{f.name}</NativeSelectOption>)}
                    </NativeSelect>
                    <NativeSelect
                      aria-label="筛选方式"
                      value={ops.includes(filter.op) ? filter.op : ops[0]}
                      onChange={(event) => patchFilter(index, { op: event.target.value as FilterOperator })}
                      className="h-7 w-[104px] shrink-0 text-xs"
                    >
                      {ops.map((op) => <option key={op} value={op}>{FILTER_OP_LABELS[op]}</option>)}
                    </NativeSelect>
                    {filterOpNeedsValue(ops.includes(filter.op) ? filter.op : ops[0]) ? (
                      <Input
                        value={filter.value}
                        onChange={(event) => patchFilter(index, { value: event.target.value })}
                        placeholder="值"
                        className="h-7 min-w-0 flex-1 text-xs"
                        aria-label="筛选值"
                      />
                    ) : (
                      <span className="min-w-0 flex-1 text-center text-xs text-muted-foreground">不需要填写值</span>
                    )}
                    <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" aria-label={"删除条件 " + (index + 1)} onClick={() => setFilters(prefs.filters.filter((_, i) => i !== index))}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <Button type="button" size="sm" variant="outline" className="mt-2 w-full border-dashed text-xs" onClick={addFilter}><Plus /> 添加筛选条件</Button>
        </PopoverContent>
      </Popover>

      <Popover open={sortOpen} onOpenChange={setSortOpen}>
        <PopoverTrigger
          render={<Button type="button" variant="ghost" size="sm" className={cn("h-7 gap-1.5 px-2 text-xs", prefs.sorts.length > 0 && "text-primary")} />}
        >
          <ArrowDownAZ className="size-3.5" /> 排序
          {prefs.sorts.length > 0 ? <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold">{prefs.sorts.length}</span> : null}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[320px] p-3">
          {prefs.sorts.length === 0 ? (
            <p className="pb-2 text-xs text-muted-foreground">还没有排序规则，按原始顺序显示。</p>
          ) : (
            <ul className="space-y-1.5 py-1">
              {prefs.sorts.map((sort, index) => (
                <li key={sort.fieldId} className="flex items-center gap-1.5">
                  <NativeSelect
                    aria-label={"排序字段 " + (index + 1)}
                    value={sort.fieldId}
                    onChange={(event) => onPrefsChange({ sorts: prefs.sorts.map((s, i) => (i === index ? { ...s, fieldId: event.target.value } : s)) })}
                    className="h-7 min-w-0 flex-1 text-xs"
                  >
                    {table.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </NativeSelect>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label={"切换排序方向 " + (index + 1)}
                    title={sort.direction === "asc" ? "当前升序，点击改为降序" : "当前降序，点击改为升序"}
                    onClick={() => onPrefsChange({ sorts: prefs.sorts.map((s, i) => (i === index ? { ...s, direction: s.direction === "asc" ? "desc" : "asc" } : s)) })}
                  >
                    {sort.direction === "asc" ? <ArrowDownAZ className="size-3.5" /> : <ArrowUpAZ className="size-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    aria-label={"删除排序 " + (index + 1)}
                    onClick={() => onPrefsChange({ sorts: prefs.sorts.filter((_, i) => i !== index) })}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button type="button" size="sm" variant="outline" className="mt-2 w-full border-dashed text-xs" disabled={table.fields.length === 0} onClick={addSort}><Plus /> 添加排序字段</Button>
        </PopoverContent>
      </Popover>

      <div className="relative ml-auto hidden min-w-[140px] max-w-[240px] flex-1 items-center sm:flex">
        <Search className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
        <Input
          value={prefs.search}
          onChange={(event) => onPrefsChange({ search: event.target.value })}
          placeholder="搜索所有字段…"
          className="h-7 pl-7 text-xs"
          aria-label="搜索表格内容"
        />
      </div>

      <Popover open={hideOpen} onOpenChange={setHideOpen}>
        <PopoverTrigger
          render={<Button type="button" variant="ghost" size="sm" className={cn("h-7 gap-1.5 px-2 text-xs", prefs.hiddenFieldIds.length > 0 && "text-primary")} title="隐藏与显示字段" />}
        >
          <EyeOff className="size-3.5" /> 隐藏字段
          {prefs.hiddenFieldIds.length > 0 ? <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold">{prefs.hiddenFieldIds.length}</span> : null}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 p-2">
          <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">显示的字段</p>
          <ul className="max-h-64 space-y-0.5 overflow-auto">
            {table.fields.map((field) => (
              <li key={field.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-accent">
                  <Checkbox checked={!prefs.hiddenFieldIds.includes(field.id)} onCheckedChange={() => toggleHidden(field.id)} aria-label={"显示字段 " + field.name} />
                  <FieldTypeIcon type={field.type} className="opacity-60" />
                  <span className="truncate">{field.name}</span>
                </label>
              </li>
            ))}
          </ul>
          {prefs.hiddenFieldIds.length > 0 ? (
            <Button type="button" size="sm" variant="ghost" className="mt-1 w-full text-xs text-muted-foreground" onClick={() => onPrefsChange({ hiddenFieldIds: [] })}>全部显示</Button>
          ) : null}
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={nextRowHeight}
        title={ROW_HEIGHT_LABEL[prefs.rowHeight]}
        aria-label="切换行高"
      >
        <HeightIcon className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs"
        onClick={onExportCsv}
        title="导出当前视图为 CSV"
        data-testid="baserow-export-button"
      >
        <Download className="size-3.5" /> 导出 CSV
      </Button>
      <span className="ml-1 hidden whitespace-nowrap text-[11px] tabular-nums text-muted-foreground lg:inline">
        {filteredCount === table.rows.length ? table.rows.length + " 行" : filteredCount + " / " + table.rows.length + " 行"}
      </span>
    </div>
  );
}