import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync("src/pages/showcase/mission.ts", "utf8");

for (const text of [
  "idle",
  "planning",
  "ready",
  "running",
  "needs approval",
  "completed",
  "blocked",
  "failed",
  "generatePlan",
  "runStep",
  "approve",
  "reject",
  "retry",
  "skip",
  "takeOver",
  "reset",
  "Knowledge search",
  "Permission check",
  "Create task",
  "$100k",
  "citations",
  "Demo orchestration",
]) {
  assert.ok(source.includes(text), `missing mission requirement: ${text}`);
}

console.log("AI Operations Room regression checks passed");
