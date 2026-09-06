"use client";

import { useState } from "react";
import { Check, Database, Ellipsis, ListChecks, Pencil, Plus, Table2, Trash2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { useBaserow } from "./store";
import type { TableIconName } from "./model";

const TABLE_ICONS: Record<TableIconName, typeof Users> = {
  users: Users,
  tasks: ListChecks,
  table: Table2,
};

export function BaserowSidebar() {
  const { state, dispatch } = useBaserow();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const submitCreate = () => {
    dispatch({ type: "addTable", name: newName });
    setNewName("");
    setCreating(false);
  };

  const submitRename = () => {
    if (renamingId) dispatch({ type: "renameTable", tableId: renamingId, name: renameDraft });
    setRenamingId(null);
  };

  return (
    <aside className="hidden w-56 shrink-0 flex-col rounded-xl border bg-background md:flex" data-testid="baserow-sidebar">
      <div className="flex items-center gap-2 border-b px-3 py-3">
        <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground"><Database className="size-4" /></span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight">业务数据库</p>
          <p className="text-[11px] leading-tight text-muted-foreground">本地演示 · 自动保存</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <p className="px-1 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">数据表</p>
        <ul className="space-y-0.5">
          {state.tables.map((table) => {
            const Icon = TABLE_ICONS[table.icon] ?? Table2;
            const isActive = table.id === state.activeTableId;
            const isRenaming = renamingId === table.id;
            return (
              <li key={table.id} className="group relative">
                {isRenaming ? (
                  <form onSubmit={(event) => { event.preventDefault(); submitRename(); }} className="flex items-center gap-1 px-1 py-0.5">
                    <Input autoFocus value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} onBlur={submitRename} onKeyDown={(event) => { if (event.key === "Escape") setRenamingId(null); }} className="h-7 text-xs" aria-label="数据表名称" />
                    <Button type="submit" size="icon" variant="ghost" className="size-6 shrink-0" aria-label="确认名称"><Check /></Button>
                    <Button type="button" size="icon" variant="ghost" className="size-6 shrink-0" aria-label="取消重命名" onMouseDown={(event) => { event.preventDefault(); setRenamingId(null); }}><X /></Button>
                  </form>
                ) : (
                  <button
                    type="button"
                    data-testid="baserow-table-item"
                    onClick={() => dispatch({ type: "selectTable", tableId: table.id })}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition",
                      isActive ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "opacity-60")} />
                    <span className="min-w-0 flex-1 truncate">{table.name}</span>
                    <span className="text-[10px] tabular-nums text-muted-foreground/70">{table.rows.length}</span>
                  </button>
                )}
                {!isRenaming && (
                  <div className="absolute inset-y-0 right-1 flex items-center opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<button type="button" aria-label={"管理数据表 " + table.name} className="rounded bg-background/80 p-1 text-muted-foreground hover:text-foreground" />}
                      >
                        <Ellipsis className="size-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem onSelect={() => { setRenamingId(table.id); setRenameDraft(table.name); }}><Pencil /> 重命名</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={state.tables.length <= 1}
                          onSelect={() => dispatch({ type: "deleteTable", tableId: table.id })}
                        >
                          <Trash2 /> 删除数据表
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="border-t p-2">
        {creating ? (
          <form onSubmit={(event) => { event.preventDefault(); submitCreate(); }} className="space-y-1.5 px-1 pb-1 pt-0.5">
            <Input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="数据表名称" className="h-7 text-xs" aria-label="新数据表名称" />
            <div className="flex gap-1">
              <Button type="submit" size="sm" className="h-7 flex-1 text-xs">创建</Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 flex-1 text-xs" onClick={() => { setCreating(false); setNewName(""); }}>取消</Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="ghost" className="w-full justify-start gap-2 text-xs text-muted-foreground" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> 新建数据表
          </Button>
        )}
      </div>
    </aside>
  );
}