import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync("src/components/app-shell/header.tsx", "utf8");

assert.match(source, /<Button[\s\S]*render=\{[\s\S]*<a/);
assert.match(source, /nativeButton=\{false\}/);
console.log("Base UI header native button regression check passed");
