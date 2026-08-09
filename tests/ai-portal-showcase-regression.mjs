import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync("src/pages/showcase/index.tsx", "utf8");

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
  "aria-label=\"Create demo record\"",
  "flex-wrap",
  "md:grid-cols-",
]) {
  assert.ok(source.includes(text), `missing showcase requirement: ${text}`);
}

console.log("AI Portal showcase regression checks passed");
