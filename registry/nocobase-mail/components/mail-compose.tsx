import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type {
  MailAccount,
  MailRecipientOption,
  MailSendPayload,
  MailUploadedAttachment,
} from "./types";
import { mailApi } from "./mail-api";
import { applySignature } from "./mail-signatures";
import { useMailSignatures } from "./use-mail-signatures";
import { MailSignatureManager } from "./mail-signature-manager";
import { useMailTemplates } from "./use-mail-templates";
import { MailTemplateManager } from "./mail-template-manager";
import { MailSendActions } from "./mail-send-actions";
import { MailRecipientInput } from "./mail-recipient-input";
import { MailComposeAttachments } from "./mail-compose-attachments";
import {
  DEFAULT_MAIL_SENDER_KEY,
  getMailSenderCandidates,
  resolveMailSender,
} from "./mail-senders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MailRichEditor } from "./mail-rich-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface ComposeInitialValues {
  from?: string;
  accountEmail?: string;
  identityEmail?: string;
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
  replyTo?: string;
  isDraft?: boolean;
  id?: number;
  attachments?: MailUploadedAttachment[];
}

export type ComposeMode = "new" | "reply" | "replyAll" | "forward" | "draft";

const parseList = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const uniqueRecipients = (value: string) => {
  const seen = new Set<string>();
  return parseList(value).filter((address) => {
    const key = address.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export interface MailComposeFormProps {
  accounts?: MailAccount[];
  initial?: ComposeInitialValues;
  mode?: ComposeMode;
  onSent?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  allowScheduleSend?: boolean;
  allowBulkSend?: boolean;
  bulkOnly?: boolean;
  defaultBulkIntervalMs?: number;
  recipientOptions?: MailRecipientOption[];
  onAccountChange?: (account: MailAccount) => void;
  className?: string;
}

export function MailComposeForm({
  accounts: accountsProp,
  initial,
  mode = "new",
  onSent,
  onCancel,
  showCancel = false,
  allowScheduleSend = true,
  allowBulkSend = false,
  bulkOnly = false,
  defaultBulkIntervalMs = 2_000,
  recipientOptions,
  onAccountChange,
  className,
}: MailComposeFormProps) {
  const [internalAccounts, setInternalAccounts] = useState<MailAccount[]>([]);
  useEffect(() => {
    if (accountsProp) return;
    let active = true;
    mailApi
      .getAccounts()
      .then((accounts) => active && setInternalAccounts(accounts))
      .catch(() => active && setInternalAccounts([]));
    return () => {
      active = false;
    };
  }, [accountsProp]);
  const accounts = accountsProp ?? internalAccounts;

  const senderCandidates = useMemo(() => getMailSenderCandidates(accounts), [accounts]);
  const defaultSenderKey = senderCandidates[0]?.key ?? "";

  const [senderKey, setSenderKey] = useState("");
  const [to, setTo] = useState(initial?.to ?? "");
  const [cc, setCc] = useState(initial?.cc ?? "");
  const [showCc, setShowCc] = useState(Boolean(initial?.cc));
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [sendAction, setSendAction] = useState<
    "send" | "schedule" | "bulk" | null
  >(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<number | undefined>(initial?.id);
  const [attachments, setAttachments] = useState<MailUploadedAttachment[]>(
    initial?.attachments ?? []
  );
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [deleteDraftOpen, setDeleteDraftOpen] = useState(false);

  const selectedSender = senderCandidates.find((candidate) => candidate.key === senderKey);
  const activeAccount = accounts.find((account) => account.id === selectedSender?.accountId);
  const handleAccountChange = useCallback(
    (account: MailAccount) => {
      setInternalAccounts((prev) =>
        prev.map((item) => (item.id === account.id ? account : item))
      );
      onAccountChange?.(account);
    },
    [onAccountChange]
  );
  const { signatures, create, update, remove, setDefault } = useMailSignatures(
    activeAccount,
    handleAccountChange
  );
  const [signatureId, setSignatureId] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);
  const appliedDefaultRef = useRef(false);

  const {
    templates,
    create: createTemplate,
    update: updateTemplate,
    remove: removeTemplate,
  } = useMailTemplates();
  const [templateId, setTemplateId] = useState("");
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);

  useEffect(() => {
    setTo(initial?.to ?? "");
    setCc(initial?.cc ?? "");
    setShowCc(Boolean(initial?.cc));
    setSubject(initial?.subject ?? "");
    setBody(initial?.body ?? "");
    setDraftId(initial?.id);
    setAttachments(initial?.attachments ?? []);
  }, [initial]);

  useEffect(() => {
    const preferred = resolveMailSender(senderCandidates, initial);
    setSenderKey((prev) => {
      if (preferred) return preferred.key;
      return senderCandidates.some((candidate) => candidate.key === prev) ? prev : "";
    });
  }, [initial, senderCandidates]);

  useEffect(() => {
    if (!defaultSenderKey) return;
    setSenderKey((prev) => {
      if (senderCandidates.some((candidate) => candidate.key === prev)) return prev;
      const saved = window.localStorage.getItem(DEFAULT_MAIL_SENDER_KEY);
      return senderCandidates.some((candidate) => candidate.key === saved)
        ? saved!
        : defaultSenderKey;
    });
  }, [defaultSenderKey, senderCandidates]);

  useEffect(() => {
    if (senderKey) window.localStorage.setItem(DEFAULT_MAIL_SENDER_KEY, senderKey);
  }, [senderKey]);

  useEffect(() => {
    if (mode === "draft") return;
    appliedDefaultRef.current = false;
    setSignatureId("");
    setBody((prev) => applySignature(prev, undefined));
  }, [activeAccount?.id, mode]);

  useEffect(() => {
    if (mode === "draft") return;
    if (appliedDefaultRef.current) return;
    if (!signatures.length) return;
    appliedDefaultRef.current = true;
    const fallback = signatures.find((signature) => signature.isDefault);
    if (!fallback) return;
    setSignatureId(String(fallback.id));
    setBody((prev) => applySignature(prev, fallback.content));
  }, [mode, signatures]);

  const handleSignatureChange = useCallback(
    (value: string | null) => {
      const id = !value || value === "none" ? "" : value;
      setSignatureId(id);
      const signature = signatures.find((item) => String(item.id) === id);
      setBody((prev) => applySignature(prev, signature?.content));
    },
    [signatures]
  );

  const handleTemplateChange = useCallback(
    (value: string | null) => {
      const id = !value || value === "none" ? "" : value;
      setTemplateId(id);
      const template = templates.find((item) => String(item.id) === id);
      if (!template) return;
      if (template.subject) setSubject(template.subject);
      const signature = signatures.find((item) => String(item.id) === signatureId);
      setBody(applySignature(template.content, signature?.content));
    },
    [templates, signatures, signatureId]
  );

  const recipients = useMemo(() => uniqueRecipients(to), [to]);

  const buildPayload = useCallback(
    (overrides: Partial<MailSendPayload> = {}): MailSendPayload => ({
      id: draftId,
      from: selectedSender?.identityEmail ?? "",
      accountEmail: selectedSender?.accountEmail,
      identityEmail: selectedSender?.identityEmail,
      to: recipients,
      cc: parseList(cc),
      subject,
      body,
      attachments,
      replyTo: initial?.replyTo,
      isDraft: Boolean(draftId || initial?.isDraft),
      ...overrides,
    }),
    [draftId, initial, selectedSender, recipients, cc, subject, body, attachments]
  );

  const validateMessage = useCallback(() => {
    if (!selectedSender) {
      toast.error("Please select a sender account");
      return false;
    }
    if (uploadingAttachments) {
      toast.error("Finish, retry, or remove pending attachments before continuing");
      return false;
    }
    if (!recipients.length) {
      toast.error("Please add at least one recipient");
      return false;
    }
    return true;
  }, [selectedSender, recipients.length, uploadingAttachments]);

  const handleSend = useCallback(async () => {
    if (!validateMessage()) return;
    setSendAction("send");
    try {
      await mailApi.send(buildPayload());
      toast.success("Message sent");
      onSent?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send");
    } finally {
      setSendAction(null);
    }
  }, [validateMessage, buildPayload, onSent]);

  const handleScheduleSend = useCallback(
    async (sendAt: Date) => {
      if (!validateMessage()) return false;
      setSendAction("schedule");
      try {
        await mailApi.send(
          buildPayload({ scheduleSendAt: sendAt.toISOString() })
        );
        toast.success("Message scheduled");
        onSent?.();
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to schedule message"
        );
        return false;
      } finally {
        setSendAction(null);
      }
    },
    [validateMessage, buildPayload, onSent]
  );

  const handleBulkSend = useCallback(
    async (interval: number) => {
      if (!validateMessage()) return false;
      if (recipients.length < 2) {
        toast.error("Bulk send requires at least two recipients");
        return false;
      }
      setSendAction("bulk");
      try {
        await mailApi.massSend(buildPayload(), { interval });
        toast.success(`Bulk send started for ${recipients.length} recipients`);
        onSent?.();
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to start bulk send"
        );
        return false;
      } finally {
        setSendAction(null);
      }
    },
    [validateMessage, recipients.length, buildPayload, onSent]
  );

  const handleSaveDraft = useCallback(async () => {
    setSavingDraft(true);
    try {
      const saved = await mailApi.saveDraft(buildPayload({ isDraft: true }));
      setDraftId(saved.id);
      toast.success("Draft saved");
      onSent?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  }, [buildPayload, onSent]);

  const handleDeleteDraft = useCallback(async () => {
    if (!draftId) return;
    try {
      await mailApi.destroyMessages([draftId]);
      toast.success("Draft deleted");
      setDeleteDraftOpen(false);
      onSent?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete draft");
    }
  }, [draftId, onSent]);

  const busy = sendAction !== null || savingDraft || uploadingAttachments;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-[64px_1fr] items-center gap-2">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Select value={senderKey} onValueChange={(value) => setSenderKey(value ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select sender">
              {selectedSender?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {senderCandidates.map((sender) => (
              <SelectItem key={sender.key} value={sender.key}>
                {sender.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-[64px_1fr] items-center gap-2">
        <Label className="text-xs text-muted-foreground">To</Label>
        <div className="flex items-center gap-2">
          <MailRecipientInput
            value={to}
            onChange={setTo}
            options={recipientOptions}
            placeholder="Add recipients…"
          />
          {!showCc && (
            <Button variant="ghost" size="xs" onClick={() => setShowCc(true)}>
              Cc
            </Button>
          )}
        </div>
      </div>

      {showCc && (
        <div className="grid grid-cols-[64px_1fr] items-center gap-2">
          <Label className="text-xs text-muted-foreground">Cc</Label>
          <MailRecipientInput
            value={cc}
            onChange={setCc}
            options={recipientOptions}
            placeholder="Add Cc recipients…"
          />
        </div>
      )}

      <div className="grid grid-cols-[64px_1fr] items-center gap-2">
        <Label className="text-xs text-muted-foreground">Subject</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="h-9"
        />
      </div>

      <MailRichEditor
        value={body}
        onChange={setBody}
        placeholder="Write your message…"
        toolbarActions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title="Template"
                    aria-label="Template"
                  />
                }
              >
                <FileText />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuRadioGroup
                  value={templateId || "none"}
                  onValueChange={handleTemplateChange}
                >
                  <DropdownMenuLabel>Message template</DropdownMenuLabel>
                  <DropdownMenuRadioItem value="none">No template</DropdownMenuRadioItem>
                  {templates.map((template) => (
                    <DropdownMenuRadioItem key={template.id} value={String(template.id)}>
                      {template.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTemplateManagerOpen(true)}>
                  Manage templates
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title="Signature"
                    aria-label="Signature"
                  />
                }
              >
                <PenLine />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuRadioGroup
                  value={signatureId || "none"}
                  onValueChange={handleSignatureChange}
                >
                  <DropdownMenuLabel>Signature</DropdownMenuLabel>
                  <DropdownMenuRadioItem value="none">No signature</DropdownMenuRadioItem>
                  {signatures.map((signature) => (
                    <DropdownMenuRadioItem key={signature.id} value={String(signature.id)}>
                      {signature.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setManagerOpen(true)}>
                  Manage signatures
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="flex items-center justify-between gap-2">
        <MailComposeAttachments
          value={attachments}
          onChange={setAttachments}
          onBusyChange={setUploadingAttachments}
          disabled={sendAction !== null || savingDraft}
        />

        <div className="flex items-center gap-2">
          {draftId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDraftOpen(true)}
              disabled={busy}
            >
              <Trash2 /> Delete draft
            </Button>
          )}
          {showCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          )}
          {!bulkOnly && (
            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={busy}>
              {savingDraft ? <Loader2 className="animate-spin" /> : null}
              Save draft
            </Button>
          )}
          <MailSendActions
            disabled={busy}
            loading={sendAction !== null}
            recipientCount={recipients.length}
            allowScheduleSend={!bulkOnly && allowScheduleSend}
            allowBulkSend={!bulkOnly && allowBulkSend}
            defaultBulkIntervalMs={defaultBulkIntervalMs}
            primaryMode={bulkOnly ? "bulk" : "send"}
            onSend={handleSend}
            onScheduleSend={handleScheduleSend}
            onBulkSend={handleBulkSend}
          />
        </div>
      </div>

      <MailSignatureManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        signatures={signatures}
        onCreate={create}
        onUpdate={update}
        onRemove={remove}
        onSetDefault={setDefault}
      />

      <MailTemplateManager
        open={templateManagerOpen}
        onOpenChange={setTemplateManagerOpen}
        templates={templates}
        onCreate={createTemplate}
        onUpdate={updateTemplate}
        onRemove={removeTemplate}
      />

      <AlertDialog open={deleteDraftOpen} onOpenChange={setDeleteDraftOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the draft and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDeleteDraft()}
            >
              Delete draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const composeTitle: Record<ComposeMode, string> = {
  new: "New message",
  reply: "Reply",
  replyAll: "Reply all",
  forward: "Forward",
  draft: "Edit draft",
};

export type ComposeVariant = "drawer" | "dialog";

export interface MailComposeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts?: MailAccount[];
  initial?: ComposeInitialValues;
  mode?: ComposeMode;
  onSent?: () => void;
  variant?: ComposeVariant;
  allowScheduleSend?: boolean;
  allowBulkSend?: boolean;
  defaultBulkIntervalMs?: number;
  recipientOptions?: MailRecipientOption[];
  onAccountChange?: (account: MailAccount) => void;
}

export function MailCompose({
  open,
  onOpenChange,
  accounts,
  initial,
  mode = "new",
  onSent,
  variant = "drawer",
  allowScheduleSend = true,
  allowBulkSend = false,
  defaultBulkIntervalMs = 2_000,
  recipientOptions,
  onAccountChange,
}: MailComposeProps) {
  const [resetKey, setResetKey] = useState(0);
  const prevOpen = useRef(open);
  useEffect(() => {
    if (open && !prevOpen.current) setResetKey((key) => key + 1);
    prevOpen.current = open;
  }, [open]);

  const form = open ? (
    <MailComposeForm
      key={resetKey}
      accounts={accounts}
      initial={initial}
      mode={mode}
      allowScheduleSend={allowScheduleSend}
      allowBulkSend={allowBulkSend}
      defaultBulkIntervalMs={defaultBulkIntervalMs}
      recipientOptions={recipientOptions}
      onAccountChange={onAccountChange}
      onSent={() => {
        onOpenChange(false);
        onSent?.();
      }}
    />
  ) : null;

  if (variant === "dialog") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{composeTitle[mode]}</DialogTitle>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border/60 px-6 py-4">
          <SheetTitle>{composeTitle[mode]}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">{form}</div>
      </SheetContent>
    </Sheet>
  );
}
