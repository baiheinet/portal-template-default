# PCF/IDF Viewer Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the upstream PCF/IDF Three.js viewer as a lazy, application-owned Portal page and prove a package outside the Portal SDK can be bundled and used.

**Architecture:** Copy the upstream parser and geometry logic into a focused `src/features/pcf-viewer` feature, then wrap its scene manager with a React lifecycle adapter. React owns upload, file list, tree, properties, toolbar, and errors; the scene manager owns WebGL and selection mechanics. The route is declared once in `src/routes.tsx` and lazy-loads the page.

**Tech Stack:** React 19, TypeScript, Vite/Refine, `three` 0.160+, shadcn Base UI, Vitest, Playwright.

## Global Constraints

- Add `three` only to `devDependencies`.
- Keep all application source under `src/features/pcf-viewer` and `src/pages/pcf-viewer`; do not edit `src/components/ui` for feature styling.
- Do not add NocoBase API, authentication, ACL, server upload, or persistent storage.
- Use lazy route loading with a real `/pcf-viewer` path and a resource entry.
- Every WebGL event listener, animation loop, renderer, controls, geometry, and material must be disposed on unmount.
- Unit tests must use ordinary props and local data only; browser behavior requiring WebGL belongs in the browser verification flow.

---

### Task 1: Add the external Three.js dependency and feature source boundary

**Files:**
- Modify: `package.json` dependency list
- Modify: `pnpm-lock.yaml`
- Create: `src/features/pcf-viewer/parser/PcfParser.js`
- Create: `src/features/pcf-viewer/parser/IdfParser.js`
- Create: `src/features/pcf-viewer/geometry/PipeGeometry.js`
- Create: `src/features/pcf-viewer/geometry/ElbowGeometry.js`
- Create: `src/features/pcf-viewer/geometry/TeeGeometry.js`
- Create: `src/features/pcf-viewer/geometry/ValveGeometry.js`
- Create: `src/features/pcf-viewer/geometry/ReducerGeometry.js`
- Create: `src/features/pcf-viewer/geometry/FlangeGeometry.js`
- Create: `src/features/pcf-viewer/geometry/SupportGeometry.js`

**Interfaces:**
- Produces parser classes with the upstream contracts `parse(content: string, globalOffset?: object)` and `getStatistics()`.
- Produces geometry classes with the upstream static `create(...)` methods used by the scene manager.

- [ ] **Step 1: Add the package.**

Add this exact entry to `devDependencies`:

```json
"three": "^0.160.0"
```

Run `pnpm install` and confirm the lockfile records `three` without adding it to `dependencies`.

- [ ] **Step 2: Copy parser and geometry source.**

Copy the corresponding files from `baiheinet/PCF-viewer` without changing parsing or geometry behavior. Keep relative imports inside `src/features/pcf-viewer`. Convert only file paths and Three.js addon imports needed by the new feature boundary.

- [ ] **Step 3: Run a source-level check.**

Run:

```bash
pnpm exec tsc --noEmit --allowJs --checkJs false src/features/pcf-viewer/parser/PcfParser.js
```

Expected: the command completes without syntax errors. If the repository TypeScript configuration rejects direct JS checking, run `node --check` on each copied JavaScript module instead.

- [ ] **Step 4: Commit the dependency and source boundary.**

```bash
git add package.json pnpm-lock.yaml src/features/pcf-viewer
git commit -m "feat: add PCF viewer parsing and geometry modules"
```

### Task 2: Build a disposable Three.js scene controller

**Files:**
- Create: `src/features/pcf-viewer/scene/Scene.ts`
- Create: `src/features/pcf-viewer/scene/types.ts`
- Create: `tests/logic/pcf-viewer-scene.test.ts`

**Interfaces:**
- `SceneController` constructor accepts `{ container: HTMLElement; onComponentSelected?: (selection: ComponentSelection | null) => void; onBoxSelectionComplete?: (items: ComponentSelection[]) => void; onFilesChanged?: (files: ViewerFile[]) => void }`.
- Methods: `loadPipingData(data, filename, clearExisting?: boolean)`, `selectComponent(filename, index)`, `setCameraView(view: "iso" | "top" | "front" | "side")`, `fitCameraToSelection()`, `toggleGrid()`, `toggleBoxSelectMode()`, `toggleFileVisibility(filename)`, `removeFile(filename)`, `getFiles()`, and `dispose()`.
- `ComponentSelection` includes `component`, `filename`, and local `index`; `ViewerFile` includes `filename`, `visible`, `color`, and `components`.

- [ ] **Step 1: Write lifecycle and callback tests.**

Test the controller boundary with a mocked renderer factory, asserting that `dispose()` calls controls disposal, renderer disposal, and registered listener cleanup exactly once. Test that `loadPipingData` emits a file list containing the filename and component count, and that `removeFile` emits the updated list.

- [ ] **Step 2: Run the focused test and verify it fails.**

```bash
pnpm vitest run tests/logic/pcf-viewer-scene.test.ts
```

Expected: FAIL because `SceneController` is not implemented.

- [ ] **Step 3: Adapt upstream `Scene` into `SceneController`.**

Use `three` and `three/addons/controls/OrbitControls.js`. Replace document ID lookups with the supplied container and a local selection-box element. Store the resize callback as a stable function reference so `removeEventListener` works. Add an `animationFrameId` field and cancel it in `dispose()`. Traverse all file groups during disposal and call `dispose()` on geometries/materials.

- [ ] **Step 4: Implement selection bridge methods.**

Preserve the upstream `userData.componentIndex` and `userData.filename` contract. Make `selectComponent(filename, index)` find the corresponding mesh and route through the same highlight/callback path used by a 3D click. Keep box selection returning flattened `{ ...component, index, sourceFile: filename }` records.

- [ ] **Step 5: Run the focused test and commit.**

```bash
pnpm vitest run tests/logic/pcf-viewer-scene.test.ts
git add src/features/pcf-viewer/scene tests/logic/pcf-viewer-scene.test.ts
git commit -m "feat: add disposable PCF viewer scene controller"
```

Expected: PASS.

### Task 3: Add local viewer data utilities and React-independent tests

**Files:**
- Create: `src/features/pcf-viewer/model.ts`
- Create: `src/features/pcf-viewer/file-input.ts`
- Create: `tests/logic/pcf-viewer-model.test.ts`

**Interfaces:**
- `getViewerFileExtension(filename: string): "pcf" | "idf" | null`.
- `flattenVisibleComponents(files: ViewerFile[]): ComponentSelection[]`.
- `summarizeSelection(items: ComponentSelection[]): { count: number; totalLengthMm: number; byType: Record<string, number> }`.

- [ ] **Step 1: Write failing utility tests.**

Cover uppercase extensions, hidden files, invalid extensions, flattening only visible files with stable local indexes, and selection summaries using both `attributes.length` and endpoint distance.

- [ ] **Step 2: Run the focused test.**

```bash
pnpm vitest run tests/logic/pcf-viewer-model.test.ts
```

Expected: FAIL because the utilities do not exist.

- [ ] **Step 3: Implement the utilities.**

Keep them pure and browser-independent. `getViewerFileExtension` must return `null` for names without `.pcf`/`.idf`. `flattenVisibleComponents` must add `sourceFile` and local `index` without mutating parser data. `summarizeSelection` must return millimeters and a type histogram.

- [ ] **Step 4: Run tests and commit.**

```bash
pnpm vitest run tests/logic/pcf-viewer-model.test.ts
git add src/features/pcf-viewer/model.ts src/features/pcf-viewer/file-input.ts tests/logic/pcf-viewer-model.test.ts
git commit -m "test: add PCF viewer data utilities"
```

Expected: PASS.

### Task 4: Implement the React viewer page and feature adapter

**Files:**
- Create: `src/features/pcf-viewer/pcf-viewer-canvas.tsx`
- Create: `src/features/pcf-viewer/component-tree.tsx`
- Create: `src/features/pcf-viewer/properties-panel.tsx`
- Create: `src/features/pcf-viewer/file-list.tsx`
- Create: `src/pages/pcf-viewer/index.tsx`
- Create: `src/pages/pcf-viewer/pcf-viewer.css`
- Create: `tests/components/pcf-viewer-panels.test.tsx`

**Interfaces:**
- `PcfViewerCanvas` props: `onSceneReady`, `onSceneError`, and callback props for files and selections.
- `ComponentTree` props: `components`, `selectedKey`, `onSelect`.
- `PropertiesPanel` props: `selection` and `multiSelection`.
- `FileList` props: `files`, `onToggleVisibility`, `onRemove`.

- [ ] **Step 1: Write panel interaction tests.**

Render panels with ordinary props and assert that the tree calls `onSelect` with the source filename/local index, the file list calls visibility/removal callbacks, invalid uploader files show an inline message, and the properties panel displays type, endpoint, item code, and total length.

- [ ] **Step 2: Run the focused test and verify it fails.**

```bash
pnpm vitest run tests/components/pcf-viewer-panels.test.tsx
```

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement `PcfViewerCanvas`.**

Create `SceneController` once in `useEffect` after the container exists. Attach callbacks, use `ResizeObserver` where available, and return cleanup that disconnects the observer and calls `scene.dispose()`. Render only the canvas container and the local selection-box overlay.

- [ ] **Step 4: Implement upload and parse flow.**

Use a hidden `<input type="file" accept=".pcf,.idf" multiple>` plus a drag/drop zone. For each file, validate with `getViewerFileExtension`, read `await file.text()`, instantiate `PcfParser` or `IdfParser`, parse with the shared global offset, save the first offset, and call `scene.loadPipingData(data, file.name, false)`. Show loading state per batch and an inline error on rejection.

- [ ] **Step 5: Implement React panels.**

Use shadcn `Card`, `Button`, `Badge`, `Input`, `ScrollArea`, and `Alert` from existing `src/components/ui`. Use semantic buttons for tree items and toolbar actions. Keep all feature-specific styles in `pcf-viewer.css`, with a responsive layout: left controls/tree, center canvas, right properties panel, and stacked panels on narrow screens.

- [ ] **Step 6: Implement toolbar and page state.**

Wire camera preset buttons, fit, grid/axes, box selection, file visibility/removal, tree-to-scene selection, and scene-to-tree selection. Show empty states before a file is loaded and a compact status bar with file/component counts.

- [ ] **Step 7: Run tests and commit.**

```bash
pnpm vitest run tests/components/pcf-viewer-panels.test.tsx tests/logic/pcf-viewer-model.test.ts
git add src/features/pcf-viewer src/pages/pcf-viewer tests/components/pcf-viewer-panels.test.tsx
git commit -m "feat: add React PCF viewer page"
```

Expected: PASS.

### Task 5: Register the lazy Portal route and add a browser fixture

**Files:**
- Modify: `src/routes.tsx`
- Create: `public/samples/sample.pcf`
- Modify: `playwright.config.ts` only if the existing test server needs no change
- Create: `tests/pcf-viewer-route-regression.mjs`

**Interfaces:**
- Route name: `pcf-viewer`.
- Route path: `/pcf-viewer`.
- Resource label: `PCF/IDF Viewer`.

- [ ] **Step 1: Add the route.**

Add a `Box` or `Cuboid`/`FileBox` Lucide icon import and this route entry:

```tsx
{
  name: "pcf-viewer",
  path: "/pcf-viewer",
  lazy: () => import("./pages/pcf-viewer"),
  resource: { meta: { label: "PCF/IDF Viewer", icon: <Box /> } },
}
```

Keep `registryRoutesEnabled = false` and do not duplicate the route in `src/app/routes.tsx`.

- [ ] **Step 2: Add a minimal valid fixture.**

Create `public/samples/sample.pcf` containing units, a pipeline reference, one `PIPE` with two endpoints and item code, and one `ELBOW` with two endpoints and centre point. Use millimeter coordinates that produce a visible scene.

- [ ] **Step 3: Add route regression coverage.**

The regression script should start from the configured test server, navigate to `/pcf-viewer`, assert the page title/heading and upload controls, set the file input to `public/samples/sample.pcf`, wait for the canvas and component count, click a camera preset and a tree item, then navigate to `/showcase` and back to `/pcf-viewer` to verify the page remounts without a console page error.

- [ ] **Step 4: Run typecheck and build.**

```bash
pnpm typecheck
pnpm build
```

Expected: both PASS; the build output must include `three` in the lazy viewer chunk and no SDK-only import error.

- [ ] **Step 5: Commit route and browser fixture.**

```bash
git add src/routes.tsx public/samples/sample.pcf tests/pcf-viewer-route-regression.mjs
git commit -m "feat: register PCF viewer Portal route"
```

### Task 6: Run the full verification matrix and record integration evidence

**Files:**
- Modify: `docs/superpowers/specs/2026-08-16-pcf-viewer-portal-design.md` only if verification commands or observed constraints materially change
- Modify: `README.MD` with a short PCF viewer section and the external-package integration note

- [ ] **Step 1: Run focused frontend tests.**

```bash
pnpm vitest run tests/logic/pcf-viewer-model.test.ts tests/logic/pcf-viewer-scene.test.ts tests/components/pcf-viewer-panels.test.tsx
```

- [ ] **Step 2: Run repository typecheck, build, and test suite.**

```bash
pnpm typecheck
pnpm test
pnpm build
```

- [ ] **Step 3: Run browser verification.**

```bash
pnpm test:e2e -- tests/pcf-viewer-route-regression.mjs
```

If the NocoBase CLI is used for a live Portal environment, execute the commands from an administrator terminal: `nb portal --help`, `nb portal list -j`, then resolve exactly one enabled Portal by its `portalType` before testing. Record the CLI limitation if Windows still rejects non-administrator execution.

- [ ] **Step 4: Document the integration result.**

Add to `README.MD` that `three` is a Portal-owned `devDependency`, is bundled by Vite into the viewer route, and is not imported from `@nocobase/portal-sdk`. Include the local route and sample-file usage.

- [ ] **Step 5: Review status and commit documentation.**

```bash
git status --short
git diff --check
git add README.MD docs/superpowers/specs/2026-08-16-pcf-viewer-portal-design.md
git commit -m "docs: record PCF viewer integration verification"
```
