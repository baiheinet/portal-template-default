import { useState } from "react";
import { MessagesSquare, Users } from "lucide-react";
import { MailInbox } from "@/extensions/nocobase-mail";
import type { MailUserRecord } from "@/extensions/nocobase-mail";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { DemoShell } from "./demo-shell";
import { useUsers, userDisplayName, userInitials } from "./use-users";

const code = `const [user, setUser] = useState<MailUserRecord>();

{/* Click a row's action -> a drawer of back-and-forth mail */}
<Sheet open={!!user} onOpenChange={(open) => !open && setUser(undefined)}>
  <SheetContent side="right" className="sm:max-w-4xl">
    <MailInbox
      key={user.id}
      scope="personal"
      filter={{
        $or: [
          { from: { $includes: user.email } },
          { to: { $includes: user.email } },
        ],
      }}
      columns={["from", "to", "boxType", "subject", "date", "isRead", "labels"]}
    />
  </SheetContent>
</Sheet>`;

export function MailDemoUserMail() {
  const { users, loading } = useUsers();
  const [selectedUser, setSelectedUser] = useState<MailUserRecord | undefined>();

  return (
    <DemoShell
      scenario="04"
      title="Correspondence per user"
      description="A directory of your teammates. Hit the correspondence action on any row and a drawer slides in with every message you've exchanged with that person — click one to read it, or start a reply without leaving the drawer."
      code={code}
    >
      <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
          <Users className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold">Team members</h2>
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
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3.5 w-44" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-8 w-36" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="group transition-colors hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {userInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {userDisplayName(user)}
                        </div>
                        {user.username && (
                          <div className="truncate text-xs text-muted-foreground">
                            @{user.username}
                          </div>
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
                      <MessagesSquare />
                      Correspondence
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(undefined);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-4xl"
        >
          {selectedUser && (
            <>
              <SheetHeader className="flex-row items-center gap-3 border-b border-border/60 px-6 py-4">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {userInitials(selectedUser)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate">
                    {userDisplayName(selectedUser)}
                  </SheetTitle>
                  <SheetDescription className="truncate">
                    {selectedUser.email}
                  </SheetDescription>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4">
                <MailInbox
                  key={selectedUser.id}
                  scope="personal"
                  filter={{
                    $or: [
                      { from: { $includes: selectedUser.email } },
                      { to: { $includes: selectedUser.email } },
                    ],
                  }}
                  columns={["from", "to", "boxType", "subject", "date", "isRead", "labels"]}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DemoShell>
  );
}
