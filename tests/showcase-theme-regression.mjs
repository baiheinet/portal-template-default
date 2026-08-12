import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const css = readFileSync("src/App.css", "utf8");
const overview = readFileSync("src/pages/showcase/index.tsx", "utf8");
const operations = readFileSync("src/pages/showcase/operations-room.tsx", "utf8");

for (const token of ["--showcase-bg", "--showcase-panel", "--showcase-foreground", ".dark .showcase-theme", ".showcase-grid"]) {
  assert.ok(css.includes(token), `missing Showcase theme token: ${token}`);
}

assert.match(overview, /className="showcase-theme[^\"]*"/);
assert.match(operations, /className="showcase-theme[^\"]*"/);
assert.match(overview, /showcase-ring-center/);

console.log("Showcase dark/light theme regression checks passed");
