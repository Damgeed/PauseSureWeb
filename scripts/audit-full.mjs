import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const expectedExceptions = new Map([
  [
    "image-size",
    {
      direct: false,
      version: "2.0.2",
      advisories: new Set(["GHSA-5p2g-fcmc-qvqq", "GHSA-w3rx-r6r6-pgpr"]),
      fixes: [
        false,
        { name: "vinext", version: "1.0.0-beta.8", isSemVerMajor: true },
      ],
    },
  ],
  [
    "vinext",
    {
      direct: true,
      version: "0.0.50",
      advisories: new Set(["image-size"]),
      fixes: [
        false,
        { name: "vinext", version: "1.0.0-beta.8", isSemVerMajor: true },
      ],
    },
  ],
]);

function fail(message, details = "") {
  console.error(`Dependency audit gate failed: ${message}`);
  if (details) console.error(details.trim());
  process.exit(1);
}

function advisoryKey(entry) {
  if (typeof entry === "string") return entry;
  if (typeof entry?.url !== "string") return "(unknown advisory)";
  return entry.url.split("/").at(-1);
}

function highAdvisoryKeys(vulnerability, vulnerabilities) {
  return vulnerability.via.flatMap((entry) => {
    const severity =
      typeof entry === "string" ? vulnerabilities[entry]?.severity : entry?.severity;
    return ["high", "critical"].includes(severity) ? [advisoryKey(entry)] : [];
  });
}

function sameSet(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function sameFix(actual, expected) {
  if (typeof expected !== "object" || expected === null) return Object.is(actual, expected);
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) return false;

  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index]) &&
    expectedKeys.every((key) => Object.is(actual[key], expected[key]))
  );
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const audit = spawnSync(npmCommand, ["audit", "--json", "--audit-level=high"], {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
});

if (audit.error) fail("npm audit could not start.", audit.error.message);

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  fail("npm audit did not return valid JSON.", `${audit.stderr}\n${audit.stdout}`);
}

if (report.auditReportVersion !== 2 || !report.vulnerabilities || !report.metadata) {
  fail("npm audit returned an unsupported or incomplete report.", audit.stdout);
}

const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const highOrCritical = new Map(
  Object.entries(report.vulnerabilities).filter(([, vulnerability]) =>
    ["high", "critical"].includes(vulnerability.severity),
  ),
);

const unexpected = [...highOrCritical.keys()].filter((name) => !expectedExceptions.has(name));
if (unexpected.length > 0) {
  fail(`unreviewed high/critical findings: ${unexpected.join(", ")}.`);
}

for (const [name, expected] of expectedExceptions) {
  const vulnerability = highOrCritical.get(name);
  if (!vulnerability) {
    fail(`${name} no longer matches its exception; remove or re-review the exception.`);
  }

  const installedVersion = lock.packages?.[`node_modules/${name}`]?.version;
  if (installedVersion !== expected.version) {
    fail(`${name} changed from reviewed version ${expected.version} to ${installedVersion ?? "unknown"}.`);
  }

  if (vulnerability.isDirect !== expected.direct || vulnerability.severity !== "high") {
    fail(`${name} changed scope or severity and must be re-reviewed.`);
  }

  const actualAdvisories = new Set(highAdvisoryKeys(vulnerability, report.vulnerabilities));
  if (!sameSet(actualAdvisories, expected.advisories)) {
    fail(
      `${name} advisory set changed and must be re-reviewed.`,
      `Expected: ${[...expected.advisories].sort().join(", ")}\nActual: ${[...actualAdvisories].sort().join(", ")}`,
    );
  }

  if (!expected.fixes.some((fix) => sameFix(vulnerability.fixAvailable, fix))) {
    fail(
      `${name} remediation options changed and must be re-reviewed.`,
      `Expected one of: ${expected.fixes.map((fix) => JSON.stringify(fix)).join(", ")}\n` +
        `Actual: ${JSON.stringify(vulnerability.fixAvailable)}`,
    );
  }
}

if (audit.status !== 0 && audit.status !== 1) {
  fail(`npm audit exited unexpectedly with status ${audit.status}.`, audit.stderr);
}

const counts = report.metadata.vulnerabilities;
console.log(
  `Full dependency audit passed with only reviewed exceptions: image-size@2.0.2 and vinext@0.0.50. ` +
    `Current report: ${counts.critical} critical, ${counts.high} high, ${counts.moderate} moderate, ${counts.low} low.`,
);
