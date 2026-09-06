"use client";

import { useCallback, useMemo, useState } from "react";
import { FileSpreadsheet, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { BaserowSidebar } from "@/features/baserow/baserow-sidebar";
import { GridView } from "@/features/baserow/grid-view";
import { RowExpandDrawer } from "@/features/baserow/row-expand-drawer";
import { ViewToolbar } from "@/features/baserow/view-toolbar";
import { buildCsv, DEFAULT_VIEW_PREFS, selectVisibleRows, visibleFields, type ViewPrefs } from "@/features/baserow/model";
import { BaserowProvider, useBaserow } from "@/features/baserow/store";

export default function BaserowPage() {
  return (
    <BaserowProvider>
      <BaserowWorkspace />
    </BaserowProvider>
  );
}

function BaserowWorkspace() {
  const { state, dispatch, activeTable } = useBaserow();
  const [prefsByTable, setPrefsByTable] = useState<Record<string, ViewPrefs>>({});
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const prefs = (activeTable && prefsByTable[activeTable.id]) || DEFAULT_VIEW_PREFS;

  const patchPrefs = useCallback(
    (patch: Partial<ViewPrefs>) => {
      if (!activeTable) return;
      setPrefsByTable((previous) => ({
        ...previous,
        [activeTable.id]: { ...(previous[activeTable.id] ?? DEFAULT_VIEW_PREFS), ...patch },
      }));
    },
    [activeTable],
  );

  const rows = useMemo(
    () => (activeTable ? selectVisibleRows(activeTable, prefs) : []),
    [activeTable, prefs],
  );

  const shownFields = useMemo(
    () => (activeTable ? visibleFields(activeTable, prefs.hiddenFieldIds) : []),
    [activeTable, prefs.hiddenFieldIds],
  );

  if (!activeTable) {
    return (
      <div className="flex min-h-[320px] flex-1 items-center justify-center text-sm text-muted-foreground">
        暂无数据表，请在左侧新建一个。
      </div>
    );
  }

  const expandIndex = expandedRowId ? rows.findIndex((row) => row.id === expandedRowId) : -1;
  const expandedRow = expandIndex >= 0 ? rows[expandIndex] : null;

  const navigateRow = (delta: number) => {
    if (expandIndex < 0) return;
    const nextIndex = Math.min(Math.max(expandIndex + delta, 0), rows.length - 1);
    setExpandedRowId(rows[nextIndex].id);
  };

  const exportCsv = () => {
    const csv = buildCsv(activeTable, shownFields, rows);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeTable.name.split(" ").join("-") + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-[460px] w-full min-w-0 flex-1 flex-col" data-testid="baserow-page">
      <header className="flex flex-wrap items-center justify-between gap-2 pb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><FileSpreadsheet className="size-5" /></span>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Baserow 表格</h1>
            <p className="text-xs text-muted-foreground">电子表格视图 · 筛选排序 · 行内编辑 · 本地自动保存</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={() => dispatch({ type: "resetToSeed" })} title="恢复内置演示数据">
          <RotateCcw className="size-3.5" /> 重置演示数据
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border bg-background shadow-sm">
        <BaserowSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <ViewToolbar
            table={activeTable}
            prefs={prefs}
            filteredCount={rows.length}
            onPrefsChange={patchPrefs}
            onExportCsv={exportCsv}
          />
          <div className="min-h-0 flex-1 bg-muted/20">
            <GridView
              table={activeTable}
              rows={rows}
              prefs={prefs}
              expandedRowId={expandedRowId}
              onExpandRow={(rowId) => setExpandedRowId(rowId)}
              onPrefsChange={patchPrefs}
            />
          </div>
        </section>
      </div>
      <RowExpandDrawer
        tableId={state.activeTableId ?? ""}
        fields={shownFields}
        row={expandedRow}
        position={Math.max(expandIndex, 0)}
        total={rows.length}
        open={Boolean(expandedRow)}
        onOpenChange={(openValue) => {
          if (!openValue) setExpandedRowId(null);
        }}
        onNavigateRow={navigateRow}
      />
    </div>
  );
}