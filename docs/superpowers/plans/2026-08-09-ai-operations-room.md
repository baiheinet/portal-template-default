# AI Operations Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (inline execution selected). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/showcase` with an AI Operations Room that simulates a governed, multi-step high-risk-customer rescue mission instead of only displaying static AI cards.

**Architecture:** Keep the existing Overview as one page mode and add an Operations Room mode backed by a typed local mission state machine. Isolate execution behind `MissionExecutor`; `DemoMissionExecutor` produces deterministic plan, tool-event, approval, failure, retry, skip, takeover, and reset transitions while keeping a seam for future NocoBase AI/API adapters.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, existing Base UI components, `lucide-react`, Node source regression checks.

## Global Constraints

- Use real AI context contracts where they already exist, but use local execution orchestration for this phase.
- Mark all local results with `Demo orchestration` and never claim a backend write occurred.
- Do not add dependencies, modify `src/components/ui`, or create backend collections.
- Preserve the existing Overview CRUD, Dashboard, filters, detail Drawer, and non-AI paths.
- Do not bypass ACL, approval, confirmation, or validation in the simulated flow.
- Support desktop and narrow layouts without horizontal overflow.
- Preserve unrelated uncommitted user changes in the worktree.

---

### Task 1: Add the mission state model and deterministic executor

**Files:**
- Create: `src/pages/showcase/mission.ts`
- Test: `tests/ai-operations-room-regression.mjs`

**Interfaces:**
- `MissionStatus`: `idle | planning | ready | running | needs approval | completed | blocked | failed`.
- `StepStatus`: `queued | running | needs approval | completed | blocked | failed`.
- `MissionStep`: `{ id, label, tool, description, status, input, output, citations, durationMs, permission }`.
- `MissionState`: `{ status, objective, steps, activeStepId, approval, audit, error }`.
- `MissionExecutor`: `generatePlan(objective): Promise<MissionState>`, `runStep(state, stepId): Promise<MissionState>`, `approve(state): Promise<MissionState>`, `reject(state): Promise<MissionState>`, `retry(state): Promise<MissionState>`, `skip(state): Promise<MissionState>`, `takeOver(state): MissionState`, and `reset(): MissionState`.
- `createDemoMissionExecutor(): MissionExecutor` returns deterministic transitions for the high-risk-customer scenario.

- [ ] **Step 1: Write the failing regression assertions**

Extend `tests/ai-operations-room-regression.mjs` to read `src/pages/showcase/mission.ts` and assert the source contains the exact statuses, executor methods, five tool labels, approval threshold, citations, and `Demo orchestration` marker.

- [ ] **Step 2: Run the regression check and confirm RED**

Run: `node tests/ai-operations-room-regression.mjs`

Expected: FAIL because `src/pages/showcase/mission.ts` does not exist yet.

- [ ] **Step 3: Implement the typed state model**

Create `mission.ts` with literal unions, exported interfaces, the initial mission state, four demo records/citations, and an executor that never mutates its input. `generatePlan` returns `ready` with these five steps: `query`, `knowledge`, `draft`, `approval`, and `task`. The approval step must use `amount > 100000` as its permission rule and produce `needs approval` rather than executing the task step.

- [ ] **Step 4: Implement deterministic transitions**

`runStep` completes query, knowledge, and draft; transitions the approval step to `needs approval`; only after `approve` can task become completed. `reject` marks approval and all later steps `blocked`. `retry` clears the current failed step to `queued`; `skip` marks a non-approval failed step completed with an audit note; `takeOver` marks the mission as `blocked` with a human-owner audit event; `reset` returns the initial state.

- [ ] **Step 5: Run the regression check and confirm GREEN**

Run: `node tests/ai-operations-room-regression.mjs`

Expected: `AI Operations Room regression checks passed`.

- [ ] **Step 6: Commit the executor unit**

```bash
git add src/pages/showcase/mission.ts tests/ai-operations-room-regression.mjs
git commit -m "feat: add governed mission executor"
```

### Task 2: Build the Operations Room presentation and interactions

**Files:**
- Create: `src/pages/showcase/operations-room.tsx`
- Modify: `src/pages/showcase/index.tsx`

**Interfaces:**
- Default export: `OperationsRoom({ onBackToOverview }: { onBackToOverview: () => void }): JSX.Element`.
- Consumes `createDemoMissionExecutor`, `MissionState`, and `MissionStep` from `./mission`.
- Produces stable labels: `Operations Room`, `Generate plan`, `Approve plan`, `Reject`, `Retry`, `Skip`, `Take over`, `Reset mission`, `Demo orchestration`, `needs approval`, `Knowledge search`, and `Create task`.

- [ ] **Step 1: Add a mode switch to the Showcase page**

Add `OverviewMode = "overview" | "operations"` and local `mode` state to `ShowcasePage`. Render an accessible `Overview / Operations Room` switch near the header and render `OperationsRoom` when `mode === "operations"`; keep all existing Overview markup unchanged.

- [ ] **Step 2: Add the Operations Room shell**

Create a responsive dark workspace with a title, back-to-overview control, `Demo orchestration` badge, objective input, `Generate plan`, `Approve plan`, and `Reset mission`. Keep the objective controlled and default it to `Rescue the highest-risk high-value customers this month`.

- [ ] **Step 3: Render the AI plan and context panel**

Render five ordered plan cards from `state.steps`, showing step status, tool name, permission result, output, citation count, and expandable details. Add a context panel showing `4 demo records`, `2 knowledge sources`, `Sales role`, and the active permission scope.

- [ ] **Step 4: Render the tool execution stream**

Render chronological audit/tool events with icons and status styles for Query, Knowledge search, Draft, Permission check, Approval, and Create task. Selecting an event shows input, output, duration, citations, and a `Demo orchestration` note.

- [ ] **Step 5: Implement approval and failure controls**

When `state.status === "needs approval"`, show the approval checkpoint with the `$100k` rule, citations, `Approve`, `Reject`, and `View evidence` controls. When `failed`, show `Retry`, `Skip`, and `Take over`; prevent later steps from rendering as completed after rejection.

- [ ] **Step 6: Implement the outcome panel**

Show completed follow-up task, notification draft, source citations, and audit events only when their corresponding transitions exist. Show blocked reasons and manual-owner details for rejected or taken-over missions. Empty and idle states must explain what the user can do next.

- [ ] **Step 7: Verify the component in the browser-like dev server**

Run the dev server and fetch `/x/main/showcase`; confirm the module returns HTTP 200 and the transformed source contains the Operations Room labels. If a browser runtime is available, click mode switch, Generate plan, each step, Approve/Reject, Reset, and mobile viewport controls.

- [ ] **Step 8: Run TypeScript verification**

Run: `node "C:\Users\admin\main\node_modules\typescript\bin\tsc" --noEmit --pretty false`

Expected: exit code 0.

- [ ] **Step 9: Commit the Operations Room UI**

```bash
git add src/pages/showcase/index.tsx src/pages/showcase/operations-room.tsx
git commit -m "feat: add AI Operations Room showcase"
```

### Task 3: Regression, build, and quality verification

**Files:**
- Modify: `tests/ai-portal-showcase-regression.mjs`
- Test: `tests/ai-operations-room-regression.mjs`

**Interfaces:**
- Source checks verify the Overview and Operations Room modes coexist.
- Build verification must not stage generated `dist` output or unrelated user files.

- [ ] **Step 1: Add page-level regression labels**

Add assertions for `Operations Room`, `Generate plan`, `Approve plan`, `Reject`, `Retry`, `Skip`, `Take over`, `Reset mission`, `Demo orchestration`, `4 demo records`, and `2 knowledge sources`.

- [ ] **Step 2: Run both regression scripts**

Run:

```bash
node tests/ai-portal-showcase-regression.mjs
node tests/ai-operations-room-regression.mjs
```

Expected: both print their success message and exit with code 0.

- [ ] **Step 3: Run the production build**

Run: `& ".\\node_modules\\.bin\\refine.cmd" build`

Expected: Vite completes with exit code 0. Existing chunk-size warnings may remain, but no TypeScript, route, or Rollup errors are allowed.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check; git status --short`

Expected: only the Operations Room source, tests, and intended documentation commits are attributable to this work; existing user modifications remain untouched.

- [ ] **Step 5: Commit verification updates**

```bash
git add tests/ai-portal-showcase-regression.mjs tests/ai-operations-room-regression.mjs
git commit -m "test: cover AI Operations Room flow"
```

## Self-Review

- Spec coverage: Task 1 covers the state machine and executor seam; Task 2 covers mode switching, mission input, plan, context, tool stream, approval, errors, outcomes, responsive behavior, and the existing Overview; Task 3 covers regression and production verification.
- Placeholder scan: all actions name exact files, interfaces, commands, and expected results; no unfinished implementation instructions remain.
- Type consistency: `MissionExecutor`, `MissionState`, `MissionStep`, and `createDemoMissionExecutor` are defined in Task 1 and consumed by `OperationsRoom` in Task 2.
