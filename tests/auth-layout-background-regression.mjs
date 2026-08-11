import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/components/auth/auth-layout.tsx", "utf8");
const imageUrl = "https://learnhouse.io/auth-default.png";

assert.match(source, new RegExp(imageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(source, /className="hidden min-h-svh bg-cover bg-center md:block"/);
assert.doesNotMatch(source, /backgroundSize/);
assert.doesNotMatch(source, /backgroundPosition/);
assert.doesNotMatch(source, /AI-native application platform/);
assert.doesNotMatch(source, /NocoBase foundation/);

console.log("Auth layout background regression tests passed");
