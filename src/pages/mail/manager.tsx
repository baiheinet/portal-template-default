import { useState } from "react";
import { Breadcrumb } from "@/components/app-shell/breadcrumb";
import { MailInbox } from "@/extensions/nocobase-mail";
import type { MailColumnId, MailScope } from "@/extensions/nocobase-mail";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PERSONAL_COLUMNS: MailColumnId[] = ["from", "to", "subject", "boxType", "date", "isRead", "labels"];
const ALL_COLUMNS: MailColumnId[] = ["from", "user", "email", "subject", "boxType", "date", "isRead"];

export function MailManagerPage() {
  const [scope, setScope] = useState<MailScope>("personal");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center text-muted-foreground">
          <Breadcrumb />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.035em]">Mail</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Read, reply to, and manage messages from your connected mailboxes.
            </p>
          </div>
          <Tabs value={scope} onValueChange={(value) => setScope((value as MailScope) ?? "personal")}>
            <TabsList>
              <TabsTrigger value="personal">My inbox</TabsTrigger>
              <TabsTrigger value="all">All users</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <MailInbox
        scope={scope}
        columns={scope === "all" ? ALL_COLUMNS : PERSONAL_COLUMNS}
      />
    </div>
  );
}
