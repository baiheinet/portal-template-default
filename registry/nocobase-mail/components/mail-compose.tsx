import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import type { MailAccount, MailSendPayload } from "./types";
import { mailApi } from "./mail-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface ComposeInitialValues {
  from?: string;
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
  replyTo?: string;
  isDraft?: boolean;
  id?: number;
}

export type ComposeMode = "new" | "reply" | "replyAll" | "forward" | "draft";

const parseList = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

export function MailComposeForm({
  accounts: accountsProp,
  initial,
  onSent,
  onCancel,
  showCancel = false,
  className,
}: {
  accounts?: MailAccount[];
  initial?: ComposeInitialValues;
  onSent?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  className?: string;
}) {
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

  const fromEmails = useMemo(
    () =>
      accounts.flatMap((account) => [
        account.email,
        ...(account.identities?.map((identity) => identity.email) ?? []),
      ]),
    [accounts]
  );
  const defaultFrom = fromEmails[0] ?? "";

  const [from, setFrom] = useState("");
  const [to, setTo] = useState(initial?.to ?? "");
  const [cc, setCc] = useState(initial?.cc ?? "");
  const [showCc, setShowCc] = useState(Boolean(initial?.cc));
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    setFrom(initial?.from ?? "");
    setTo(initial?.to ?? "");
    setCc(initial?.cc ?? "");
    setShowCc(Boolean(initial?.cc));
    setSubject(initial?.subject ?? "");
    setBody(initial?.body ?? "");
    setAttachments([]);
  }, [initial]);

  useEffect(() => {
    if (defaultFrom) setFrom((prev) => prev || defaultFrom);
  }, [defaultFrom]);

  const buildPayload = useCallback(
    (): MailSendPayload => ({
      id: initial?.id,
      from,
      to: parseList(to),
      cc: parseList(cc),
      subject,
      body,
      replyTo: initial?.replyTo,
      isDraft: initial?.isDraft,
    }),
    [initial, from, to, cc, subject, body]
  );

  const handleSend = useCallback(async () => {
    if (!parseList(to).length) {
      toast.error("Please add at least one recipient");
      return;
    }
    setSending(true);
    try {
      await mailApi.send(buildPayload());
      toast.success("Message sent");
      onSent?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }, [to, buildPayload, onSent]);

  const handleSaveDraft = useCallback(async () => {
    setSavingDraft(true);
    try {
      await mailApi.saveDraft(buildPayload());
      toast.success("Draft saved");
      onSent?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  }, [buildPayload, onSent]);

  const busy = sending || savingDraft;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-[64px_1fr] items-center gap-2">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Select value={from} onValueChange={(value) => setFrom(value ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select sender" />
          </SelectTrigger>
          <SelectContent>
            {fromEmails.map((email) => (
              <SelectItem key={email} value={email}>
                {email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-[64px_1fr] items-center gap-2">
        <Label className="text-xs text-muted-foreground">To</Label>
        <div className="flex items-center gap-2">
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipients, comma separated"
            className="h-9"
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
          <Input
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="cc recipients"
            className="h-9"
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

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message…"
        className="min-h-44 resize-y"
      />

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="flex items-center gap-1.5 rounded-md border border-border/80 bg-muted/50 px-2 py-1 text-xs"
            >
              <Paperclip className="size-3 text-muted-foreground" />
              {file.name}
              <button
                type="button"
                className="text-muted-foreground transition-colors hover:text-foreground"
                onClick={() =>
                  setAttachments((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
                e.target.value = "";
              }
            }}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            title="Attach files"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {showCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={busy}>
            {savingDraft ? <Loader2 className="animate-spin" /> : null}
            Save draft
          </Button>
          <Button size="sm" onClick={handleSend} disabled={busy}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
            Send
          </Button>
        </div>
      </div>
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

export function MailCompose({
  open,
  onOpenChange,
  accounts,
  initial,
  mode = "new",
  onSent,
  variant = "drawer",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts?: MailAccount[];
  initial?: ComposeInitialValues;
  mode?: ComposeMode;
  onSent?: () => void;
  variant?: ComposeVariant;
}) {
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
