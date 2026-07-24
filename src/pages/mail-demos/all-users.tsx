import { MailInbox } from "@/extensions/nocobase-mail";
import { DemoShell } from "./demo-shell";

const code = `<MailInbox
  scope="all"
  columns={["from", "user", "email", "subject", "boxType", "date", "isRead", "labels"]}
/>`;

export function MailDemoAllUsers() {
  return (
    <DemoShell
      scenario="01"
      title="All-users inbox"
      description="Every message across all connected mailboxes in a single table. Use the Columns menu to toggle Owner and Mailbox, select rows for bulk actions, and click a row to open the message in a side panel where you can reply or forward."
      code={code}
    >
      <MailInbox
        scope="all"
        columns={["from", "user", "email", "subject", "boxType", "date", "isRead", "labels"]}
      />
    </DemoShell>
  );
}
