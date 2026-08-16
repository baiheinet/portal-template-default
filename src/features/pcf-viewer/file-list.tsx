import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ViewerFile } from "./model";

export function FileList({ files, onToggleVisibility, onRemove }: { files: ViewerFile[]; onToggleVisibility: (filename: string) => void; onRemove: (filename: string) => void }) {
  return <div className="space-y-1">{files.length === 0 ? <p className="text-sm text-muted-foreground">No files loaded.</p> : files.map((file) => <div key={file.filename} className="flex items-center gap-1 rounded-md border px-2 py-1"><span className="min-w-0 flex-1 truncate text-xs">{file.filename}</span><Button size="icon-sm" variant="ghost" aria-label={`Toggle ${file.filename}`} onClick={() => onToggleVisibility(file.filename)}>{file.visible ? <Eye /> : <EyeOff />}</Button><Button size="icon-sm" variant="ghost" aria-label={`Remove ${file.filename}`} onClick={() => onRemove(file.filename)}><Trash2 /></Button></div>)}</div>;
}
