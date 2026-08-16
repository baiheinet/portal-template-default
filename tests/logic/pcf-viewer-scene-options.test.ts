import { describe, expect, it } from "vitest";

// @ts-expect-error The helper is intentionally implemented alongside the upstream JavaScript scene.
import { resolveSelectionBox } from "@/features/pcf-viewer/upstream/src/viewer/scene-options.js";

describe("PCF viewer scene options", () => {
  it("resolves the caller-provided selection box without relying on init scope", () => {
    const selectionBox = document.createElement("div");
    expect(resolveSelectionBox({ selectionBox })).toBe(selectionBox);
    expect(resolveSelectionBox()).toBeNull();
  });
});
