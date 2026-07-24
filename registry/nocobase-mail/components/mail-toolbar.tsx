import {
  Archive,
  MailOpen,
  MailX,
  PenLine,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function MailToolbar({
  search,
  onSearchChange,
  selectedCount,
  syncing,
  onSync,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onTrash,
  onClearSelection,
  onCompose,
  className,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCount: number;
  syncing: boolean;
  onSync: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onClearSelection: () => void;
  onCompose?: () => void;
  className?: string;
}) {
  const hasSelection = selectedCount > 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search messages…"
          className="h-8 pl-8 text-sm"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {hasSelection && (
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs tabular-nums text-muted-foreground">
            {selectedCount} selected
          </span>
          <Button variant="ghost" size="icon-sm" title="Mark as read" onClick={onMarkRead}>
            <MailOpen />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Mark as unread" onClick={onMarkUnread}>
            <MailX />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Archive" onClick={onArchive}>
            <Archive />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Move to trash"
            className="text-destructive hover:text-destructive"
            onClick={onTrash}
          >
            <Trash2 />
          </Button>
          <Button variant="ghost" size="xs" onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          title="Sync mailbox"
          onClick={onSync}
          disabled={syncing}
        >
          <RefreshCw className={cn(syncing && "animate-spin")} />
        </Button>
        {onCompose && (
          <Button size="sm" onClick={onCompose}>
            <PenLine />
            Compose
          </Button>
        )}
      </div>
    </div>
  );
}
