import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const {
    formatPortalErrorDiagnostic,
    normalizePortalError,
    redactPortalErrorText,
  } = await server.ssrLoadModule(
    "@/extensions/nocobase-error-boundary/error-diagnostics"
  );

  assert.deepEqual(normalizePortalError("render failed"), {
    name: "Error",
    message: "render failed",
  });

  const redacted = redactPortalErrorText(
    "Authorization: Bearer secret-token\nCookie: session=cookie-secret; role=admin\nhttps://example.test/api?token=query-secret&view=all"
  );
  assert.doesNotMatch(
    redacted,
    /secret-token|cookie-secret|role=admin|query-secret|view=all/
  );
  assert.match(redacted, /\[REDACTED\]/);

  const error = new Error(
    "Unable to render https://example.test/chart?access_token=message-secret"
  );
  error.stack = `${error.name}: ${error.message}\n    at Chart (chart.tsx:10:2)`;
  const diagnostic = formatPortalErrorDiagnostic(error, {
    occurredAt: "2026-08-01T12:00:00.000Z",
    route: "/users?token=route-secret#active",
    templateName: "Default Template",
    templateVersion: "2.0.0",
    componentStack: "\n    at Chart (chart.tsx:10:2)",
  });

  assert.match(diagnostic, /Portal runtime error/);
  assert.match(diagnostic, /Route: \/users/);
  assert.match(diagnostic, /Template: Default Template 2\.0\.0/);
  assert.match(diagnostic, /JavaScript stack:/);
  assert.match(diagnostic, /React component stack:/);
  assert.doesNotMatch(
    diagnostic,
    /message-secret|route-secret|access_token=|\?token=/
  );

  console.log("NocoBase error boundary regression tests passed");
} finally {
  await server.close();
}
