import { useEffect, useState } from "react";
import {
  ListFilter,
  MessagesSquare,
  PanelsLeftRight,
  PenLine,
  Send,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import {
  MailInbox,
  mailApi,
  useMailCompose,
  type MailColumnId,
  type MailScope,
  type MailUserRecord,
} from "./components";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const scenarios = [
  {
    title: "Mail workspace",
    description: "A complete mailbox workspace with folders, filters, and message actions.",
    path: "/admin/mail-demos/workspace",
    icon: PanelsLeftRight,
  },
  {
    title: "Personal & all-users inbox",
    description: "Reuse one inbox component for the current user or every connected mailbox.",
    path: "/admin/mail-demos/personal",
    icon: Users,
  },
  {
    title: "Compose page",
    description: "A standalone compose route with query-string prefilling.",
    path: "/admin/mail/compose",
    icon: PenLine,
  },
  {
    title: "Correspondence per user",
    description: "Select a user and inspect all messages exchanged with that address.",
    path: "/admin/mail-demos/filtered",
    icon: ListFilter,
  },
  {
    title: "Send to anyone",
    description: "Launch the reusable compose dialog from an ordinary user directory.",
    path: "/admin/mail-demos/compose-anywhere",
    icon: Send,
  },
];

function ScenarioHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Mail components
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function useMailUsers() {
  const [users, setUsers] = useState<MailUserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    mailApi
      .getUsers()
      .then((next) => active && setUsers(next))
      .catch(() => active && setUsers([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { users, loading };
}

function userName(user: MailUserRecord) {
  return user.nickname || user.username || user.email || `User #${user.id}`;
}

function userInitials(user: MailUserRecord) {
  return userName(user)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function MailScenarioOverview() {
  return (
    <div className="space-y-6">
      <ScenarioHeader
        title="Five mail integration scenarios"
        description="The original five entry points are registered by the mail extension and all use the live NocoBase mail API."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {scenarios.map((scenario, index) => {
          const Icon = scenario.icon;
          return (
            <Link
              key={scenario.path}
              to={scenario.path}
              className="group flex gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/35 hover:bg-muted/30"
            >
              <span className="font-mono text-2xl font-semibold text-muted-foreground/40">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Icon className="mt-1 size-5 text-muted-foreground group-hover:text-primary" />
              <span>
                <span className="block font-semibold">{scenario.title}</span>
                <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                  {scenario.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function MailAudienceScenario() {
  const [scope, setScope] = useState<MailScope>("personal");
  return (
    <div className="space-y-6">
      <ScenarioHeader
        title="Personal & all-users inbox"
        description="Switch the same MailInbox between the signed-in user's messages and all connected users."
      />
      <MailInbox
        scope={scope}
        columns={scope === "all" ? ALL_COLUMNS : PERSONAL_COLUMNS}
        toolbarActions={
          <Tabs value={scope} onValueChange={(value) => setScope(value as MailScope)}>
            <TabsList>
              <TabsTrigger value="personal">My inbox</TabsTrigger>
              <TabsTrigger value="all">All users</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
    </div>
  );
}

export function MailCorrespondenceScenario() {
  const { users, loading } = useMailUsers();
  const [selectedUser, setSelectedUser] = useState<MailUserRecord>();
  return (
    <div className="space-y-6">
      <ScenarioHeader
        title="Correspondence per user"
        description="Open a user from the directory to inspect the messages owned by that user's connected mailbox."
      />
      <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
          <Users className="size-4 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold">Users</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {loading ? "Loading…" : `${users.length} people`}
            </p>
          </div>
        </div>
        <Table>
          <TableHeader className="bg-muted/45">
            <TableRow>
              <TableHead className="w-[45%]">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-9 w-44" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-8 w-32" /></TableCell>
                  </TableRow>
                ))
              : users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {userInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{userName(user)}</div>
                          {user.username && (
                            <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!user.email}
                        onClick={() => setSelectedUser(user)}
                      >
                        <MessagesSquare /> Correspondence
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={Boolean(selectedUser)}
        onOpenChange={(open) => !open && setSelectedUser(undefined)}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-4xl"
        >
          {selectedUser?.email && (
            <>
              <SheetHeader className="flex-row items-center gap-3 border-b border-border/60 px-6 py-4">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {userInitials(selectedUser)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{userName(selectedUser)}</SheetTitle>
                  <SheetDescription className="truncate">{selectedUser.email}</SheetDescription>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4">
                <MailInbox
                  key={selectedUser.id}
                  scope="all"
                  userId={selectedUser.id}
                  columns={PERSONAL_COLUMNS}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function MailComposeAnywhereScenario() {
  const { users, loading } = useMailUsers();
  const { openCompose, composeDialog } = useMailCompose();
  return (
    <div className="space-y-6">
      <ScenarioHeader
        title="Send to anyone, anywhere"
        description="An ordinary user directory can open the shared compose dialog with recipient fields prefilled."
      />
      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading users…</p>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex items-center gap-4 px-5 py-4">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{userName(user)}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {user.email || "No email address"}
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!user.email}
                onClick={() =>
                  openCompose({
                    to: user.email,
                    subject: `Following up, ${userName(user)}`,
                    body: `Hi ${userName(user)},<p></p>`,
                  })
                }
              >
                <Send /> Send email
              </Button>
            </div>
          ))
        )}
      </div>
      {composeDialog}
    </div>
  );
}
