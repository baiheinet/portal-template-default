import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync("src/components/app-shell/sidebar.tsx", "utf8");

assert.match(source, /nativeButton=\{!\(asLink && item\.route\)\}/);
console.log("Sidebar Base UI native button regression check passed");
