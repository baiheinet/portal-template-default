import { describe, expect, it } from "vitest";

import { flattenVisibleComponents, getViewerFileExtension, summarizeSelection } from "@/features/pcf-viewer/model";

describe("PCF viewer model helpers", () => {
  it("accepts PCF and IDF extensions case-insensitively", () => {
    expect(getViewerFileExtension("plant.PCF")).toBe("pcf");
    expect(getViewerFileExtension("iso.idf")).toBe("idf");
    expect(getViewerFileExtension("notes.txt")).toBeNull();
  });

  it("flattens only visible files without mutating components", () => {
    const components = [{ type: "PIPE" }, { type: "ELBOW" }];
    expect(flattenVisibleComponents([
      { filename: "a.pcf", visible: true, components },
      { filename: "b.pcf", visible: false, components: [{ type: "VALVE" }] },
    ])).toEqual([
      { type: "PIPE", sourceFile: "a.pcf", index: 0 },
      { type: "ELBOW", sourceFile: "a.pcf", index: 1 },
    ]);
    expect(components).toEqual([{ type: "PIPE" }, { type: "ELBOW" }]);
  });

  it("summarizes declared and endpoint-derived lengths", () => {
    const summary = summarizeSelection([
      { type: "PIPE", sourceFile: "a.pcf", index: 0, attributes: { length: "1200" } },
      { type: "PIPE", sourceFile: "a.pcf", index: 1, endPoints: [{ position: { x: 0, y: 0, z: 0 } }, { position: { x: 0, y: 3, z: 4 } }] },
    ]);
    expect(summary).toEqual({ count: 2, totalLengthMm: 1205, byType: { PIPE: 2 } });
  });
});
