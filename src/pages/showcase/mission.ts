export type MissionStatus =
  | "idle"
  | "planning"
  | "ready"
  | "running"
  | "needs approval"
  | "completed"
  | "blocked"
  | "failed";

export type StepStatus =
  | "queued"
  | "running"
  | "needs approval"
  | "completed"
  | "blocked"
  | "failed";

export type MissionStep = {
  id: "query" | "knowledge" | "draft" | "approval" | "task";
  label: string;
  tool: string;
  description: string;
  status: StepStatus;
  input: string;
  output: string;
  citations: string[];
  durationMs: number;
  permission: "allowed" | "needs approval" | "blocked";
};

export type MissionAuditEvent = {
  id: string;
  label: string;
  tool: string;
  status: StepStatus | "audit";
  detail: string;
  timestamp: string;
};

export type MissionState = {
  status: MissionStatus;
  objective: string;
  steps: MissionStep[];
  activeStepId: MissionStep["id"] | null;
  approval: {
    required: boolean;
    decision: "pending" | "approved" | "rejected";
    reason: string;
  };
  audit: MissionAuditEvent[];
  error: string | null;
};

export type MissionExecutor = {
  generatePlan: (objective: string) => Promise<MissionState>;
  runStep: (state: MissionState, stepId: MissionStep["id"]) => Promise<MissionState>;
  approve: (state: MissionState) => Promise<MissionState>;
  reject: (state: MissionState) => Promise<MissionState>;
  retry: (state: MissionState) => Promise<MissionState>;
  skip: (state: MissionState) => Promise<MissionState>;
  takeOver: (state: MissionState) => MissionState;
  failStep: (state: MissionState, stepId: MissionStep["id"]) => Promise<MissionState>;
  reset: () => MissionState;
};

const baseSteps: MissionStep[] = [
  {
    id: "query",
    label: "Find high-risk customers",
    tool: "Query",
    description: "Scan pipeline records for low AI scores and high opportunity value.",
    status: "queued",
    input: "status != Won, score < 60, value > $50k",
    output: "2 customers need intervention: Acme Robotics and Folio Systems.",
    citations: ["AC-2048", "FO-7712"],
    durationMs: 420,
    permission: "allowed",
  },
  {
    id: "knowledge",
    label: "Read customer context",
    tool: "Knowledge search",
    description: "Retrieve recent activity and indexed customer materials.",
    status: "queued",
    input: "customer IDs from Query step",
    output: "Found 2 knowledge sources and 5 recent activities.",
    citations: ["integration-brief.pdf", "Q3-account-review.md"],
    durationMs: 680,
    permission: "allowed",
  },
  {
    id: "draft",
    label: "Draft recovery strategies",
    tool: "Draft",
    description: "Generate a customer-specific next action with a cited rationale.",
    status: "queued",
    input: "pipeline + knowledge context",
    output: "2 tailored follow-up strategies are ready for review.",
    citations: ["AC-2048", "integration-brief.pdf"],
    durationMs: 910,
    permission: "allowed",
  },
  {
    id: "approval",
    label: "Request sales director approval",
    tool: "Permission check",
    description: "Pause high-value interventions before any task or notification write.",
    status: "queued",
    input: "opportunity value > $100k",
    output: "Acme Robotics is above the $100k approval threshold.",
    citations: ["AC-2048", "Sales approval policy"],
    durationMs: 160,
    permission: "needs approval",
  },
  {
    id: "task",
    label: "Create follow-up and notification",
    tool: "Create task",
    description: "Create an owner task and prepare the approved customer notification.",
    status: "queued",
    input: "approved recovery strategies",
    output: "Follow-up task created for Lena Park; notification draft ready.",
    citations: ["AC-2048", "Sales approval policy"],
    durationMs: 340,
    permission: "allowed",
  },
];

function cloneState(state: MissionState): MissionState {
  return {
    ...state,
    steps: state.steps.map((step) => ({ ...step, citations: [...step.citations] })),
    approval: { ...state.approval },
    audit: state.audit.map((event) => ({ ...event })),
  };
}

function addAudit(state: MissionState, step: MissionStep, detail: string, status: MissionAuditEvent["status"] = step.status) {
  state.audit.push({
    id: `${step.id}-${state.audit.length + 1}`,
    label: step.label,
    tool: step.tool,
    status,
    detail,
    timestamp: `${state.audit.length + 1} sec ago`,
  });
}

function initialState(): MissionState {
  return {
    status: "idle",
    objective: "Rescue the highest-risk high-value customers this month",
    steps: [],
    activeStepId: null,
    approval: { required: false, decision: "pending", reason: "No plan has been generated." },
    audit: [],
    error: null,
  };
}

export function createDemoMissionExecutor(): MissionExecutor {
  return {
    async generatePlan(objective) {
      const state = initialState();
      state.status = "ready";
      state.objective = objective;
      state.steps = baseSteps.map((step) => ({ ...step, citations: [...step.citations] }));
      state.approval = { required: true, decision: "pending", reason: "Acme Robotics exceeds the $100k threshold." };
      state.audit.push({ id: "plan-1", label: "Plan generated", tool: "AI planner", status: "audit", detail: "Demo orchestration plan is ready for human confirmation.", timestamp: "now" });
      return state;
    },

    async runStep(current, stepId) {
      const state = cloneState(current);
      const step = state.steps.find((candidate) => candidate.id === stepId);
      if (!step || step.status === "blocked" || step.status === "completed") return state;

      state.status = "running";
      state.activeStepId = step.id;
      step.status = "running";
      addAudit(state, step, `Running ${step.tool} with the current page context.`, "running");

      if (step.id === "approval") {
        step.status = "needs approval";
        state.status = "needs approval";
        state.approval.decision = "pending";
        state.approval.reason = "Acme Robotics exceeds the $100k threshold.";
        addAudit(state, step, "Execution paused for sales director approval.", "needs approval");
        return state;
      }

      step.status = "completed";
      addAudit(state, step, step.output, "completed");
      const allCompleted = state.steps.every((candidate) => candidate.status === "completed");
      state.status = allCompleted ? "completed" : "running";
      return state;
    },

    async approve(current) {
      const state = cloneState(current);
      const step = state.steps.find((candidate) => candidate.id === "approval");
      if (!step || step.status !== "needs approval") return state;
      step.status = "completed";
      step.permission = "allowed";
      state.approval.decision = "approved";
      state.status = "running";
      state.activeStepId = "task";
      addAudit(state, step, "Sales director approved the high-value intervention.", "completed");
      return state;
    },

    async reject(current) {
      const state = cloneState(current);
      const approval = state.steps.find((step) => step.id === "approval");
      if (!approval) return state;
      approval.status = "blocked";
      approval.permission = "blocked";
      state.steps = state.steps.map((step) => step.id === "task" ? { ...step, status: "blocked", permission: "blocked" } : step);
      state.approval.decision = "rejected";
      state.approval.reason = "Sales director rejected the high-value intervention.";
      state.status = "blocked";
      state.activeStepId = "approval";
      addAudit(state, approval, state.approval.reason, "blocked");
      return state;
    },

    async retry(current) {
      const state = cloneState(current);
      const failed = state.steps.find((step) => step.status === "failed");
      if (!failed) return state;
      failed.status = "queued";
      state.error = null;
      state.status = "running";
      state.activeStepId = failed.id;
      addAudit(state, failed, "Retry requested by the operator.", "audit");
      return state;
    },

    async skip(current) {
      const state = cloneState(current);
      const failed = state.steps.find((step) => step.status === "failed");
      if (!failed || failed.id === "approval") return state;
      failed.status = "completed";
      state.error = null;
      state.status = "running";
      addAudit(state, failed, "Operator skipped the failed non-write step.", "completed");
      return state;
    },

    takeOver(current) {
      const state = cloneState(current);
      state.status = "blocked";
      state.error = "Human takeover requested. No further automated writes will run.";
      state.audit.push({ id: `takeover-${state.audit.length + 1}`, label: "Human takeover", tool: "Operator", status: "audit", detail: state.error, timestamp: "now" });
      return state;
    },

    async failStep(current, stepId) {
      const state = cloneState(current);
      const step = state.steps.find((candidate) => candidate.id === stepId);
      if (!step || step.status === "completed" || step.status === "blocked") return state;
      step.status = "failed";
      state.status = "failed";
      state.activeStepId = step.id;
      state.error = `${step.tool} could not complete in the demo runtime.`;
      addAudit(state, step, state.error, "failed");
      return state;
    },

    reset() {
      return initialState();
    },
  };
}
