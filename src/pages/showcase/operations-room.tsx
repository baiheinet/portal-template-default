import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileSearch,
  KeyRound,
  ListChecks,
  Play,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslate } from "@refinedev/core";

import {
  AIPageContextScope,
  createAIPageContextReference,
} from "@/extensions/nocobase-ai/providers/page-context";

import {
  createDemoMissionExecutor,
  type MissionState,
  type MissionStatus,
  type MissionStep,
} from "./mission";

const executor = createDemoMissionExecutor();

const statusStyles: Record<MissionStatus | MissionStep["status"], string> = {
  idle: "border-white/10 bg-white/5 text-slate-400",
  planning: "border-violet-300/30 bg-violet-300/10 text-violet-200",
  ready: "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
  running: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  "needs approval": "border-amber-300/40 bg-amber-300/15 text-amber-100",
  completed: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  blocked: "border-rose-300/30 bg-rose-300/10 text-rose-200",
  failed: "border-rose-300/40 bg-rose-300/15 text-rose-100",
  queued: "border-white/10 bg-white/5 text-slate-500",
};

const toolIcons = {
  Query: ListChecks,
  "Knowledge search": FileSearch,
  Draft: Sparkles,
  "Permission check": KeyRound,
  "Create task": Check,
};

const toolKeys: Record<string, string> = {
  Query: "showcase.operations.tool.query",
  "Knowledge search": "showcase.operations.tool.knowledge",
  Draft: "showcase.operations.tool.draft",
  "Permission check": "showcase.operations.tool.permission",
  "Create task": "showcase.operations.tool.task",
};

const stepKeys: Record<MissionStep["id"], Record<string, string>> = {
  query: { label: "showcase.operations.step.query.label", description: "showcase.operations.step.query.description", input: "showcase.operations.step.query.input", output: "showcase.operations.step.query.output" },
  knowledge: { label: "showcase.operations.step.knowledge.label", description: "showcase.operations.step.knowledge.description", input: "showcase.operations.step.knowledge.input", output: "showcase.operations.step.knowledge.output" },
  draft: { label: "showcase.operations.step.draft.label", description: "showcase.operations.step.draft.description", input: "showcase.operations.step.draft.input", output: "showcase.operations.step.draft.output" },
  approval: { label: "showcase.operations.step.approval.label", description: "showcase.operations.step.approval.description", input: "showcase.operations.step.approval.input", output: "showcase.operations.step.approval.output" },
  task: { label: "showcase.operations.step.task.label", description: "showcase.operations.step.task.description", input: "showcase.operations.step.task.input", output: "showcase.operations.step.task.output" },
};

const statusKeys: Record<MissionStatus | MissionStep["status"], string> = {
  idle: "showcase.operations.status.idle",
  planning: "showcase.operations.status.planning",
  ready: "showcase.operations.status.ready",
  running: "showcase.operations.status.running",
  "needs approval": "showcase.operations.status.approval",
  completed: "showcase.operations.status.completed",
  blocked: "showcase.operations.status.blocked",
  failed: "showcase.operations.status.failed",
  queued: "showcase.operations.status.queued",
};

const permissionKeys = {
  allowed: "showcase.operations.permission.allowed",
  "needs approval": "showcase.operations.permission.approval",
  blocked: "showcase.operations.permission.blocked",
};

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function StatusPill({ status, translate }: { status: MissionStatus | MissionStep["status"]; translate: (key: string, fallback: string) => string }) {
  return <span className={cn("rounded-full border px-2 py-1 text-[10px] font-medium", statusStyles[status])}>{translate(statusKeys[status], status)}</span>;
}

function StepCard({ step, expanded, onToggle, translate }: { step: MissionStep; expanded: boolean; onToggle: () => void; translate: (key: string, fallback: string) => string }) {
  const Icon = toolIcons[step.tool as keyof typeof toolIcons] ?? Bot;
  const copy = stepKeys[step.id];
  return (
    <button className={cn("w-full rounded-2xl border p-4 text-left transition-colors", expanded ? "border-cyan-300/30 bg-cyan-300/[.06]" : "border-white/10 bg-white/[.03] hover:border-white/20")} onClick={onToggle}>
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-cyan-300"><Icon className="size-4" /></div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-white">{translate(copy.label, step.label)}</p><StatusPill status={step.status} translate={translate} /></div><p className="mt-1 text-xs leading-5 text-slate-500">{translate(copy.description, step.description)}</p></div>
        {expanded ? <ChevronDown className="size-4 text-slate-500" /> : <ChevronRight className="size-4 text-slate-500" />}
      </div>
      {expanded && <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-xs"><div className="grid gap-3 sm:grid-cols-2"><div><p className="text-[10px] uppercase tracking-wider text-slate-600">{translate("showcase.operations.detail.toolInput", "Tool input")}</p><p className="mt-1 text-slate-300">{translate(copy.input, step.input)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">{translate("showcase.operations.detail.permission", "Permission")}</p><p className={cn("mt-1", step.permission === "blocked" ? "text-rose-300" : step.permission === "needs approval" ? "text-amber-300" : "text-emerald-300")}>{translate(permissionKeys[step.permission], step.permission)}</p></div></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">{translate("showcase.operations.detail.output", "Output")}</p><p className="mt-1 text-slate-300">{translate(copy.output, step.output)}</p></div><div className="flex flex-wrap gap-2"><span className="text-[10px] text-slate-600">{translate("showcase.operations.detail.citations", "Citations")}</span>{step.citations.map((citation) => <span key={citation} className="rounded-full border border-cyan-300/20 px-2 py-0.5 text-[10px] text-cyan-200">{citation}</span>)}</div></div>}
    </button>
  );
}

export default function OperationsRoom({ onBackToOverview }: { onBackToOverview: () => void }) {
  const translate = useTranslate();
  const [objective, setObjective] = useState(() => translate("showcase.operations.objective.default", "Rescue the highest-risk high-value customers this month"));
  const [state, setState] = useState<MissionState>(executor.reset());
  const [expandedStepId, setExpandedStepId] = useState<MissionStep["id"] | null>(null);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

  const activeStep = state.steps.find((step) => step.id === state.activeStepId);
  const selectedAudit = useMemo(() => state.audit.find((event) => event.id === selectedAuditId) ?? state.audit[state.audit.length - 1], [selectedAuditId, state.audit]);
  const hasPlan = state.steps.length > 0;

  function localizeAuditDetail(detail: string, eventLabel: string) {
    const step = state.steps.find((candidate) => candidate.label === eventLabel);
    if (step && detail === step.output) return translate(stepKeys[step.id].output, detail);
    if (detail.includes("Demo orchestration plan")) return translate("showcase.operations.audit.plan", detail);
    if (detail.startsWith("Running ")) return translate("showcase.operations.audit.running", detail);
    if (detail.includes("Execution paused")) return translate("showcase.operations.audit.paused", detail);
    if (detail.includes("approved the high-value")) return translate("showcase.operations.audit.approved", detail);
    if (detail.includes("rejected the high-value")) return translate("showcase.operations.audit.rejected", detail);
    if (detail.includes("Retry requested")) return translate("showcase.operations.audit.retry", detail);
    if (detail.includes("skipped the failed")) return translate("showcase.operations.audit.skipped", detail);
    if (detail.includes("Human takeover")) return translate("showcase.operations.audit.takeover", detail);
    if (detail.includes("could not complete")) return translate("showcase.operations.failure.detail", detail);
    return detail;
  }

  function localizeAuditLabel(label: string) {
    const step = state.steps.find((candidate) => candidate.label === label);
    if (step) return translate(stepKeys[step.id].label, label);
    if (label === "Plan generated") return translate("showcase.operations.event.plan", label);
    if (label === "Human takeover") return translate("showcase.operations.event.human", label);
    return label;
  }

  async function generatePlan() {
    setState({ ...executor.reset(), status: "planning", objective });
    await wait(420);
    setState(await executor.generatePlan(objective));
  }

  async function executePlan() {
    let next = state;
    for (const stepId of ["query", "knowledge", "draft", "approval"] as MissionStep["id"][]) {
      await wait(320);
      next = await executor.runStep(next, stepId);
      setState(next);
      if (next.status === "needs approval") return;
    }
  }

  async function approveAndFinish() {
    let next = await executor.approve(state);
    setState(next);
    await wait(360);
    next = await executor.runStep(next, "task");
    setState(next);
  }

  async function runFailureDemo() {
    if (activeStep) setState(await executor.failStep(state, activeStep.id));
  }

  return (
    <AIPageContextScope
      context={[
        {
          ...createAIPageContextReference({ id: "pipeline-workspace", title: "Pipeline records", kind: "workspace" }),
          content: { collection: "demo_pipeline", records: 4, filters: ["high-risk", "high-value"] },
        },
        {
          ...createAIPageContextReference({ id: "rescue-mission", title: "High-risk customer rescue mission", kind: "mission" }),
          content: { knowledgeSources: ["integration-brief.pdf", "Q3-account-review.md"], role: "Sales" },
        },
      ]}
    >
      <main className="showcase-theme min-h-screen overflow-hidden bg-[#08111d] text-slate-100 selection:bg-cyan-300 selection:text-slate-950">
      <div className="showcase-grid pointer-events-none fixed inset-0 opacity-30 [background-size:48px_48px]" />
      <div className="relative mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-10 lg:py-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3"><Button size="icon-sm" variant="ghost" aria-label={translate("showcase.operations.back", "Back to overview")} className="text-slate-400" onClick={onBackToOverview}><ArrowLeft /></Button><div className="grid size-9 place-items-center rounded-xl bg-cyan-300 text-slate-950"><Sparkles className="size-4" /></div><div><p className="text-sm font-semibold tracking-tight">AI <span className="text-cyan-300">{translate("showcase.operations.mode.room", "Operations Room")}</span></p><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{translate("showcase.operations.header.subtitle", "Governed execution workspace")}</p></div></div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" /> {translate("showcase.operations.runtime", "Demo runtime")} <Badge className="bg-cyan-300/10 text-cyan-200">{translate("showcase.operations.demo", "Demo orchestration")}</Badge></div>
        </header>

        <section className="grid gap-6 py-10 lg:grid-cols-[.9fr_1.1fr] lg:py-14"><div><p className="mb-4 text-[10px] font-semibold uppercase tracking-[.22em] text-cyan-300/70">{translate("showcase.operations.eyebrow", "Mission control")}</p><h1 className="max-w-xl text-4xl font-semibold leading-[.98] tracking-[-.05em] text-white sm:text-6xl">{translate("showcase.operations.title", "Give AI a goal. Keep humans in control.")}</h1><p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">{translate("showcase.operations.subtitle", "This is not a page generator. It is a governed execution loop that reads context, uses tools, pauses for approval, and records every decision.")}</p></div><Card className="border-cyan-300/20 bg-[#0d1a29]/90"><CardHeader className="flex-row items-start justify-between space-y-0"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.22em] text-cyan-300/70">{translate("showcase.operations.mission.eyebrow", "Mission input")}</p><CardTitle className="text-lg text-white">{translate("showcase.operations.mission.title", "What outcome should AI drive?")}</CardTitle></div><Bot className="size-5 text-cyan-300" /></CardHeader><CardContent><Input value={objective} onChange={(event) => setObjective(event.target.value)} placeholder={translate("showcase.operations.mission.placeholder", "Describe the business outcome...")} disabled={state.status === "running" || state.status === "needs approval"} className="h-11 border-white/10 bg-[#08111d] text-sm text-white placeholder:text-slate-600" /><div className="mt-4 flex flex-wrap gap-2"><Button className="bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={generatePlan} disabled={!objective.trim() || state.status === "planning"}><Sparkles /> {translate("showcase.operations.generate", "Generate plan")}</Button>{hasPlan && <Button variant="outline" className="border-white/10 bg-white/5 text-white" onClick={executePlan} disabled={state.status !== "ready"}><Play /> {translate("showcase.operations.approvePlan", "Approve plan")}</Button>}<Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setState(executor.reset())}><RotateCcw /> {translate("showcase.operations.reset", "Reset mission")}</Button></div><p className="mt-4 text-[10px] text-slate-600">{translate("showcase.operations.readOnlyHint", "Plan generation is read-only. Write actions require explicit confirmation and a separate approval checkpoint.")}</p></CardContent></Card></section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><div className="space-y-5"><Card className="border-white/10 bg-[#0d1a29]/85"><CardHeader className="flex-row items-end justify-between space-y-0"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.22em] text-cyan-300/70">{translate("showcase.operations.plan.eyebrow", "AI plan")}</p><CardTitle className="text-xl text-white">{translate("showcase.operations.plan.title", "Rescue workflow")}</CardTitle></div><StatusPill status={state.status} translate={translate} /></CardHeader><CardContent>{!hasPlan ? <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center"><ListChecks className="mx-auto size-6 text-slate-600" /><p className="mt-3 text-sm text-slate-400">{translate("showcase.operations.plan.empty", "Generate a plan to see the governed steps.")}</p><p className="mt-1 text-xs text-slate-600">{translate("showcase.operations.plan.emptyHint", "The plan will not write data by itself.")}</p></div> : <div className="space-y-3">{state.steps.map((step) => <StepCard key={step.id} step={step} translate={translate} expanded={expandedStepId === step.id} onToggle={() => setExpandedStepId((current) => current === step.id ? null : step.id)} />)}</div>}</CardContent></Card>

          {state.status === "needs approval" && <Card className="border-amber-300/30 bg-amber-300/[.06]"><CardHeader><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.22em] text-amber-200/70">{translate("showcase.operations.approval.eyebrow", "Approval checkpoint")}</p><CardTitle className="text-lg text-white">{translate("showcase.operations.approval.title", "Sales director decision required")}</CardTitle></CardHeader><CardContent><div className="flex gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-4"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-200" /><p className="text-xs leading-5 text-amber-100/80">{translate("showcase.operations.approval.body", "Acme Robotics is above the $100k threshold. Review the cited strategy before allowing task creation.")}</p></div><div className="mt-4 flex flex-wrap gap-2"><Button className="bg-emerald-300 text-slate-950 hover:bg-emerald-200" onClick={approveAndFinish}><Check /> {translate("showcase.operations.approval.approve", "Approve")}</Button><Button variant="outline" className="border-rose-300/30 bg-rose-300/10 text-rose-100 hover:bg-rose-300/20" onClick={async () => setState(await executor.reject(state))}><X /> {translate("showcase.operations.approval.reject", "Reject")}</Button><Button variant="ghost" className="text-amber-100" onClick={() => setExpandedStepId("approval")}>{translate("showcase.operations.approval.evidence", "View evidence")}</Button></div></CardContent></Card>}

          {state.status === "failed" && <Card className="border-rose-300/30 bg-rose-300/[.06]"><CardContent className="p-5"><div className="flex gap-3"><AlertTriangle className="size-5 shrink-0 text-rose-300" /><div><p className="text-sm font-medium text-white">{translate("showcase.operations.failure.title", "Tool execution failed")}</p><p className="mt-1 text-xs leading-5 text-rose-100/70">{translate("showcase.operations.failure.detail", state.error ?? "The tool could not complete in the demo runtime.")}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={async () => setState(await executor.retry(state))}><RotateCcw /> {translate("showcase.operations.failure.retry", "Retry")}</Button><Button size="sm" variant="outline" className="border-white/15 bg-white/5 text-white" onClick={async () => setState(await executor.skip(state))}><SkipForward /> {translate("showcase.operations.failure.skip", "Skip")}</Button><Button size="sm" variant="ghost" className="text-rose-100" onClick={() => setState(executor.takeOver(state))}><UserRound /> {translate("showcase.operations.failure.takeOver", "Take over")}</Button></div></CardContent></Card>}
        </div>

          <div className="space-y-5"><Card className="border-white/10 bg-[#0d1a29]/85"><CardHeader><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.22em] text-cyan-300/70">{translate("showcase.operations.context.eyebrow", "Context panel")}</p><CardTitle className="text-lg text-white">{translate("showcase.operations.context.title", "What AI can see")}</CardTitle></CardHeader><CardContent><div className="space-y-4">{[["showcase.operations.context.records", "showcase.operations.context.recordsValue", ListChecks], ["showcase.operations.context.knowledge", "showcase.operations.context.knowledgeValue", FileSearch], ["showcase.operations.context.role", "showcase.operations.context.roleValue", UserRound], ["showcase.operations.context.scope", "showcase.operations.context.scopeValue", KeyRound]].map(([labelKey, valueKey, Icon]) => { const ItemIcon = Icon as typeof Bot; return <div key={labelKey as string} className="flex items-center gap-3"><div className="grid size-8 place-items-center rounded-lg bg-white/5 text-cyan-300"><ItemIcon className="size-4" /></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">{translate(labelKey as string, labelKey as string)}</p><p className="mt-1 text-xs text-slate-200">{translate(valueKey as string, valueKey as string)}</p></div></div> })}</div><div className="mt-5 rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] p-3 text-[10px] leading-5 text-cyan-100/60"><Sparkles className="mr-1 inline size-3 text-cyan-300" /> {translate("showcase.operations.context.hint", "Page context is explicit, scoped, and reviewable before execution.")}</div></CardContent></Card>

            <Card className="border-white/10 bg-[#0d1a29]/85"><CardHeader className="flex-row items-center justify-between space-y-0"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.22em] text-cyan-300/70">{translate("showcase.operations.stream.eyebrow", "Tool execution stream")}</p><CardTitle className="text-lg text-white">{translate("showcase.operations.stream.title", "Decision trace")}</CardTitle></div><Clock3 className="size-4 text-slate-500" /></CardHeader><CardContent>{state.audit.length === 0 ? <p className="py-8 text-center text-xs text-slate-600">{translate("showcase.operations.stream.empty", "No tool calls yet.")}</p> : <div className="space-y-2">{state.audit.map((event) => <button key={event.id} className={cn("w-full rounded-xl border p-3 text-left transition-colors", selectedAudit?.id === event.id ? "border-cyan-300/30 bg-cyan-300/[.06]" : "border-white/5 bg-white/[.02] hover:bg-white/[.05]")} onClick={() => setSelectedAuditId(event.id)}><div className="flex items-center gap-3"><div className="size-2 shrink-0 rounded-full bg-cyan-300" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-xs font-medium text-slate-200">{localizeAuditLabel(event.label)}</p><span className="text-[10px] text-slate-600">{translate(toolKeys[event.tool] ?? event.tool, event.tool)}</span></div><p className="mt-1 truncate text-[10px] text-slate-500">{localizeAuditDetail(event.detail, event.label)}</p></div><span className="text-[10px] text-slate-600">{event.timestamp}</span></div></button>)}</div>}{selectedAudit && <div className="mt-4 rounded-xl border border-cyan-300/15 bg-[#08111d] p-3 text-xs"><p className="text-[10px] uppercase tracking-wider text-cyan-300/70">{translate("showcase.operations.stream.selected", "Selected event")}</p><p className="mt-2 leading-5 text-slate-300">{localizeAuditDetail(selectedAudit.detail, selectedAudit.label)}</p><p className="mt-2 text-[10px] text-slate-600">{translate("showcase.operations.stream.sourceHint", "Demo orchestration · source citations are visible on each plan step.")}</p></div>}</CardContent></Card>

            {state.status === "completed" && <Card className="border-emerald-300/30 bg-emerald-300/[.06]"><CardHeader><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.22em] text-emerald-200/70">{translate("showcase.operations.outcome.eyebrow", "Outcome")}</p><CardTitle className="text-lg text-white">{translate("showcase.operations.outcome.completed", "Mission completed with approval")}</CardTitle></CardHeader><CardContent><div className="space-y-3 text-xs text-emerald-100/80"><p><Check className="mr-2 inline size-3" />{translate("showcase.operations.outcome.task", "Follow-up task prepared for Lena Park.")}</p><p><Check className="mr-2 inline size-3" />{translate("showcase.operations.outcome.notification", "Notification draft is ready for review.")}</p><p><ShieldCheck className="mr-2 inline size-3" />{translate("showcase.operations.outcome.audit", "Approval decision and citations are in the audit trail.")}</p></div></CardContent></Card>}
            {state.status === "blocked" && <Card className="border-rose-300/30 bg-rose-300/[.06]"><CardHeader><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.22em] text-rose-200/70">{translate("showcase.operations.outcome.eyebrow", "Outcome")}</p><CardTitle className="text-lg text-white">{translate("showcase.operations.outcome.blocked", "Automation stopped safely")}</CardTitle></CardHeader><CardContent><p className="text-xs leading-5 text-rose-100/75">{state.approval.decision === "rejected" ? translate("showcase.operations.outcome.rejected", state.approval.reason) : state.error?.includes("Human takeover") ? translate("showcase.operations.audit.takeover", state.error) : state.error ?? state.approval.reason}</p><p className="mt-3 text-[10px] text-slate-500">{translate("showcase.operations.outcome.noWrite", "No later write step was executed.")}</p></CardContent></Card>}
          </div>
        </section>

        {activeStep && state.status === "running" && <div className="mt-5 flex justify-end"><Button size="sm" variant="ghost" className="text-[10px] text-slate-600 hover:text-rose-300" onClick={runFailureDemo}>{translate("showcase.operations.failure.simulate", "Simulate tool failure")}</Button></div>}
        <footer className="mt-12 flex flex-col gap-3 border-t border-white/10 py-7 text-[10px] text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span>AI Operations Room · {translate("showcase.operations.demo", "Demo orchestration")}</span><span><ShieldCheck className="mr-1 inline size-3" />{translate("showcase.operations.footer", "Human approval remains in the loop")}</span></footer>
      </div>
      </main>
    </AIPageContextScope>
  );
}
