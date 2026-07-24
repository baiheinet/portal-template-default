import { useCallback, useState } from "react";
import type { MailAccount, MailMessage } from "./types";
import { MailCompose } from "./mail-compose";
import type {
  ComposeInitialValues,
  ComposeMode,
  ComposeVariant,
} from "./mail-compose";

export function buildComposeInitial(
  message: MailMessage,
  mode: ComposeMode,
  accountEmails: string[] = []
): ComposeInitialValues {
  if (mode === "forward") {
    return {
      subject: `Fwd: ${message.subject}`,
      body: `\n\n---------- Forwarded message ----------\nFrom: ${message.from}\nDate: ${message.date}\nSubject: ${message.subject}\n\n${message.bodyText ?? ""}`,
    };
  }

  const replyTo = message.replyTo || message.mailId;
  const to =
    mode === "replyAll"
      ? [message.from, ...(message.toUsers?.map((u) => u.address) ?? [])]
          .filter((addr) => addr && !accountEmails.includes(addr))
          .join(", ")
      : message.from;

  return {
    to,
    subject: message.subject?.startsWith("Re:")
      ? message.subject
      : `Re: ${message.subject}`,
    replyTo,
  };
}

export interface UseMailComposeOptions {
  accounts?: MailAccount[];
  onSent?: () => void;
  variant?: ComposeVariant;
}

export function useMailCompose(options: UseMailComposeOptions = {}) {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<ComposeInitialValues>();
  const [mode, setMode] = useState<ComposeMode>("new");

  const openCompose = useCallback(
    (values?: ComposeInitialValues, nextMode: ComposeMode = "new") => {
      setInitial(values);
      setMode(nextMode);
      setOpen(true);
    },
    []
  );

  const reply = useCallback(
    (message: MailMessage, nextMode: ComposeMode = "reply") => {
      const accountEmails = (options.accounts ?? []).map((a) => a.email);
      openCompose(buildComposeInitial(message, nextMode, accountEmails), nextMode);
    },
    [options.accounts, openCompose]
  );

  const close = useCallback(() => setOpen(false), []);

  const composeDialog = (
    <MailCompose
      open={open}
      onOpenChange={setOpen}
      accounts={options.accounts}
      initial={initial}
      mode={mode}
      onSent={options.onSent}
      variant={options.variant}
    />
  );

  return { open, openCompose, reply, close, composeDialog };
}
