# AI Operations Room Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline execution selected). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the complete AI Operations Room experience in English and Simplified Chinese through the existing `starter` translation resources.

**Architecture:** Add one shared key set to `src/locales/en-US.ts` and `src/locales/zh-CN.ts`, then pass the existing `useTranslate` function into the Operations Room and Overview copy paths. Keep mission state and demo data language-neutral, with localized labels and messages generated at render time.

**Tech Stack:** React 19, TypeScript, existing Portal i18n runtime, Node source regression checks.

## Global Constraints

- Use the existing `starter` registration; do not add a new namespace or dependency.
- English is the source/fallback language and Simplified Chinese is fully translated.
- Preserve customer names, record IDs, amounts, filenames, tool IDs, and mission state transitions.
- Do not modify `src/components/ui` or unrelated user changes.
- Verify English and Chinese key parity and no major hard-coded Operations Room copy.

---

### Task 1: Add complete bilingual resources

**Files:**
- Modify: `src/locales/en-US.ts`
- Modify: `src/locales/zh-CN.ts`
- Test: `tests/operations-room-i18n-regression.mjs`

**Interfaces:**
- Resource keys use the `showcase.operations.*` prefix.
- Both locale objects expose identical Operations Room key sets.

- [ ] **Step 1: Add the parity test before resources**

Create a Node test that imports both locale modules, filters keys beginning with `showcase.operations.`, asserts the key sets are equal, and asserts representative Chinese values exist.

- [ ] **Step 2: Run the test and confirm RED**

Run: `node tests/operations-room-i18n-regression.mjs`

Expected: FAIL because no `showcase.operations.*` keys exist yet.

- [ ] **Step 3: Add English and Chinese resource keys**

Add keys for mode labels, mission input, plan steps, tools, context, statuses, approval, failure actions, outcome, audit, and accessibility labels. Use English text in `en-US.ts` and natural Simplified Chinese in `zh-CN.ts`.

- [ ] **Step 4: Run parity verification and confirm GREEN**

Run: `node tests/operations-room-i18n-regression.mjs`

Expected: `Operations Room i18n regression checks passed`.

- [ ] **Step 5: Commit locale resources**

```bash
git add src/locales/en-US.ts src/locales/zh-CN.ts tests/operations-room-i18n-regression.mjs
git commit -m "feat: add Operations Room translations"
```

### Task 2: Connect Operations Room and Showcase copy to i18n

**Files:**
- Modify: `src/pages/showcase/index.tsx`
- Modify: `src/pages/showcase/operations-room.tsx`
- Modify: `src/pages/showcase/mission.ts`

**Interfaces:**
- `mission.ts` exports language-neutral IDs and data; UI resolves labels through `translate`.
- `OperationsRoom` calls `useTranslate()` and uses `translate(key, fallback)` for all visible copy.

- [ ] **Step 1: Replace mission-visible labels with stable IDs**

Keep step IDs, tool IDs, citations, customer names, and outputs as data values. Add translation keys for step labels, descriptions, inputs, outputs, permission text, and audit detail templates; do not use locale conditionals in the state machine.

- [ ] **Step 2: Localize the Operations Room UI**

Use `useTranslate()` for headings, controls, statuses, context labels, approval copy, failure actions, outcomes, helper text, and accessible labels. Pass translated labels into `StatusPill`, `StepCard`, and audit rendering.

- [ ] **Step 3: Localize the Overview mode switch**

Translate the `Operations Room` button and any mode-related accessibility copy in `index.tsx`; leave the existing Overview business data unchanged.

- [ ] **Step 4: Run typecheck and locale regression**

Run:

```bash
node tests/operations-room-i18n-regression.mjs
node "C:\Users\admin\main\node_modules\typescript\bin\tsc" --noEmit --pretty false
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit i18n integration**

```bash
git add src/pages/showcase/index.tsx src/pages/showcase/operations-room.tsx src/pages/showcase/mission.ts
git commit -m "feat: localize Operations Room experience"
```

### Task 3: Verify localized interface behavior

**Files:**
- Modify: `tests/ai-portal-showcase-regression.mjs`
- Test: `tests/operations-room-i18n-regression.mjs`

- [ ] **Step 1: Add source assertions for translation usage**

Assert that `operations-room.tsx` imports or calls `useTranslate`, that locale files contain `showcase.operations.`, and that representative hard-coded English controls are not rendered directly by the Operations Room component.

- [ ] **Step 2: Run all focused checks**

Run:

```bash
node tests/operations-room-i18n-regression.mjs
node tests/ai-portal-showcase-regression.mjs
node tests/sidebar-button-regression.mjs
node tests/base-ui-native-button-regression.mjs
```

Expected: all checks print success messages.

- [ ] **Step 3: Run the production build**

Run: `& ".\\node_modules\\.bin\\refine.cmd" build`

Expected: build exits 0; existing chunk-size warnings may remain.

- [ ] **Step 4: Verify language switching in Portal dev**

Use the existing `nb portal dev main` session, switch to `zh-CN`, open `/x/main/showcase`, enter Operations Room, and verify Chinese text in mission input, plan steps, approval checkpoint, tool stream, error actions, and outcome. Switch back to `en-US` and verify English labels return without a reload-dependent state reset.

- [ ] **Step 5: Commit verification updates**

```bash
git add tests/ai-portal-showcase-regression.mjs tests/operations-room-i18n-regression.mjs
git commit -m "test: verify Operations Room localization"
```

## Self-Review

- Spec coverage: Task 1 covers bilingual resources and key parity; Task 2 covers all Operations Room and mode-switch copy; Task 3 covers source checks, build, and actual Portal language switching.
- Placeholder scan: every task names exact files, commands, expected output, and interfaces.
- Type consistency: translation keys are plain strings consumed by `useTranslate`; mission state remains language-neutral.
