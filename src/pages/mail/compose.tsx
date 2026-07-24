import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Breadcrumb } from "@/components/app-shell/breadcrumb";
import { MailComposeForm } from "@/extensions/nocobase-mail";
import type { ComposeInitialValues } from "@/extensions/nocobase-mail";

export function MailComposePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initial = useMemo<ComposeInitialValues>(
    () => ({
      to: searchParams.get("to") ?? undefined,
      cc: searchParams.get("cc") ?? undefined,
      subject: searchParams.get("subject") ?? undefined,
      body: searchParams.get("body") ?? undefined,
    }),
    [searchParams]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center text-muted-foreground">
          <Breadcrumb />
        </div>
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.035em]">
            New message
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Compose and send an email from your connected mailbox.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl rounded-xl border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <MailComposeForm
          initial={initial}
          showCancel
          onSent={() => navigate("/admin/mail")}
          onCancel={() => navigate("/admin/mail")}
        />
      </div>
    </div>
  );
}
