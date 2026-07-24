import { MailInbox } from "@/extensions/nocobase-mail";
import { DemoShell } from "./demo-shell";

const code = `<MailInbox scope="personal" />`;

export function MailDemoPersonal() {
  return (
    <DemoShell
      scenario="02"
      title="Personal inbox"
      description="The current user's own messages as a table, scoped via the listPerson action. Search, bulk-select, and click any row to read the message in a side panel and reply."
      code={code}
    >
      <MailInbox scope="personal" />
    </DemoShell>
  );
}
