import { Link } from "react-router";
import {
  ArrowRight,
  ListFilter,
  PenLine,
  Send,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const scenarios = [
  {
    num: "01",
    title: "All-users inbox",
    desc: "Every message across all connected mailboxes, in one table. Toggle the Owner and Mailbox columns, click a row to read, reply or forward.",
    tags: ['scope="all"', 'view="table"', "columns"],
    to: "/admin/mail-demos/all-users",
    icon: Users,
  },
  {
    num: "02",
    title: "Personal inbox",
    desc: "The current user's own messages as a table — scoped via the listPerson action, with search, bulk actions and a side-panel reader.",
    tags: ['scope="personal"', "table"],
    to: "/admin/mail-demos/personal",
    icon: UserRound,
  },
  {
    num: "03",
    title: "Compose page",
    desc: "A standalone compose route. Prefill it straight from the query string: ?to=&subject=&body=.",
    tags: ["/admin/mail/compose", "query prefill"],
    to: "/admin/mail/compose",
    icon: PenLine,
  },
  {
    num: "04",
    title: "Correspondence per user",
    desc: "A team directory where each row opens a drawer of every message you've exchanged with that person — read one or reply without leaving.",
    tags: ["user table", "drawer", "$or filter"],
    to: "/admin/mail-demos/filtered",
    icon: ListFilter,
  },
  {
    num: "05",
    title: "Send to anyone",
    desc: "A plain team directory where every row opens a compose dialog already addressed to that person — via a single useMailCompose hook.",
    tags: ["useMailCompose", "openCompose({...})"],
    to: "/admin/mail-demos/compose-anywhere",
    icon: Send,
  },
];

export function MailDemosOverview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-xl border bg-card">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:20px_20px] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl"
        />
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
              Mail components
            </span>
            <span className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
              05 scenarios
            </span>
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.03em] sm:text-5xl">
            One mail module,{" "}
            <span className="text-primary underline decoration-primary/25 decoration-4 underline-offset-8">
              five
            </span>{" "}
            ways to ship it.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            A single, self-contained set of components — list, table, detail and
            compose — recombined for every surface in your app. Each scenario
            below runs against the live NocoBase mail API.
          </p>
        </div>
      </div>

      <div className="flex flex-col">
        {scenarios.map((scenario, index) => {
          const Icon = scenario.icon;
          return (
            <Link
              key={scenario.num}
              to={scenario.to}
              style={{ animationDelay: `${index * 70}ms` }}
              className={cn(
                "group relative flex items-center gap-5 border-t py-6 transition-colors",
                "animate-in fade-in-0 slide-in-from-bottom-2 [animation-fill-mode:both]",
                "last:border-b"
              )}
            >
              <span className="w-12 shrink-0 font-mono text-3xl font-bold text-muted-foreground/30 transition-colors group-hover:text-primary sm:text-4xl">
                {scenario.num}
              </span>

              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
                <Icon className="size-4.5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
                    {scenario.title}
                  </h2>
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
                  {scenario.desc}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {scenario.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <ArrowRight className="size-5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
