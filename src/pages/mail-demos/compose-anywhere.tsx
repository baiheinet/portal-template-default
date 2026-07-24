import { Mail, Send, Users } from "lucide-react";
import { useMailCompose } from "@/extensions/nocobase-mail";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoShell } from "./demo-shell";
import { useUsers, userDisplayName, userInitials } from "./use-users";

const code = `const { users } = useUsers();
const { openCompose, composeDialog } = useMailCompose();

<Button onClick={() =>
  openCompose({
    to: user.email,
    subject: \`Following up, \${user.nickname}\`,
    body: \`Hi \${user.nickname},\\n\\n\`,
  })
}>
  <Send /> Send email
</Button>

{composeDialog}`;

export function MailDemoComposeAnywhere() {
  const { users, loading } = useUsers();
  const { openCompose, composeDialog } = useMailCompose();

  return (
    <DemoShell
      scenario="05"
      title="Send to anyone, anywhere"
      description="This is just a directory of your teammates — nothing mail-specific about it. Yet every row can open a compose dialog already addressed to that person, via a single useMailCompose hook. Drop it on any page in your app."
      code={code}
    >
      <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
          <Users className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold">Team directory</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {loading ? "Loading…" : `${users.length} people`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-border/60">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-44" />
                </div>
                <Skeleton className="h-8 w-28" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {users.map((user) => (
              <div
                key={user.id}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
              >
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {userInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {userDisplayName(user)}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {user.email || "no email on file"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!user.email}
                  onClick={() =>
                    openCompose({
                      to: user.email,
                      subject: `Following up, ${userDisplayName(user)}`,
                      body: `Hi ${userDisplayName(user)},\n\n`,
                    })
                  }
                >
                  <Send />
                  Send email
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Mail className="size-3.5" />
        The compose dialog mounts once at the page root and reuses itself for
        every recipient.
      </p>

      {composeDialog}
    </DemoShell>
  );
}
