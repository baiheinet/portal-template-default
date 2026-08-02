import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import semver from "semver";

const sdkRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const checker = path.join(
  sdkRoot,
  "scripts/check-template-compatibility.mjs"
);
const sdkPackage = JSON.parse(
  fs.readFileSync(path.join(sdkRoot, "package.json"), "utf8")
);
const supportedRange = sdkPackage.nocobase.supportedDefaultTemplateRange;
const compatibleBaseVersion = semver.minVersion(supportedRange)?.version;
if (!compatibleBaseVersion) {
  throw new Error(`Invalid supported Default Template range: ${supportedRange}`);
}
const compatibleMajor = semver.major(compatibleBaseVersion);
const incompatibleBaseVersion =
  compatibleMajor > 0
    ? `${compatibleMajor - 1}.0.0`
    : semver.inc(compatibleBaseVersion, "major");
if (
  !incompatibleBaseVersion ||
  semver.satisfies(incompatibleBaseVersion, supportedRange)
) {
  throw new Error(
    `Unable to derive an incompatible version for: ${supportedRange}`
  );
}

const runChecker = (packageJson) => {
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "portal-sdk-compat-")
  );
  fs.writeFileSync(
    path.join(projectRoot, "package.json"),
    JSON.stringify(packageJson)
  );
  const result = spawnSync(process.execPath, [checker], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      INIT_CWD: projectRoot,
      npm_config_local_prefix: projectRoot,
    },
  });
  fs.rmSync(projectRoot, { recursive: true, force: true });
  return result;
};

test("accepts a derived template with a compatible base version", () => {
  const result = runChecker({
    name: "@example/custom-portal",
    version: "8.4.0",
    nocobase: { defaultTemplateVersion: compatibleBaseVersion },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    result.stdout.includes(
      `supports Default Template ${compatibleBaseVersion}`
    )
  );
});

test("rejects an incompatible base template version with an actionable error", () => {
  const result = runChecker({
    name: "@example/custom-portal",
    version: "8.4.0",
    nocobase: { defaultTemplateVersion: incompatibleBaseVersion },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Incompatible NocoBase Portal SDK/);
  assert.ok(
    result.stderr.includes(
      `Current Default Template: ${incompatibleBaseVersion}`
    )
  );
  assert.match(result.stderr, /Supported Default Template range/);
});

test("rejects projects that do not preserve their base template version", () => {
  const result = runChecker({
    name: "@example/custom-portal",
    version: "8.4.0",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unable to determine/);
  assert.match(result.stderr, /nocobase\.defaultTemplateVersion/);
});
