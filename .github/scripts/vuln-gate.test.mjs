// Tests for the vulnerability gate. Run: node --test .github/scripts/*.test.mjs
//
// These are GUARDS, not coverage. Each one pins a way the gate could fail OPEN —
// pass while a real advisory is present. Before trusting any of them, mutate the
// line it names and confirm this file goes red on that assertion; a test that
// stays green under the mutation is checking something else.

import test from "node:test";
import assert from "node:assert/strict";

import {
  advisoryId,
  emitAllowlist,
  exceptionProblem,
  gate,
  extractJson,
  isGhsaId,
  parseNpm,
  parseNuget,
  reportProblem,
  severityRank,
} from "./vuln-gate.mjs";

const GHSA = "GHSA-93q8-gq69-wqmw";
const NOW = new Date("2026-07-24T12:00:00Z");

const finding = (over = {}) => ({
  id: GHSA,
  package: "left-pad",
  severity: "high",
  title: "",
  url: "",
  ...over,
});

const exception = (over = {}) => ({
  id: GHSA,
  ecosystem: "npm",
  reason: "no upstream fix yet — tracked in #999",
  expires: "2026-07-24",
  ...over,
});

// --- severity ladder ---------------------------------------------------------

test("an unknown severity outranks critical, so it blocks at any threshold", () => {
  assert.ok(severityRank("wat") > severityRank("critical"));
  assert.ok(severityRank(undefined) > severityRank("critical"));
  const result = gate({ findings: [finding({ severity: "wat" })], ecosystem: "npm", now: NOW });
  assert.equal(result.blocking.length, 1);
});

test("a finding below the level does not block", () => {
  const result = gate({ findings: [finding({ severity: "moderate" })], ecosystem: "npm", now: NOW });
  assert.deepEqual(result.blocking, []);
  assert.equal(result.belowLevel, 1);
});

// --- GHSA identity -----------------------------------------------------------

test("only a bare, whole GHSA is accepted as an id", () => {
  assert.ok(isGhsaId(GHSA));
  assert.ok(isGhsaId(GHSA.toUpperCase()));
  // Each of these would forge an extra allowlist / $GITHUB_OUTPUT entry once
  // interpolated into a comma-separated input.
  assert.ok(!isGhsaId(`${GHSA},GHSA-aaaa-bbbb-cccc`));
  assert.ok(!isGhsaId(`${GHSA}\nfoo=bar`));
  assert.ok(!isGhsaId(`see ${GHSA}`));
  assert.ok(!isGhsaId("CVE-2024-0001"));
});

test("an advisory id is canonicalised from its URL, else falls back", () => {
  assert.equal(advisoryId(`https://github.com/advisories/${GHSA.toUpperCase()}`, 1), GHSA);
  assert.equal(advisoryId("https://example.test/notes/1", "pkg@1.0.0"), "pkg@1.0.0");
  assert.equal(advisoryId(undefined, undefined), "UNKNOWN");
});

// --- exception validation ----------------------------------------------------

test("a well-formed exception validates", () => {
  assert.equal(exceptionProblem(exception()), null);
});

test("every malformed exception is rejected rather than trusted", () => {
  const cases = [
    [null, "not an object"],
    [exception({ id: "nope" }), "id"],
    [exception({ ecosystem: undefined }), "ecosystem"],
    [exception({ ecosystem: "cargo" }), "ecosystem"], // no parser registered
    [exception({ reason: "  " }), "reason"],
    [exception({ expires: undefined }), "expires"],
    [exception({ expires: "December 31, 2099" }), "expires"],
    [exception({ expires: "2026-02-30" }), "calendar date"], // normalises to Mar 2
  ];
  for (const [value, fragment] of cases) {
    const problem = exceptionProblem(value);
    assert.ok(problem, `expected a problem for ${JSON.stringify(value)}`);
    assert.match(problem, new RegExp(fragment, "i"));
  }
});

// The entry below is INSIDE its window and matches the finding exactly — the
// only thing wrong with it is the empty reason. So it suppresses unless
// validation actually gates suppression. An entry that is invalid *and* lapsed
// would pass this test with the validation removed, which is why the case is
// built this way.
test("a malformed exception never suppresses, and is surfaced", () => {
  const result = gate({
    findings: [finding()],
    exceptions: [exception({ reason: "  " })],
    ecosystem: "npm",
    now: NOW,
  });
  assert.equal(result.blocking.length, 1);
  assert.equal(result.suppressed.length, 0);
  assert.equal(result.invalidExceptions.length, 1);
  assert.match(result.invalidExceptions[0].problem, /reason/);
  // …and it is not counted as a live exception for the PR-diff gate either.
  assert.equal(emitAllowlist([exception({ reason: "  " })], NOW), "");
});

// --- exception window --------------------------------------------------------

test("an exception is live through the END of its expiry day", () => {
  const lateOnExpiryDay = new Date("2026-07-24T23:59:59Z");
  const nextDay = new Date("2026-07-25T00:00:00Z");

  const live = gate({ findings: [finding()], exceptions: [exception()], ecosystem: "npm", now: lateOnExpiryDay });
  assert.equal(live.blocking.length, 0);
  assert.equal(live.suppressed.length, 1);

  const lapsed = gate({ findings: [finding()], exceptions: [exception()], ecosystem: "npm", now: nextDay });
  assert.equal(lapsed.blocking.length, 1);
  assert.equal(lapsed.staleExceptions.length, 1);
});

test("an exception scoped to another ecosystem does not suppress", () => {
  const result = gate({
    findings: [finding()],
    exceptions: [exception({ ecosystem: "nuget" })],
    ecosystem: "npm",
    now: NOW,
  });
  assert.equal(result.blocking.length, 1);
});

test('ecosystem "any" suppresses everywhere', () => {
  const result = gate({
    findings: [finding()],
    exceptions: [exception({ ecosystem: "any" })],
    ecosystem: "nuget",
    now: NOW,
  });
  assert.equal(result.suppressed.length, 1);
});

// --- allowlist ---------------------------------------------------------------

test("the allowlist emits only canonical, live ids", () => {
  const out = emitAllowlist(
    [
      exception(),
      exception({ id: GHSA.toUpperCase(), ecosystem: "nuget" }),
      exception({ expires: "2020-01-01" }), // lapsed
      exception({ id: `${GHSA},GHSA-aaaa-bbbb-cccc` }), // forged
    ],
    NOW,
  );
  assert.equal(out, `${GHSA},${GHSA}`);
  assert.ok(!out.includes("\n"));
});

// --- report shape: the fail-closed half --------------------------------------

test("an npm error payload is unusable, not clean", () => {
  assert.match(reportProblem({ error: { code: "ENEEDAUTH" } }, "npm"), /error/i);
  assert.match(reportProblem({}, "npm"), /auditReportVersion/);
  assert.equal(reportProblem({ auditReportVersion: 2, vulnerabilities: {} }, "npm"), null);
});

test("a nuget document with no projects array is unusable, not clean", () => {
  assert.match(reportProblem({}, "nuget"), /projects/);
  assert.equal(reportProblem({ projects: [] }, "nuget"), null);
});

test("an unknown ecosystem is a problem, not a pass", () => {
  assert.match(reportProblem({}, "cargo"), /unknown ecosystem/);
  assert.match(reportProblem(null, "npm"), /not a JSON object/);
});

// --- parsing -----------------------------------------------------------------

test("npm: a transitive advisory is counted once, at its published package", () => {
  const findings = parseNpm({
    auditReportVersion: 2,
    vulnerabilities: {
      minimist: {
        name: "minimist",
        severity: "critical",
        via: [{ source: 1179, name: "minimist", severity: "critical", title: "Prototype pollution", url: `https://github.com/advisories/${GHSA}` }],
      },
      mkdirp: { name: "mkdirp", severity: "critical", via: ["minimist"] },
    },
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, GHSA);
  assert.equal(findings[0].package, "minimist");
});

test("nuget: top-level and transitive packages are both read", () => {
  const findings = parseNuget({
    projects: [
      {
        frameworks: [
          {
            topLevelPackages: [
              { id: "Direct", resolvedVersion: "1.0.0", vulnerabilities: [{ severity: "high", advisoryurl: `https://github.com/advisories/${GHSA}` }] },
            ],
            transitivePackages: [
              { id: "Indirect", resolvedVersion: "2.0.0", vulnerabilities: [{ severity: "critical", advisoryUrl: "https://example.test/a" }] },
            ],
          },
        ],
      },
    ],
  });
  assert.equal(findings.length, 2);
  assert.equal(findings.find((f) => f.package === "Direct@1.0.0").id, GHSA);
  assert.equal(findings.find((f) => f.package === "Indirect@2.0.0").title, "transitive");
});

test("a clean nuget project (no frameworks key) yields no findings", () => {
  assert.deepEqual(parseNuget({ projects: [{ path: "a.csproj" }] }), []);
});

// --- input tolerance ---------------------------------------------------------

test("CLI chatter ahead of the JSON document is skipped", () => {
  assert.deepEqual(extractJson('Determining projects to restore...\n{"projects":[]}'), { projects: [] });
  assert.throws(() => extractJson("command not found"), /no JSON object/);
});
