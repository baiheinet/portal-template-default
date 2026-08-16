# PCF/IDF Viewer Portal Integration Design

## Goal

Turn `baiheinet/PCF-viewer` into an application-owned Portal page and verify
that a runtime package not provided by `@nocobase/portal-sdk` can be integrated
through the Portal template's normal dependency and build pipeline.

## Scope

The first milestone includes a lazy `/pcf-viewer` route with:

- PCF and IDF file selection plus drag-and-drop;
- Three.js WebGL rendering with orbit, pan, zoom, resize, and camera presets;
- grid/axes and box-selection controls;
- multi-file visibility/removal state;
- a component tree synchronized with 3D selection;
- a properties panel for single and multiple selections;
- loading and parse-error feedback;
- a small local sample fixture for browser verification.

Files are parsed in the browser. No NocoBase collection, API, authentication,
ACL, or server upload is part of this milestone.

## Architecture

Add `three` as a `devDependency`, because Portal deployments serve built
assets and do not install runtime Node dependencies. Copy the upstream parser,
geometry, and scene modules into an application-owned `src/features/pcf-viewer`
boundary, converting only the imports and lifecycle assumptions needed by the
Portal. The upstream scene manager remains responsible for Three.js geometry,
controls, raycasting, camera presets, and resource disposal.

Add a React adapter that owns a canvas container ref and creates one scene
instance on mount. It supplies callbacks for files, component selection, box
selection, and errors to React state, and calls `dispose()` on unmount. DOM
queries and global event handlers from the original app are removed from the
adapter boundary; React controls the toolbar, uploader, tree, file list, and
properties view.

Use `defineAppRoutes` in `src/routes.tsx` with a real `/pcf-viewer` path,
`lazy: () => import(...)`, and a resource entry so it appears in navigation.
Keep the existing Showcase route unless the runtime explicitly requires a
different application menu.

## Data flow

1. The uploader validates `.pcf`/`.idf`, reads text with `File.text()`, and
   passes content plus filename to the feature controller.
2. The controller selects `PcfParser` or `IdfParser`, parses using the shared
   project offset, and asks the scene manager to append the file.
3. Scene callbacks expose file metadata and component selection to React.
4. Tree selection calls a scene method to select the matching mesh; 3D and box
   selection update the same selected component state.
5. File removal disposes geometry/materials and updates the file list.

## Error handling

Invalid extensions are rejected before parsing. Parse and geometry failures
are shown in an inline alert/toast without breaking the WebGL canvas. WebGL
initialization failure shows a recoverable empty state. Empty files and files
with no renderable components remain valid and show an empty component state.
All animation, resize, pointer, and renderer resources are disposed when the
route unmounts.

## Verification

- Unit tests cover file-extension validation, component flattening/grouping,
  multi-selection summary, and disposal callback behavior without NocoBase API
  mocks.
- `pnpm typecheck` verifies the external `three` package and adapter types.
- `pnpm build` verifies the package is bundled into the Portal despite not
  being part of the SDK.
- Browser verification loads a sample PCF, confirms a non-empty WebGL canvas,
  changes a camera preset, selects a tree item, and navigates away/back to
  confirm mount/dispose/re-mount behavior.
- If the NocoBase CLI is available in an administrator terminal, verify the
  selected enabled Portal and its resolved `portalType` before runtime testing.

## Non-goals

Persistent file storage, server-side parsing, CAD export, editing geometry,
authentication changes, and packaging PCF-viewer as a standalone npm library
are intentionally excluded.
