import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MailTemplate } from "./types";
import type { MailTemplateValues } from "./use-mail-templates";
import { MailRichEditor } from "./mail-rich-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface MailTemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: MailTemplate[];
  onCreate: (values: MailTemplateValues) => Promise<MailTemplate>;
  onUpdate: (id: number | string, values: MailTemplateValues) => Promise<unknown>;
  onRemove: (id: number | string) => Promise<unknown>;
}

const EMPTY: MailTemplateValues = { name: "", content: "" };

export function MailTemplateManager({
  open,
  onOpenChange,
  templates,
  onCreate,
  onUpdate,
  onRemove,
}: MailTemplateManagerProps) {
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [form, setForm] = useState<MailTemplateValues>(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const first = templates[0];
    if (first) {
      setSelectedId(first.id);
      setForm({
        name: first.name,
        content: first.content,
      });
    } else {
      setSelectedId(null);
      setForm(EMPTY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectTemplate = (template: MailTemplate) => {
    setSelectedId(template.id);
    setForm({
      name: template.name,
      content: template.content,
    });
  };

  const startNew = () => {
    setSelectedId(null);
    setForm(EMPTY);
  };

  const canSave = form.name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      if (selectedId !== null) await onUpdate(selectedId, form);
      else setSelectedId((await onCreate(form)).id);
      toast.success("Template saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save template"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (selectedId === null) return;
    setBusy(true);
    try {
      await onRemove(selectedId);
      setSelectedId(null);
      setForm(EMPTY);
      toast.success("Template deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete template"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Templates</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <div className="flex flex-col gap-2">
            <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    selectedId === template.id
                      ? "bg-muted font-medium"
                      : "hover:bg-muted/50"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{template.name}</span>
                </button>
              ))}
              {!templates.length && (
                <p className="px-2.5 py-2 text-xs text-muted-foreground">
                  No templates yet
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={startNew}>
              <Plus />
              New
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Welcome"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Content</Label>
              <MailRichEditor
                value={form.content}
                onChange={(content) =>
                  setForm((prev) => ({ ...prev, content }))
                }
                placeholder="Template content…"
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleDelete()}
                disabled={selectedId === null || busy}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
                Delete
              </Button>
              <Button size="sm" onClick={() => void handleSave()} disabled={!canSave || busy}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
