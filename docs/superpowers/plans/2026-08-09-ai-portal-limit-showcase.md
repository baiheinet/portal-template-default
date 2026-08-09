# AI Portal Limit Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive, single-page NocoBase AI Portal command center that demonstrates CRUD, dashboards, AI assistance, automation, approvals, permissions, knowledge, integrations, and extensions with reliable local demo data.

**Architecture:** Add one lazy-loaded application route at `/showcase` and one feature page module that owns its static data and interaction state. Compose existing shadcn/Base UI primitives with Tailwind classes and `lucide-react`; keep all interactions local and clearly labeled as demo behavior.

**Tech Stack:** React 19, TypeScript, React Router via `@nocobase/portal-sdk/routing`, Tailwind CSS v4, existing `@/components/ui`, `lucide-react`.

## Global Constraints

- Use static demo data; do not depend on NocoBase collections or configured LLM services.
- Do not add dependencies or modify base components under `src/components/ui`.
- Register the app route in `src/routes.tsx` and set `registryRoutesEnabled = false`.
- Use a lazy loader for the page module.
- Preserve authentication, Portal runtime behavior, and `/dev` showcases.
- Mark simulated AI and records as `Demo data`.
- Verify desktop layout, mobile layout, and all specified local interactions.

---

### Task 1: Register the application Showcase route

**Files:**
- Modify: `src/routes.tsx`

**Interfaces:**
- Produces the application route `/showcase`, which lazy-loads the default export from `src/pages/showcase/index.tsx`.

- [ ] **Step 1: Replace the empty application route definition**

Update `src/routes.tsx` to import a lightweight icon and define the route while disabling Registry main routes:

```tsx
import { LayoutDashboard } from "lucide-react";

import { defineAppRoutes } from "@nocobase/portal-sdk/routing";

export const registryRoutesEnabled = false;

export const appRoutes = defineAppRoutes([
  {
    name: "showcase",
    path: "/showcase",
    lazy: () => import("./pages/showcase"),
    resource: {
      meta: {
        label: "AI Portal Showcase",
        icon: <LayoutDashboard />,
        priority: 1,
      },
    },
  },
]);
```

- [ ] **Step 2: Run the type checker before the page exists**

Run: `pnpm exec tsc --noEmit`

Expected: the command may fail only because `src/pages/showcase/index.tsx` is not yet present; capture the expected missing-module error and continue to Task 2.

- [ ] **Step 3: Commit the route registration**

Run:

```bash
git add src/routes.tsx
git commit -m "feat: add AI Portal showcase route"
```

### Task 2: Build the interactive Showcase page

**Files:**
- Create: `src/pages/showcase/index.tsx`

**Interfaces:**
- Default export: `ShowcasePage(): JSX.Element`.
- Local data types: `Deal`, `AutomationStep`, `Capability`, and `CopilotPrompt`.
- Local state: selected filter, selected deal, selected role, expanded automation, and active Copilot response.

- [ ] **Step 1: Define the local demo data and state model**

Start the module with the existing React and icon imports, then define data that covers all visible capability regions:

```tsx
import { useState } from "react";
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
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DealStatus = "At risk" | "Won" | "Discovery";
type Role = "Admin" | "Sales" | "Finance";

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

const deals: Deal[] = [
  { id: "AC-2048", company: "Acme Robotics", owner: "Lena Park", value: "$128k", status: "At risk", score: 42, updated: "12 min ago", source: "Inbound" },
  { id: "NO-8831", company: "Northstar Health", owner: "Marco Liu", value: "$94k", status: "Won", score: 96, updated: "34 min ago", source: "Partner" },
  { id: "VE-1190", company: "Vertex Labs", owner: "Ari Cole", value: "$76k", status: "Discovery", score: 71, updated: "1 hr ago", source: "Event" },
  { id: "FO-7712", company: "Folio Systems", owner: "Mina Shah", value: "$54k", status: "At risk", score: 38, updated: "2 hrs ago", source: "Outbound" },
];

const prompts = ["Summarize pipeline", "Find stalled deals", "Draft follow-up"];
```

- [ ] **Step 2: Add the reusable page section helpers**

Keep presentation helpers in the same page module to avoid premature feature abstractions. Add a `SectionLabel` helper, status badge helper, `MiniBars` chart, and `Sparkline` that render with CSS/Tailwind only. Use `cn` for active filters and status variants.

- [ ] **Step 3: Implement the shell and hero command center**

Render a full-width dark shell with a subtle grid/radial background, a compact top bar, the `Build beyond CRUD` headline, an explicit `DEMO DATA` badge, and a Copilot panel. The Copilot panel must render the three prompt buttons and update a local answer string when clicked; do not call an API.

- [ ] **Step 4: Implement metrics and the CRUD workspace**

Render four metric cards for Collections, AI Employees, Automations, and Connected Sources. Render the deal table from `deals.filter(...)` with `All`, `At risk`, and `Won` filter buttons, search input, add/bulk buttons, owner, value, status, AI score, and a row action button. Clicking a row sets `selectedDeal` and opens the details Drawer.

- [ ] **Step 5: Implement AI signal and automation timeline interactions**

Derive the AI signal copy from the current filtered set and selected status. Render a signal card with risk score, recommendation, and referenced deal chips. Render the automation timeline with a button that toggles `automationExpanded`; show the steps `Risk score`, `Notify sales`, and `Create follow-up` with completed/current states and approval metadata.

- [ ] **Step 6: Implement analytics, permission lens, and capability matrix**

Render a CSS-based revenue trend, a source distribution, and a role selector for Admin/Sales/Finance. The role selector changes visible permission rows. Render capability cards for approval, file/knowledge, notifications, integrations, forms/portals, and Registry extensions; clicking a card sets the active capability and reveals its description and example composition.

- [ ] **Step 7: Implement the record details Drawer and responsive layout**

Use the existing `Drawer` primitives for the selected record. Include fields, activity, attachment, approval state, and audit entries, plus a close control. Use responsive grid classes, `min-w-0`, and horizontally scrollable table content so mobile widths do not overflow. Keep the drawer usable on narrow screens.

- [ ] **Step 8: Run the build and fix type/style errors**

Run: `pnpm build`

Expected: TypeScript and the production build pass. Fix all errors in `src/pages/showcase/index.tsx` and `src/routes.tsx` without changing shared UI components.

- [ ] **Step 9: Commit the Showcase page**

Run:

```bash
git add src/pages/showcase/index.tsx src/routes.tsx
git commit -m "feat: build AI Portal capability showcase"
```

### Task 3: Verify required interactions and responsive behavior

**Files:**
- Test: `tests/ai-portal-showcase-regression.mjs`
- Modify: `src/pages/showcase/index.tsx` only if verification reveals a behavior gap

**Interfaces:**
- Regression checks use source-level assertions because this repository has no configured browser test runner.
- The page exposes stable visible labels: `DEMO DATA`, `Build beyond CRUD`, `Summarize pipeline`, `At risk`, `Won`, `Admin`, `Sales`, `Finance`, and `Approval & audit`.

- [ ] **Step 1: Add a focused source regression script**

Create a Node script that reads `src/pages/showcase/index.tsx` and asserts the required labels, route interactions, local state names, and responsive classes are present:

```js
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync("src/pages/showcase/index.tsx", "utf8");

for (const text of [
  "DEMO DATA",
  "Build beyond CRUD",
  "Summarize pipeline",
  "Find stalled deals",
  "Draft follow-up",
  "At risk",
  "Won",
  "Admin",
  "Sales",
  "Finance",
  "Approval & audit",
  "Knowledge & files",
  "Registry extensions",
  "selectedDeal",
  "automationExpanded",
  "md:grid-cols-",
]) {
  assert.ok(source.includes(text), `missing showcase requirement: ${text}`);
}

console.log("AI Portal showcase regression checks passed");
```

- [ ] **Step 2: Run the regression script**

Run: `node tests/ai-portal-showcase-regression.mjs`

Expected: `AI Portal showcase regression checks passed`.

- [ ] **Step 3: Run the final production verification**

Run: `pnpm build`

Expected: exit code 0 with a generated production bundle.

- [ ] **Step 4: Review the final worktree**

Run: `git status --short`

Expected: only the intended Showcase source, route, regression test, and plan/spec commits are present; do not alter the pre-existing unrelated worktree changes.

- [ ] **Step 5: Commit verification coverage**

Run:

```bash
git add tests/ai-portal-showcase-regression.mjs
git commit -m "test: cover AI Portal showcase requirements"
```

## Self-Review

- Spec coverage: Tasks 1-2 cover the route, single-page structure, local demo data, CRUD filters, Copilot prompts, automation, analytics, permissions, knowledge/files, integrations, extensions, Drawer details, responsive layout, and CTA surfaces. Task 3 covers explicit verification and build output.
- Placeholder scan: no unfinished placeholder instructions or unspecified error-handling steps are used.
- Type consistency: `Deal`, `DealStatus`, `Role`, `deals`, `prompts`, `selectedDeal`, and `automationExpanded` are defined in Task 2 before the verification references them in Task 3.
