import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  MailAccount,
  MailColumnId,
  MailLabel,
  MailMessage,
  MailNote,
  MailScope,
} from "./types";
import { MailBoxType } from "./types";
import { mailApi } from "./mail-api";
import { useMailMessages } from "./use-mail-messages";
import { useMailCompose, buildComposeInitial } from "./use-mail-compose";
import type { ComposeMode } from "./mail-compose";
import { MailToolbar } from "./mail-toolbar";
import { MailTable } from "./mail-table";
import { MailDetail } from "./mail-detail";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface MailInboxProps {
  scope?: MailScope;
  columns?: MailColumnId[];
  filter?: Record<string, unknown>;
  userId?: number;
  pageSize?: number;
  showToolbar?: boolean;
  className?: string;
}

export function MailInbox({
  scope,
  columns,
  filter,
  userId,
  pageSize = 15,
  showToolbar = true,
  className,
}: MailInboxProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeMessage, setActiveMessage] = useState<MailMessage | undefined>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState<MailAccount[]>([]);

  const {
    messages,
    total,
    loading,
    page,
    pageSize: effectivePageSize,
    setPage,
    refresh,
    setMessages,
  } = useMailMessages({ scope, search, filter, userId, pageSize });

  const { openCompose, composeDialog } = useMailCompose({
    accounts,
    onSent: refresh,
  });

  useEffect(() => {
    mailApi
      .getAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }, []);

  const openMessage = useCallback(
    async (message: MailMessage) => {
      setActiveMessage(message);
      setDetailOpen(true);
      setDetailLoading(true);
      try {
        const detail = await mailApi.getMessage(message.id);
        setActiveMessage(detail);
        if (!message.isRead) {
          mailApi.setRead([message.mailId], true).catch(() => undefined);
          setMessages((prev) =>
            prev.map((m) => (m.id === message.id ? { ...m, isRead: true } : m))
          );
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load message");
      } finally {
        setDetailLoading(false);
      }
    },
    [setMessages]
  );

  const toggleSelect = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const clearSelectionAndRefresh = useCallback(() => {
    setSelectedIds(new Set());
    refresh();
  }, [refresh]);

  const handleSetRead = useCallback(
    async (isRead: boolean) => {
      const mailIds = messages
        .filter((m) => selectedIds.has(m.id))
        .map((m) => m.mailId);
      if (!mailIds.length) return;
      try {
        await mailApi.setRead(mailIds, isRead);
        setMessages((prev) =>
          prev.map((m) => (selectedIds.has(m.id) ? { ...m, isRead } : m))
        );
        setSelectedIds(new Set());
        toast.success(isRead ? "Marked as read" : "Marked as unread");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed");
      }
    },
    [messages, selectedIds, setMessages]
  );

  const handleBulkTrash = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      await mailApi.trashMessages(ids, true);
      toast.success("Moved to trash");
      clearSelectionAndRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move to trash");
    }
  }, [selectedIds, clearSelectionAndRefresh]);

  const handleBulkArchive = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      await mailApi.trashMessages(ids, false);
      toast.success("Archived");
      clearSelectionAndRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive");
    }
  }, [selectedIds, clearSelectionAndRefresh]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const emails = accounts.map((a) => a.email);
      if (emails.length) await mailApi.sync(emails);
      toast.success("Mailbox synced");
      clearSelectionAndRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [accounts, clearSelectionAndRefresh]);

  const openReply = useCallback(
    (message: MailMessage, mode: ComposeMode) => {
      const accountEmails = accounts.map((a) => a.email);
      openCompose(buildComposeInitial(message, mode, accountEmails), mode);
    },
    [accounts, openCompose]
  );

  const handleDetailTrash = useCallback(
    async (message: MailMessage) => {
      try {
        await mailApi.trashMessages([message.id], true);
        toast.success("Moved to trash");
        setDetailOpen(false);
        setActiveMessage(undefined);
        refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to move to trash");
      }
    },
    [refresh]
  );

  const handleDetailArchive = useCallback(
    async (message: MailMessage) => {
      try {
        await mailApi.setBoxType(message.id, MailBoxType.ARCHIVE);
        toast.success("Archived");
        setDetailOpen(false);
        setActiveMessage(undefined);
        refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to archive");
      }
    },
    [refresh]
  );

  const handleToggleTodo = useCallback(
    async (message: MailMessage) => {
      const isTodo = !message.isTodo;
      try {
        await mailApi.setTodo(message.id, isTodo);
        setActiveMessage((prev) =>
          prev && prev.id === message.id ? { ...prev, isTodo } : prev
        );
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, isTodo } : m))
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update star");
      }
    },
    [setMessages]
  );

  const handleLabelsChange = useCallback(
    (message: MailMessage, labels: MailLabel[]) => {
      setActiveMessage((prev) =>
        prev && prev.id === message.id ? { ...prev, labels } : prev
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, labels } : m))
      );
    },
    [setMessages]
  );

  const handleNoteChange = useCallback(
    (message: MailMessage, note: MailNote | undefined) => {
      const noteArr = note ? [note] : [];
      setActiveMessage((prev) =>
        prev && prev.id === message.id ? { ...prev, note: noteArr } : prev
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, note: noteArr } : m))
      );
    },
    [setMessages]
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {showToolbar && (
        <MailToolbar
          search={search}
          onSearchChange={setSearch}
          selectedCount={selectedIds.size}
          syncing={syncing}
          onSync={handleSync}
          onMarkRead={() => handleSetRead(true)}
          onMarkUnread={() => handleSetRead(false)}
          onArchive={handleBulkArchive}
          onTrash={handleBulkTrash}
          onClearSelection={() => setSelectedIds(new Set())}
          onCompose={() => openCompose()}
        />
      )}

      <MailTable
        messages={messages}
        loading={loading}
        total={total}
        page={page}
        pageSize={effectivePageSize}
        onPageChange={setPage}
        selectedIds={selectedIds}
        activeId={activeMessage?.id}
        onOpen={openMessage}
        onSelect={toggleSelect}
        columns={columns}
        emptyVariant={search ? "search" : "inbox"}
      />

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent
          side="right"
          className="gap-0 p-0 data-[side=right]:sm:max-w-3xl"
        >
          <div className="flex-1 overflow-y-auto">
            <MailDetail
              message={activeMessage}
              loading={detailLoading}
              onReply={(m) => openReply(m, "reply")}
              onReplyAll={(m) => openReply(m, "replyAll")}
              onForward={(m) => openReply(m, "forward")}
              onToggleTodo={handleToggleTodo}
              onArchive={handleDetailArchive}
              onTrash={handleDetailTrash}
              onLabelsChange={handleLabelsChange}
              onNoteChange={handleNoteChange}
            />
          </div>
        </SheetContent>
      </Sheet>

      {composeDialog}
    </div>
  );
}
