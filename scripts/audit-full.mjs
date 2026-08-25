import { spawnSync } from "node:child_process";

function fail(message, details = "") {
  console.error(`Dependency audit gate failed: ${message}`);
  if (details) console.error(details.trim());
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const audit = spawnSync(npmCommand, ["audit", "--json", "--audit-level=low"], {
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

const findings = Object.keys(report.vulnerabilities);
const counts = report.metadata.vulnerabilities;
if (
  audit.status !== 0
  || findings.length !== 0
  || counts.total !== 0
  || counts.critical !== 0
  || counts.high !== 0
  || counts.moderate !== 0
  || counts.low !== 0
  || counts.info !== 0
) {
  fail(
    "the dependency graph contains a vulnerability; no exceptions are approved.",
    `Packages: ${findings.join(", ") || "(unknown)"}\nCurrent report: ${JSON.stringify(counts)}`,
  );
}

console.log("Full dependency audit passed with 0 vulnerabilities and no exceptions.");
