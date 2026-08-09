import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync("vite.config.ts", "utf8");

assert.match(source, /dedupe:\s*\[\s*["']react["']\s*,\s*["']react-dom["']\s*\]/);
console.log("Portal Vite React dedupe regression check passed");
