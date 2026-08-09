import { useMemo, useState } from "react";
import { useTranslate } from "@refinedev/core";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Database,
  FileText,
  Filter,
  KeyRound,
  Layers3,
  MoreHorizontal,
  Paperclip,
  Play,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Webhook,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import OperationsRoom from "./operations-room";

type DealStatus = "At risk" | "Won" | "Discovery";
type Role = "Admin" | "Sales" | "Finance";
type FilterValue = "All" | DealStatus;

type Deal = {
  id: string;
  company: string;
  owner: string;
  value: string;
  status: DealStatus;
  score: number;
  updated: string;
  source: string;
};

type Capability = {
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof ShieldCheck;
  accent: string;
  example: string;
};

const deals: Deal[] = [
  { id: "AC-2048", company: "Acme Robotics", owner: "Lena Park", value: "$128k", status: "At risk", score: 42, updated: "12 min ago", source: "Inbound" },
  { id: "NO-8831", company: "Northstar Health", owner: "Marco Liu", value: "$94k", status: "Won", score: 96, updated: "34 min ago", source: "Partner" },
  { id: "VE-1190", company: "Vertex Labs", owner: "Ari Cole", value: "$76k", status: "Discovery", score: 71, updated: "1 hr ago", source: "Event" },
  { id: "FO-7712", company: "Folio Systems", owner: "Mina Shah", value: "$54k", status: "At risk", score: 38, updated: "2 hrs ago", source: "Outbound" },
];

const prompts = ["Summarize pipeline", "Find stalled deals", "Draft follow-up"];

const promptReplies: Record<string, string> = {
  "Summarize pipeline": "Pipeline is $352k across 4 opportunities. Two deals need attention today; the strongest signal is the Northstar expansion.",
  "Find stalled deals": "I found 2 deals with no meaningful activity in the last 48 hours. Acme Robotics is the highest-value intervention.",
  "Draft follow-up": "Draft ready: a concise check-in for Acme Robotics that references their integration review and proposes two meeting slots.",
};

const capabilities: Capability[] = [
  { title: "Approval & audit", eyebrow: "Governance", description: "Route sensitive changes through approvals and keep a human-readable audit trail for every decision.", icon: ShieldCheck, accent: "text-cyan-300", example: "Record action → approval node → notification → immutable audit event" },
  { title: "Knowledge & files", eyebrow: "Context", description: "Turn uploaded contracts, briefs, and playbooks into searchable context for AI employees.", icon: FileText, accent: "text-violet-300", example: "Upload → parse → index → cite source in Copilot answer" },
  { title: "Notifications", eyebrow: "Operations", description: "Keep teams moving with in-app, email, and event-driven notifications tied to business state.", icon: Activity, accent: "text-amber-300", example: "Risk threshold → inbox alert → owner escalation" },
  { title: "Integrations", eyebrow: "Connectivity", description: "Compose API, webhook, SSO, and external data-source connections without rebuilding the shell.", icon: Webhook, accent: "text-emerald-300", example: "Webhook → workflow → external system → status sync" },
  { title: "Forms & portals", eyebrow: "Experience", description: "Publish focused internal and external surfaces from the same collections, actions, and permissions.", icon: Layers3, accent: "text-sky-300", example: "Public form → validation → collection → confirmation" },
  { title: "Registry extensions", eyebrow: "Platform", description: "Add portable pages, fields, auth adapters, and reusable components without forking the host UI.", icon: KeyRound, accent: "text-rose-300", example: "Extension contract → route/resource → installable capability" },
];

const rolePermissions: Record<Role, string[]> = {
  Admin: ["All collections", "Configure automations", "View audit events"],
  Sales: ["Owned opportunities", "Create follow-ups", "View AI signals"],
  Finance: ["Approved revenue", "Export reports", "View billing fields"],
};

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/70">{children}</p>;
}

function StatusBadge({ status }: { status: DealStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-0 px-2 py-1 text-[10px]",
        status === "At risk" && "bg-rose-400/10 text-rose-300",
        status === "Won" && "bg-emerald-400/10 text-emerald-300",
        status === "Discovery" && "bg-amber-400/10 text-amber-300",
      )}
    >
      {status}
    </Badge>
  );
}

function MiniBars() {
  return (
    <div className="flex h-16 items-end gap-1.5">
      {[35, 48, 41, 63, 55, 74, 68, 91, 78, 96, 84, 100].map((height, index) => (
        <div key={index} className="flex-1 rounded-t-sm bg-cyan-300/70" style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="relative grid size-24 place-items-center rounded-full" style={{ background: `conic-gradient(#6ee7d8 ${score * 3.6}deg, rgba(255,255,255,.08) 0deg)` }}>
      <div className="grid size-[4.4rem] place-items-center rounded-full bg-[#101b29]">
        <span className="text-xl font-semibold text-white">{score}</span>
      </div>
    </div>
  );
}

export default function ShowcasePage() {
  const translate = useTranslate();
  const [mode, setMode] = useState<"overview" | "operations">("operations");
  const [filter, setFilter] = useState<FilterValue>("All");
  const [query, setQuery] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [role, setRole] = useState<Role>("Admin");
  const [automationExpanded, setAutomationExpanded] = useState(true);
  const [activeCapability, setActiveCapability] = useState(capabilities[0]);
  const [copilotReply, setCopilotReply] = useState(promptReplies["Summarize pipeline"]);
  const [recordNotice, setRecordNotice] = useState(false);

  const visibleDeals = useMemo(() => deals.filter((deal) => {
    const matchesFilter = filter === "All" || deal.status === filter;
    const needle = query.trim().toLowerCase();
    return matchesFilter && (!needle || `${deal.company} ${deal.owner} ${deal.id}`.toLowerCase().includes(needle));
  }), [filter, query]);

  const riskCount = visibleDeals.filter((deal) => deal.status === "At risk").length;
  const primaryDeal = visibleDeals[0] ?? deals[0];

  if (mode === "operations") {
    return <OperationsRoom onBackToOverview={() => setMode("overview")} />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#08111d] text-slate-100 selection:bg-cyan-300 selection:text-slate-950">
      <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.06)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none fixed -left-48 top-0 size-[38rem] rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-10 lg:py-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-cyan-300 text-slate-950"><Sparkles className="size-4" /></div>
            <div><p className="text-sm font-semibold tracking-tight">NocoBase <span className="text-cyan-300">AI Portal</span></p><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Capability command center</p></div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-400"><Button size="sm" variant="outline" className="border-cyan-300/25 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300/20" onClick={() => setMode("operations")}><Bot /> {translate("showcase.operations.mode.room", "Operations Room")}</Button><span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" /> Runtime online <Badge className="bg-white/10 text-slate-300">Demo data</Badge></div>
        </header>

        <section className="grid gap-8 py-12 lg:grid-cols-[1.15fr_.85fr] lg:items-end lg:py-20">
          <div>
            <div className="mb-6 flex items-center gap-3 text-xs text-cyan-200"><span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1">THE LIMIT SHOWCASE</span><span className="text-slate-500">No-code core + AI-native surfaces</span></div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[.95] tracking-[-.06em] text-white sm:text-7xl">Build beyond <span className="text-cyan-300">CRUD.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">A single NocoBase AI Portal can turn collections into an operating system: data, decisions, workflows, permissions, knowledge, and human action in one composable surface.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Button className="bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={() => document.getElementById("capabilities")?.scrollIntoView({ behavior: "smooth" })}>Explore architecture <ArrowUpRight /></Button><Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => document.getElementById("copilot")?.scrollIntoView({ behavior: "smooth" })}>Start with AI <Bot /></Button></div>
          </div>
          <Card id="copilot" className="border-cyan-300/20 bg-[#0d1a29]/90 shadow-2xl shadow-cyan-950/40">
            <CardHeader className="flex-row items-start justify-between space-y-0"><div><SectionLabel>AI Copilot / local demo</SectionLabel><CardTitle className="text-lg text-white">Ask your operating data</CardTitle></div><div className="grid size-9 place-items-center rounded-lg bg-cyan-300/10 text-cyan-300"><Bot className="size-4" /></div></CardHeader>
            <CardContent><div className="rounded-xl border border-white/10 bg-[#08111d] p-4"><p className="text-sm leading-6 text-slate-300">{copilotReply}</p><div className="mt-4 flex items-center gap-2 text-[10px] text-cyan-300"><Sparkles className="size-3" /> Grounded in 4 demo records · response ready</div></div><div className="mt-4 flex flex-wrap gap-2">{prompts.map((prompt) => <Button key={prompt} size="sm" variant="outline" className="border-white/10 bg-white/[.03] text-xs text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200" onClick={() => setCopilotReply(promptReplies[prompt])}>{prompt}</Button>)}</div></CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[{ label: "Collections", value: "24", delta: "+8 this month", icon: Database }, { label: "AI Employees", value: "06", delta: "3 active now", icon: Bot }, { label: "Automations", value: "18", delta: "92% success rate", icon: Play }, { label: "Connected Sources", value: "09", delta: "API · SSO · Files", icon: Webhook }].map(({ label, value, delta, icon: Icon }) => <Card key={label} className={cn("border-white/10 bg-white/[.035]", label === "Automations" && "cursor-pointer transition-colors hover:border-cyan-300/30")} onClick={label === "Automations" ? () => setAutomationExpanded(true) : undefined} role={label === "Automations" ? "button" : undefined} tabIndex={label === "Automations" ? 0 : undefined}><CardContent className="p-4 sm:p-5"><div className="flex items-center justify-between"><Icon className="size-4 text-slate-500" /><span className="text-[10px] text-emerald-300">{delta}</span></div><p className="mt-5 text-3xl font-semibold tracking-tight text-white">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></CardContent></Card>)}
        </section>

        <section className="mt-12 grid min-w-0 gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <Card className="min-w-0 border-white/10 bg-[#0d1a29]/85"><CardHeader className="flex-row items-end justify-between space-y-0"><div><SectionLabel>Revenue workspace / collection view</SectionLabel><CardTitle className="text-xl text-white">Pipeline records</CardTitle></div><div className="flex gap-2"><Button size="sm" aria-label="Create demo record" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={() => { setQuery(""); setFilter("All"); setRecordNotice(true); }}><Plus /> New record</Button><Button size="icon-sm" aria-label="More record actions" variant="outline" className="border-white/10 bg-white/5"><MoreHorizontal /></Button></div></CardHeader><CardContent className="min-w-0"><div className="mb-4 flex flex-wrap items-center gap-2"><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-2.5 size-3.5 text-slate-500" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setRecordNotice(false); }} placeholder="Search records..." className="h-8 border-white/10 bg-white/[.03] pl-9 text-xs text-white placeholder:text-slate-600" /></div><Button size="sm" aria-label="Reset record filters" variant="outline" className="border-white/10 bg-white/5 text-xs text-slate-300" onClick={() => { setQuery(""); setFilter("All"); }}><Filter /> Filter</Button>{(["All", "At risk", "Won"] as FilterValue[]).map((value) => <Button key={value} size="sm" variant="ghost" className={cn("text-xs text-slate-500", filter === value && "bg-cyan-300/10 text-cyan-200")} onClick={() => setFilter(value)}>{value}</Button>)}</div>{recordNotice && <p className="mb-3 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">Demo create flow reset. Connect this action to a collection form when using live data.</p>}<div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-white/[.03] text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Opportunity</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">AI score</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-white/5">{visibleDeals.map((deal) => <tr key={deal.id} className="cursor-pointer transition-colors hover:bg-cyan-300/[.04]" onClick={() => setSelectedDeal(deal)}><td className="px-4 py-4"><p className="font-medium text-white">{deal.company}</p><p className="mt-1 text-[10px] text-slate-500">{deal.id} · {deal.source}</p></td><td className="px-4 py-4 text-slate-400">{deal.owner}</td><td className="px-4 py-4 font-medium text-white">{deal.value}</td><td className="px-4 py-4"><StatusBadge status={deal.status} /></td><td className="px-4 py-4"><span className={cn("font-medium", deal.score < 50 ? "text-rose-300" : "text-cyan-200")}>{deal.score}%</span></td><td className="px-4 py-4 text-right"><MoreHorizontal className="ml-auto size-4 text-slate-600" /></td></tr>)}{visibleDeals.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No demo records match this view.</td></tr>}</tbody></table></div><p className="mt-3 text-[10px] text-slate-600">Click any row to open record detail, activity, files, approvals, and audit history.</p></CardContent></Card>

          <div className="grid gap-5"><Card className="border-cyan-300/20 bg-cyan-300/[.055]"><CardHeader className="flex-row items-center justify-between space-y-0"><div><SectionLabel>AI signal</SectionLabel><CardTitle className="text-lg text-white">Decision layer</CardTitle></div><TrendingUp className="size-5 text-cyan-300" /></CardHeader><CardContent><div className="flex items-center gap-5"><ScoreRing score={primaryDeal.score} /><div><p className="text-sm font-medium text-white">{riskCount ? `${riskCount} intervention${riskCount > 1 ? "s" : ""} needed` : "Pipeline looks healthy"}</p><p className="mt-2 text-xs leading-5 text-slate-400">{primaryDeal.company} is the highest-value signal in this view. AI recommends an owner follow-up within 24 hours.</p></div></div><div className="mt-5 flex flex-wrap gap-2">{visibleDeals.slice(0, 3).map((deal) => <span key={deal.id} className="rounded-full border border-cyan-300/20 px-2 py-1 text-[10px] text-cyan-200">{deal.company}</span>)}</div></CardContent></Card>
            <Card className="border-white/10 bg-white/[.035]"><CardHeader className="flex-row items-center justify-between space-y-0"><div><SectionLabel>Workflow runtime</SectionLabel><CardTitle className="text-lg text-white">Risk intervention</CardTitle></div><Button size="icon-sm" variant="ghost" className="text-slate-400" onClick={() => setAutomationExpanded((expanded) => !expanded)}>{automationExpanded ? <ChevronDown /> : <Play />}</Button></CardHeader>{automationExpanded && <CardContent><div className="space-y-4">{[{ label: "Risk score generated", meta: "AI employee · 2m ago", done: true }, { label: "Notify sales owner", meta: "Notification · queued", done: true }, { label: "Create follow-up", meta: "Approval required", done: false }].map((step) => <div key={step.label} className="flex gap-3"><div className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border", step.done ? "border-cyan-300/50 bg-cyan-300 text-slate-950" : "border-amber-300/40 text-amber-300")}>{step.done ? <Check className="size-3" /> : <Clock3 className="size-3" />}</div><div><p className="text-xs font-medium text-slate-200">{step.label}</p><p className="mt-1 text-[10px] text-slate-500">{step.meta}</p></div></div>)}</div></CardContent>}</Card></div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr_.8fr]">
          <Card className="border-white/10 bg-[#0d1a29]/85"><CardHeader><SectionLabel>Analytics</SectionLabel><CardTitle className="text-lg text-white">Revenue momentum</CardTitle></CardHeader><CardContent><div className="mb-3 flex items-end justify-between"><div><p className="text-3xl font-semibold text-white">$1.84m</p><p className="mt-1 text-xs text-emerald-300">↑ 18.6% vs last quarter</p></div><Badge className="bg-cyan-300/10 text-cyan-200">Live demo</Badge></div><MiniBars /><div className="mt-3 flex justify-between text-[10px] text-slate-600"><span>JAN</span><span>APR</span><span>JUL</span><span>OCT</span></div></CardContent></Card>
          <Card className="border-white/10 bg-[#0d1a29]/85"><CardHeader><SectionLabel>Permission lens</SectionLabel><CardTitle className="text-lg text-white">One data model, many views</CardTitle></CardHeader><CardContent><div className="mb-4 flex gap-1 rounded-lg bg-white/[.04] p-1">{(["Admin", "Sales", "Finance"] as Role[]).map((item) => <button key={item} className={cn("flex-1 rounded-md px-2 py-2 text-[10px] text-slate-500", role === item && "bg-cyan-300/15 text-cyan-200")} onClick={() => setRole(item)}>{item}</button>)}</div><div className="space-y-3">{rolePermissions[role].map((permission) => <div key={permission} className="flex items-center gap-2 text-xs text-slate-300"><Check className="size-3 text-emerald-300" /> {permission}</div>)}</div><div className="mt-5 border-t border-white/10 pt-4 text-[10px] text-slate-500"><KeyRound className="mr-1 inline size-3 text-cyan-300" /> Server ACL remains authoritative</div></CardContent></Card>
          <Card className="border-white/10 bg-[#0d1a29]/85"><CardHeader><SectionLabel>Source distribution</SectionLabel><CardTitle className="text-lg text-white">Where work comes from</CardTitle></CardHeader><CardContent><div className="space-y-4">{[["Inbound", "42%", "bg-cyan-300"], ["Partner", "28%", "bg-violet-300"], ["Event", "18%", "bg-amber-300"], ["Outbound", "12%", "bg-rose-300"]].map(([label, value, color]) => <div key={label}><div className="mb-2 flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="text-white">{value}</span></div><div className="h-1.5 rounded-full bg-white/10"><div className={cn("h-full rounded-full", color)} style={{ width: value }} /></div></div>)}</div></CardContent></Card>
        </section>

        <section id="capabilities" className="mt-16"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><SectionLabel>Composable platform surface</SectionLabel><h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">The rest of the iceberg.</h2></div><p className="max-w-md text-sm leading-6 text-slate-500">CRUD is the starting point. The real leverage appears when every record can trigger intelligence, governance, and action.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{capabilities.map((capability) => { const Icon = capability.icon; const active = activeCapability.title === capability.title; return <button key={capability.title} className={cn("group rounded-2xl border p-5 text-left transition-all", active ? "border-cyan-300/40 bg-cyan-300/[.08]" : "border-white/10 bg-white/[.035] hover:border-white/20 hover:bg-white/[.06]")} onClick={() => setActiveCapability(capability)}><div className="flex items-start justify-between"><div className={cn("grid size-10 place-items-center rounded-xl bg-white/5", capability.accent)}><Icon className="size-4" /></div><ArrowUpRight className="size-4 text-slate-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div><p className="mt-5 text-[10px] uppercase tracking-[.2em] text-slate-500">{capability.eyebrow}</p><h3 className="mt-2 text-base font-medium text-white">{capability.title}</h3><p className="mt-2 text-xs leading-5 text-slate-400">{capability.description}</p></button> })}</div><div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.05] px-5 py-4"><div className="grid size-8 place-items-center rounded-lg bg-cyan-300 text-slate-950"><Sparkles className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-medium text-white">{activeCapability.title}</p><p className="mt-1 truncate text-[10px] text-cyan-100/60">{activeCapability.example}</p></div><Badge className="bg-white/10 text-cyan-100">Composable</Badge></div></section>

        <footer className="mt-16 flex flex-col gap-4 border-t border-white/10 py-8 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between"><p>NocoBase AI Portal · Build beyond CRUD · Demo data only</p><div className="flex items-center gap-4"><span><Users className="mr-1 inline size-3" /> Human-in-the-loop</span><span><ShieldCheck className="mr-1 inline size-3" /> Governed by design</span></div></footer>
      </div>

      <Drawer open={Boolean(selectedDeal)} onOpenChange={(open) => !open && setSelectedDeal(null)}>
        <DrawerContent className="border-white/10 bg-[#0d1a29] text-slate-100"><DrawerHeader className="border-b border-white/10"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-cyan-300">Record detail · Demo data</p><DrawerTitle className="mt-2 text-2xl text-white">{selectedDeal?.company}</DrawerTitle><p className="mt-1 text-xs text-slate-500">{selectedDeal?.id} · {selectedDeal?.source} · updated {selectedDeal?.updated}</p></div><DrawerClose render={<Button size="icon-sm" variant="ghost" className="text-slate-400"><X /></Button>} /></div></DrawerHeader><div className="space-y-6 overflow-y-auto p-6"><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><p className="text-[10px] uppercase text-slate-500">Deal value</p><p className="mt-2 text-xl font-semibold text-white">{selectedDeal?.value}</p></div><div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><p className="text-[10px] uppercase text-slate-500">AI score</p><p className="mt-2 text-xl font-semibold text-cyan-200">{selectedDeal?.score}%</p></div></div><div><SectionLabel>Fields & ownership</SectionLabel><div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[.03]">{[["Owner", selectedDeal?.owner], ["Status", selectedDeal?.status], ["Next action", "Schedule integration review"]].map(([label, value]) => <div key={label} className="flex justify-between px-4 py-3 text-xs"><span className="text-slate-500">{label}</span><span className="text-slate-200">{value}</span></div>)}</div></div><div><SectionLabel>Activity & evidence</SectionLabel><div className="space-y-4">{[["AI employee", "Risk score generated from recent activity", Bot], ["Attachment", "integration-brief.pdf · parsed", Paperclip], ["Approval", "Sales owner review pending", Clock3], ["Audit", "Record viewed by Lena Park", ShieldCheck]].map(([label, value, Icon]) => { const ItemIcon = Icon as typeof Activity; return <div key={label as string} className="flex gap-3"><ItemIcon className="mt-0.5 size-4 text-cyan-300" /><div><p className="text-xs font-medium text-slate-200">{label as string}</p><p className="mt-1 text-xs text-slate-500">{value as string}</p></div></div> })}</div></div><Button className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Send /> Draft follow-up with AI</Button></div></DrawerContent>
      </Drawer>
    </main>
  );
}
