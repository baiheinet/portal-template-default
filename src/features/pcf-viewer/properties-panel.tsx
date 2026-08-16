import type { ComponentSelection } from "./model";
import { summarizeSelection } from "./model";

function point(value: any) { return value ? `${value.x.toFixed(1)}, ${value.y.toFixed(1)}, ${value.z.toFixed(1)}` : "—"; }

export function PropertiesPanel({ selection, multiSelection }: { selection: ComponentSelection | null; multiSelection: ComponentSelection[] }) {
  if (multiSelection.length > 1) { const summary = summarizeSelection(multiSelection); return <div className="space-y-3 text-sm"><h3 className="font-semibold">{summary.count} components selected</h3><p>Total length: {summary.totalLengthMm.toFixed(0)} mm</p>{Object.entries(summary.byType).map(([type, count]) => <p key={type} className="text-muted-foreground">{type}: {count}</p>)}</div>; }
  if (!selection) return <p className="text-sm text-muted-foreground">Select a component to inspect its properties.</p>;
  return <div className="divide-y rounded-lg border text-sm">{[["Type", selection.type], ["Item code", selection.attributes?.itemCode], ["Description", selection.attributes?.description], ["Length", selection.attributes?.length ? `${selection.attributes.length} mm` : undefined], ...((selection.endPoints ?? []).map((endpoint, index) => [`Endpoint ${index + 1}`, point(endpoint.position)] as const))].filter(([, value]) => value !== undefined).map(([label, value]) => <div key={label} className="flex justify-between gap-4 px-3 py-2"><span className="text-muted-foreground">{label}</span><span className="text-right">{String(value)}</span></div>)}</div>;
}
