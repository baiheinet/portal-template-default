import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import semver from "semver";

import { portalSdkCompatibilityPlugin } from "../dist/vite/index.js";

test("the SDK 2 range includes Template 3 and excludes adjacent generations", () => {
  const range = ">=3.0.0 <4.0.0";
  assert.equal(semver.satisfies("2.9.0", range), false);
  assert.equal(semver.satisfies("3.0.0", range), true);
  assert.equal(semver.satisfies("3.9.0", range), true);
  assert.equal(semver.satisfies("4.0.0", range), false);
});

test("the Vite plugin reports an invalid base template version", () => {
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "portal-sdk-vite-compat-")
  );

  try {
    fs.writeFileSync(
      path.join(projectRoot, "package.json"),
      JSON.stringify({
        name: "@example/custom-portal",
        version: "8.4.0",
        nocobase: { defaultTemplateVersion: "not-semver" },
      })
    );

    const plugin = portalSdkCompatibilityPlugin({ root: projectRoot });
    assert.throws(
      () => plugin.configResolved(),
      /Invalid nocobase\.defaultTemplateVersion: not-semver/
    );
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
