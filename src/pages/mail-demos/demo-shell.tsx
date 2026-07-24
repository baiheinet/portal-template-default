import type { PropsWithChildren } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoShell({
  scenario,
  title,
  description,
  code,
  className,
  children,
}: PropsWithChildren<{
  scenario: string;
  title: string;
  description: string;
  code?: string;
  className?: string;
}>) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div>
        <Link
          to="/admin/mail-demos"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All scenarios
        </Link>
        <p className="mt-4 font-mono text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
          Scenario {scenario}
        </p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      {code && <UsageSnippet code={code} />}

      {children}
    </div>
  );
}

export function UsageSnippet({
  code,
  title = "Usage",
}: {
  code: string;
  title?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
      <div className="flex items-center gap-1.5 border-b border-zinc-800/80 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-zinc-700" />
        <span className="size-2.5 rounded-full bg-zinc-700" />
        <span className="size-2.5 rounded-full bg-zinc-700" />
        <span className="ml-2 font-mono text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
          {title}
        </span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-5">
        <code>{code}</code>
      </pre>
    </div>
  );
}
