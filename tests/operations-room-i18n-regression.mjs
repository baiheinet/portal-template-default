import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const english = readFileSync("src/locales/en-US.ts", "utf8");
const chinese = readFileSync("src/locales/zh-CN.ts", "utf8");
const operations = readFileSync("src/pages/showcase/operations-room.tsx", "utf8");

function extractKeys(source) {
  return [...source.matchAll(/"(showcase\.operations\.[^"]+)"\s*:/g)].map((match) => match[1]);
}

const englishKeys = extractKeys(english);
const chineseKeys = extractKeys(chinese);

assert.ok(englishKeys.length > 0, "English Operations Room resources are missing");
assert.deepEqual(chineseKeys.sort(), englishKeys.sort(), "English and Chinese Operations Room keys differ");
assert.match(chinese, /"showcase\.operations\.title"\s*:\s*"[^"]*[\u4e00-\u9fff]/);
assert.match(chinese, /"showcase\.operations\.approval\.title"\s*:\s*"[^"]*[\u4e00-\u9fff]/);
assert.match(operations, /useTranslate/);
assert.match(operations, /showcase\.operations\.approval\.approve/);
assert.doesNotMatch(operations, />Generate plan<|>Approve plan<|>Reset mission</);

console.log("Operations Room i18n regression checks passed");
