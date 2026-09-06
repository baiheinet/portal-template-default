import { describe, expect, it } from "vitest";

import {
  applySorts,
  buildCsv,
  convertFieldValue,
  createEmptyRow,
  createNewField,
  DEFAULT_VIEW_PREFS,
  displayCell,
  matchesFilters,
  matchesSearch,
  normalizeCellValue,
  selectVisibleRows,
  SEED_TABLES,
  visibleFields,
  type BaserowField,
} from "@/features/baserow/model";

const crm = SEED_TABLES.find((table) => table.id === "tbl-crm")!;
const companyField = crm.fields.find((field) => field.id === "f-company")!;
const amountField = crm.fields.find((field) => field.id === "f-amount")!;
const stageField = crm.fields.find((field) => field.id === "f-stage")!;
const tagsField = crm.fields.find((field) => field.id === "f-tags")!;
const vipField = crm.fields.find((field) => field.id === "f-vip")!;

describe("displayCell", () => {
  it("resolves single-select choices to names", () => {
    const row = crm.rows[0];
    expect(displayCell(stageField, row.cells["f-stage"])).toBe("商机");
  });

  it("joins multi-select names", () => {
    const row = crm.rows[7]; // 华曜医疗 has three tags
    expect(displayCell(tagsField, row.cells["f-tags"])).toBe("重点客户, 续约, 演示完成");
  });

  it("renders booleans as Chinese yes/no text", () => {
    expect(displayCell(vipField, true)).toBe("是");
    expect(displayCell(vipField, false)).toBe("否");
  });

  it("maps ratings to stars and leaves zero empty", () => {
    const ratingField = crm.fields.find((field) => field.id === "f-satisfaction")!;
    expect(displayCell(ratingField, 4)).toBe("★★★★");
    expect(displayCell(ratingField, 0)).toBe("");
  });
});

describe("normalizeCellValue", () => {
  it("parses numbers with thousands separators", () => {
    expect(normalizeCellValue(amountField, "1,280,000")).toBe(1280000);
    expect(normalizeCellValue(amountField, "abc")).toBeNull();
  });

  it("keeps only valid ISO dates", () => {
    const dateField = crm.fields.find((field) => field.id === "f-followup")!;
    expect(normalizeCellValue(dateField, "2025-07-02")).toBe("2025-07-02");
    expect(normalizeCellValue(dateField, "07/02/2025")).toBeNull();
  });

  it("clamps ratings into the allowed range", () => {
    const ratingField = crm.fields.find((field) => field.id === "f-satisfaction")!;
    expect(normalizeCellValue(ratingField, 9)).toBe(5);
    expect(normalizeCellValue(ratingField, -2)).toBe(0);
  });
});

describe("matchesFilters", () => {
  it("filters with AND across fields", () => {
    const rowsHit = crm.rows.filter((row) =>
      matchesFilters(
        { fields: crm.fields },
        row,
        { groupOperator: "and", filters: [
          { fieldId: "f-vip", op: "checked", value: "" },
          { fieldId: "f-amount", op: "higherThan", value: "1000000" },
        ] },
      ),
    );
    expect(rowsHit.map((row) => row.cells["f-company"])).toEqual(["北方智造集团", "华曜医疗"]);
  });

  it("supports OR semantics", () => {
    const rowsHit = crm.rows.filter((row) =>
      matchesFilters(
        { fields: crm.fields },
        row,
        { groupOperator: "or", filters: [
          { fieldId: "f-company", op: "contains", value: "北方" },
          { fieldId: "f-stage", op: "equal", value: "赢单" },
        ] },
      ),
    );
    expect(rowsHit).toHaveLength(2);
  });

  it("matches multi-select any-of by choice name", () => {
    const rowsHit = crm.rows.filter((row) =>
      matchesFilters({ fields: crm.fields }, row, {
        groupOperator: "and",
        filters: [{ fieldId: "f-tags", op: "hasAnyOf", value: "续约" }],
      }),
    );
    expect(rowsHit.map((row) => row.cells["f-company"])).toEqual(["恒信金融", "华曜医疗"]);
  });

  it("detects empty and not-empty for long text", () => {
    const withNotes = crm.rows.filter((row) => matchesFilters({ fields: crm.fields }, row, {
      groupOperator: "and",
      filters: [{ fieldId: "f-note", op: "notEmpty", value: "" }],
    }));
    const withoutNotes = crm.rows.filter((row) => matchesFilters({ fields: crm.fields }, row, {
      groupOperator: "and",
      filters: [{ fieldId: "f-note", op: "empty", value: "" }],
    }));
    expect(withNotes.length + withoutNotes.length).toBe(crm.rows.length);
    expect(withoutNotes.map((row) => row.cells["f-company"])).toContain("星辰半导体");
  });
});

describe("search and sorts", () => {
  it("searches across all displayed values case-insensitively", () => {
    const hits = crm.rows.filter((row) => matchesSearch(row, crm.fields, "物流"));
    expect(hits).toHaveLength(1);
    const none = crm.rows.filter((row) => matchesSearch(row, crm.fields, "不存在的公司"));
    expect(none).toHaveLength(0);
  });

  it("sorts numerically with empties sinking last regardless of direction", () => {
    const sortedAsc = applySorts(crm.rows, { fields: crm.fields }, [{ fieldId: "f-amount", direction: "asc" }]);
    const amountsAsc = sortedAsc.map((row) => row.cells["f-amount"]);
    expect(amountsAsc[amountsAsc.length - 1]).toBeNull();
    const numericOnly = amountsAsc.filter((value): value is number => typeof value === "number");
    expect([...numericOnly].sort((a, b) => a - b)).toEqual(numericOnly);
  });

  it("applies multi-key sorts in sequence", () => {
    const taskTable = SEED_TABLES.find((table) => table.id === "tbl-tasks")!;
    const statusSorted = applySorts(taskTable.rows, { fields: taskTable.fields }, [
      { fieldId: "t-status", direction: "asc" },
      { fieldId: "t-priority", direction: "asc" },
    ]);
    expect(statusSorted.length).toBe(taskTable.rows.length);
  });
});

describe("view pipeline", () => {
  it("combines search, filter and sort into one pipeline", () => {
    const viewRows = selectVisibleRows(crm, {
      ...DEFAULT_VIEW_PREFS,
      search: "",
      filters: [{ fieldId: "f-vip", op: "checked", value: "" }],
      sorts: [{ fieldId: "f-amount", direction: "desc" }],
    });
    expect(viewRows.map((row) => row.sourceIndex)).toEqual([7, 0, 3, 2]); // 华曜、北方、恒信，星辰金额为空沉底
  });

  it("hides fields from the visible list only", () => {
    const shown = visibleFields(crm, ["f-email"]);
    expect(shown.some((field) => field.id === "f-email")).toBe(false);
    expect(shown.length).toBe(crm.fields.length - 1);
  });
});

describe("type conversion", () => {
  const amountAsText: BaserowField = { ...companyField, id: "f-amount", type: "text" };

  it("numbers become readable text and reverse-parse back", () => {
    expect(convertFieldValue(amountField, amountAsText, 1280000)).toBe("1280000");
    const backToNumber: BaserowField = { ...amountField };
    expect(convertFieldValue(amountAsText, backToNumber, "1280000")).toBe(1280000);
  });

  it("select ids carry over when converting between selects that share choices", () => {
    const widerTarget: BaserowField = { ...tagsField, choices: [...(stageField.choices ?? [])] };
    expect(convertFieldValue(stageField, widerTarget, "stage-won")).toEqual(["stage-won"]);
  });

  it("drops select values whose choice names do not exist in the target", () => {
    expect(convertFieldValue(stageField, tagsField, "stage-won")).toEqual([]);
  });
});

describe("csv and helpers", () => {
  it("escapes commas and quotes in CSV output", () => {
    const table = { ...crm, fields: [companyField, amountField] };
    const csv = buildCsv(table, table.fields, [table.rows[0]]);
    expect(csv.split("\r\n")[0]).toBe("公司,合同金额");
    expect(csv.split("\r\n").length).toBe(2);
  });

  it("creates empty rows initialized per type", () => {
    const fresh = createEmptyRow(crm.fields);
    expect(fresh.cells["f-tags"]).toEqual([]);
    expect(fresh.cells["f-vip"]).toBe(false);
    expect(fresh.cells["f-amount"]).toBeNull();
    expect(fresh.cells["f-satisfaction"]).toBe(0);
  });

  it("creates new select fields with default choices", () => {
    const created = createNewField("singleSelect");
    expect(created.type).toBe("singleSelect");
    expect(created.choices!.length).toBe(3);
  });
});