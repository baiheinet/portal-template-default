import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = [
  readFileSync("src/pages/showcase/index.tsx", "utf8"),
  readFileSync("src/pages/showcase/operations-room.tsx", "utf8"),
  readFileSync("src/locales/en-US.ts", "utf8"),
  readFileSync("src/locales/zh-CN.ts", "utf8"),
].join("\n");

for (const text of [
  "Demo data",
  "Build beyond",
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
  "setAutomationExpanded(true)",
  "setQuery(\"\")",
  "showcase.overview.newRecord",
  "flex-wrap",
  "Operations Room",
  "Generate plan",
  "Approve plan",
  "Reject",
  "Retry",
  "Skip",
  "Take over",
  "Reset mission",
  "Demo orchestration",
  "4 demo records",
  "2 knowledge sources",
  "useState<\"overview\" | \"operations\">(\"operations\")",
  "md:grid-cols-",
]) {
  assert.ok(source.includes(text), `missing showcase requirement: ${text}`);
}

console.log("AI Portal showcase regression checks passed");
