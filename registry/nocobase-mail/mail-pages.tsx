import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  MailBoxType,
  MailComposeForm,
  MailFilters,
  MailInbox,
  MailMassTracking,
  type ComposeInitialValues,
  type MailColumnId,
  type MailFilterValue,
  type MailScope,
} from "./components";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PERSONAL_COLUMNS: MailColumnId[] = [
  "from",
  "to",
  "subject",
  "boxType",
  "date",
  "isRead",
  "labels",
];
const ALL_COLUMNS: MailColumnId[] = [
  "from",
  "user",
  "email",
  "subject",
  "boxType",
  "date",
  "isRead",
];

export function MailManagerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scope: MailScope = searchParams.get("scope") === "all" ? "all" : "personal";
  const filterValue = useMemo<MailFilterValue>(() => {
    const folder = searchParams.get("folder");
    const label = Number(searchParams.get("label"));
    const read = searchParams.get("read");
    return {
      boxType: Object.values(MailBoxType).includes(folder as MailBoxType)
        ? (folder as MailBoxType)
        : undefined,
      isRead: read === "read" ? true : read === "unread" ? false : undefined,
      labelId: Number.isFinite(label) && label > 0 ? label : undefined,
      isTodo: searchParams.get("starred") === "1" ? true : undefined,
    };
  }, [searchParams]);

  const updateParams = (next: MailFilterValue, nextScope = scope) => {
    const params = new URLSearchParams();
    if (nextScope === "all") params.set("scope", "all");
    if (next.boxType) params.set("folder", next.boxType);
    if (next.isRead !== undefined) {
      params.set("read", next.isRead ? "read" : "unread");
    }
    if (next.labelId) params.set("label", String(next.labelId));
    if (next.isTodo) params.set("starred", "1");
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-3xl font-semibold tracking-[-0.035em]">Mail</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Read, reply to, and manage messages from your connected mailboxes.
        </p>
      </div>
      <div className="flex justify-end">
        <Tabs
          value={scope}
          onValueChange={(value) =>
            updateParams(filterValue, (value as MailScope) ?? "personal")
          }
        >
          <TabsList>
            <TabsTrigger value="personal">My inbox</TabsTrigger>
            <TabsTrigger value="all">All users</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="grid min-h-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="self-start rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:sticky lg:top-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">Filters</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Narrow the mailbox without leaving the workspace.
            </p>
          </div>
          <MailFilters
            value={filterValue}
            onChange={updateParams}
            orientation="vertical"
          />
        </aside>
        <main className="min-w-0">
          <MailInbox
            scope={scope}
            boxType={filterValue.boxType}
            isRead={filterValue.isRead}
            labelId={filterValue.labelId}
            filter={filterValue.isTodo ? { isTodo: true } : undefined}
            columns={scope === "all" ? ALL_COLUMNS : PERSONAL_COLUMNS}
          />
        </main>
      </div>
    </div>
  );
}

export function MailBulkPage() {
  const [jobsRevision, setJobsRevision] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-[-0.035em]">Bulk mail</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Send one separate message per recipient and track every delivery job.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold">Bulk send</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add at least two recipients. Each recipient receives an individual message.
          </p>
        </div>
        <div className="max-w-2xl">
          <MailComposeForm
            bulkOnly
            allowScheduleSend={false}
            allowBulkSend
            onSent={() => setJobsRevision((revision) => revision + 1)}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold">Bulk jobs</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Track delivery progress, cancel active jobs, and retry failed recipients.
          </p>
        </div>
        <MailMassTracking key={jobsRevision} />
      </section>
    </div>
  );
}

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-[-0.035em]">New message</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Compose from a connected mailbox, or prefill fields from the URL.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
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
