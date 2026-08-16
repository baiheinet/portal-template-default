import { ChevronDown, ChevronRight, Cuboid } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { ComponentSelection } from "./model";

export function ComponentTree({ components, selectedKey, onSelect }: { components: ComponentSelection[]; selectedKey: string | null; onSelect: (item: ComponentSelection) => void }) {
  const groups = useMemo(() => {
    const grouped: Record<string, ComponentSelection[]> = {};
    for (const item of components) (grouped[item.type ?? "UNKNOWN"] ??= []).push(item);
    return Object.entries(grouped);
  }, [components]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  return <div className="space-y-2">{groups.length === 0 ? <p className="text-sm text-muted-foreground">Load a PCF or IDF file to view components.</p> : groups.map(([type, items]) => <div key={type} className="rounded-lg border bg-background/60"><Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setCollapsed((value) => ({ ...value, [type]: !value[type] }))}>{collapsed[type] ? <ChevronRight /> : <ChevronDown />}<span className="font-medium">{type}</span><Badge variant="secondary">{items.length}</Badge></Button>{!collapsed[type] && <div className="p-1">{items.map((item) => { const key = `${item.sourceFile}:${item.index}`; return <Button key={key} variant={selectedKey === key ? "secondary" : "ghost"} className="w-full justify-start gap-2 text-xs" onClick={() => onSelect(item)}><Cuboid className="size-3" />{item.attributes?.itemCode ?? `${type}-${item.index + 1}`}</Button>; })}</div>}</div>)}</div>;
}
