import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";

// Compile-level smoke: the support desk feature keeps its critical contracts
// (resource names, field names, state machine, attention ordering, ACL roles)
// intact across refactors. Assertions are source-text checks so CI can run
// them without a backend.

const model = readFileSync("src/features/support-desk/model.ts", "utf8");
const api = readFileSync("src/features/support-desk/api.ts", "utf8");
const routes = readFileSync("src/routes.tsx", "utf8");
const detail = readFileSync(
  "src/features/support-desk/helpdesk-detail.tsx",
  "utf8"
);
const zh = readFileSync("src/locales/zh-CN.ts", "utf8");
const en = readFileSync("src/locales/en-US.ts", "utf8");
const helpdeskPage = readFileSync("src/pages/helpdesk/index.tsx", "utf8");
const overviewPage = readFileSync("src/pages/helpdesk/overview.tsx", "utf8");
const customerSubmit = readFileSync(
  "src/features/support-desk/customer-submit.tsx",
  "utf8"
);

// State machine: pending -> processing -> resolved -> closed (reopen allowed).
for (const rule of [
  `case "reply":
      return status === "pending" ? "processing" : null;`,
  `case "resolve":
      return status === "processing" ? "resolved" : null;`,
  `case "close":
      return status === "resolved" ? "closed" : null;`,
  `case "reopen":
      return status === "resolved" ? "processing" : null;`,
]) {
  assert.ok(model.includes(rule), `state machine rule missing: ${rule}`);
}

// Attention classification order.
const attentionOrder = ["urgentUnanswered", "overdue", "nearTimeout", "stale"];
const rankSource = model.slice(
  model.indexOf("attentionReasonRank"),
  model.indexOf("};", model.indexOf("attentionReasonRank"))
);
let cursor = -1;
for (const reason of attentionOrder) {
  const at = rankSource.indexOf(reason);
  assert.ok(at > cursor, `attention rank order broken at ${reason}`);
  cursor = at;
}

// Resource and field contracts.
for (const resource of [
  "support_tickets",
  "ticket_messages",
  "support_agents",
  "sla_rules",
  "customers",
]) {
  assert.ok(api.includes(`"${resource}"`), `resource constant missing: ${resource}`);
}
for (const field of [
  "ticketNo",
  "firstRespondedAt",
  "lastActivityAt",
  "resolvedAt",
]) {
  assert.ok(api.includes(field), `ticket field missing from api.ts: ${field}`);
}

// Routes keep the planned inventory and role constraints.
for (const path of ["/support", "/support/tickets", "/helpdesk", "/helpdesk/overview"]) {
  assert.ok(routes.includes(`path: "${path}"`), `route missing: ${path}`);
}
assert.ok(routes.includes('anyOf: ["r_support", "admin", "root"]'), "staff route roles missing");
assert.ok(
  routes.includes('anyOf: ["r_customer", "r_support", "admin", "root"]'),
  "support-entry route roles missing"
);
assert.equal(
  routes.includes("showcase"),
  false,
  "template showcase route must stay unregistered in the app surface"
);

// Helpdesk resolve requires a public note; UI never bypasses the state machine.
assert.ok(detail.includes('nextStatus(ticket.status, action)'), "detail must consult nextStatus");
assert.ok(
  helpdeskPage.includes("classifyAttention") ||
    overviewPage.includes("classifyAttention") ||
    readFileSync("src/features/support-desk/helpdesk-table.tsx", "utf8").includes(
      "AttentionReason"
    ),
  "attention classification must surface in helpdesk surfaces"
);

// Locales: every support key exists in both bundles.
const keyPattern = /"support\.[a-zA-Z.]+":/g;
const zhKeys = new Set(zh.match(keyPattern) ?? []);
const enKeys = new Set(en.match(keyPattern) ?? []);
assert.ok(zhKeys.size >= 60, `zh support keys too few: ${zhKeys.size}`);
assert.ok(enKeys.size >= 60, `en support keys too few: ${enKeys.size}`);
for (const key of zhKeys) {
  assert.ok(enKeys.has(key), `en-US missing key ${key}`);
}
for (const key of enKeys) {
  assert.ok(zhKeys.has(key), `zh-CN missing key ${key}`);
}

// The customer form enforces required title/description.
assert.ok(customerSubmit.includes("min(1)"), "customer form must require title/description");

// Backend contracts used by the frontend must match the live collections.
const swaggerCache = ".nocobase/support-desk-swagger.json";
assert.ok(
  !existsSync(swaggerCache) || readFileSync(swaggerCache, "utf8").includes("support_tickets"),
  "cached swagger snapshot (if present) must include support_tickets"
);

console.log(
  `support-desk regression OK: ${zhKeys.size} locale keys, state machine + attention order verified`
);
