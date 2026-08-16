# CI security gates

> **Rule** — the short version is in [`AGENTS.md`](../../AGENTS.md).
>
> **Provenance:** inherited with the repo template, except where a section says
> otherwise. The shapes it avoids were mostly observed elsewhere.

## The four gates and what each one alone misses

| Gate | Scope | Blind to |
|---|---|---|
| `vuln-gate.mjs` in `ci.yml` | the whole tree, every PR | a repo nobody opens a PR against this week |
| `security-audit.yml` | the same tree, weekly | advisories published mid-week — a clock, not a tripwire |
| `dependency-review` | the PR **diff** | anything already on `main` |
| `codeql.yml` | first-party source | dependencies |

They overlap on purpose. Deleting one because "the others cover it" is how the
gap opens: tree gates and the diff gate answer different questions, and only the
diff gate names the offending dependency in the PR that introduced it.

## A gate blocked on a repo setting warns; it does not fail

`dependency-review` needs **Dependency graph**; `codeql.yml` needs **Code
scanning**. Left alone both fail every PR on a fresh repo, for a reason that is
not a defect in the change under review.

**A red nobody can fix from a branch is worse than a missing check**, because it
teaches people to merge past red, and that habit does not stay confined to the
check that earned it. So each probes for its setting:

- **only a definitive not-enabled answer skips**, with a warning naming the
  setting, so the gate self-activates once the toggle is on;
- **anything else runs**, so a transient failure surfaces rather than silently
  disabling the gate.

The CodeQL probe matches the response **message**, not the status alone: a fork
PR's restricted token returns `403` from the same endpoint, and treating that as
"not enabled" would skip analysis on exactly the PRs that most need it. Both
statuses were measured against a disabled and an enabled repo, not assumed.

Same reasoning for the `build-and-test` and `security-audit` placeholders, which
pass while `TEMPLATE-SETUP.md` exists and fail once it is deleted.

**How to switch them on** — measured here, because "no API can flip it", which
this section used to claim, is wrong for the first:

- **Dependency graph** comes on as a side effect of
  `PUT /repos/{owner}/{repo}/vulnerability-alerts`. Isolated by toggling each
  candidate and re-probing `/dependency-graph/sbom`: 404 with alerts off, 200
  with them on; `automated-security-fixes` makes no difference.
- **Code scanning** needs no toggle once the repo is **public**. Do not enable
  `code-scanning/default-setup` — it conflicts with an advanced workflow and
  rejects its SARIF.

## Why a script instead of the stock commands

- `npm audit --audit-level=high` has **no allowlist**. One unfixable upstream
  advisory blocks every unrelated PR, and the only escape is disabling the gate.
- `dotnet list package --vulnerable` **always exits 0**, so it cannot gate
  anything; its output must be parsed anyway.

Parsing once buys a single exceptions file, one severity ladder and one report
format across every ecosystem.

## Fail closed, everywhere

The gate blocks whenever it cannot be sure:

- **an unrecognised severity ranks above `critical`**, so a tool inventing a new
  level blocks rather than slipping under the floor;
- **an error-shaped report is exit 2, not "clean"**. `npm audit` is
  network-backed and prints `{ "error": … }` on an auth failure — which a
  workflow's `|| true` swallows. Without a shape check that parses as zero
  findings and passes;
- **a malformed exception never suppresses**, and is reported so it gets fixed;
- **an unrecognised `--level` is exit 2**, not a threshold. **Earned, not
  inherited:** the first version ranked the threshold with the same function as a
  finding's severity, so `--level hihg` put the floor one rung *above* `critical`
  and a real critical reported "below threshold" — green run, gate open, from a
  typo. The two are opposites: an unknown **finding** severity must sort high, an
  unknown **threshold** is our own string and must be refused. Found reviewing
  this script's copy in another repo, 2026-08; enforced in `main()` *and*
  `gate()` so no caller can reintroduce it;
- **a corrupt exceptions file warns.** It already suppressed nothing, but
  silently — so the exceptions someone wrote could be gone with no sign. Only a
  missing file is quiet, because that is the normal case.

Each is pinned by a mutation-checked test in `vuln-gate.test.mjs`. The `--level`
case is checked **end to end through the CLI**: every unit behaved correctly
alone, and only the assembled exit code showed the hole.

## Why exceptions must expire

An allowlist with no expiry is a permanent hole nobody revisits, because nothing
ever asks. Entries require a real calendar date, inclusive through the end of
that UTC day. The day after, the advisory blocks again *and* CI warns the entry
is stale.

Date validation is strict on purpose: `2026-02-30` normalises to March 2 in
JavaScript, so a value that does not round-trip is rejected.

## Why the exception id must be an anchored GHSA

The same file feeds `dependency-review-action`'s `allow-ghsas` (comma-separated)
and `$GITHUB_OUTPUT` (newline-delimited). A prefix check rather than an anchored
match lets one entry smuggle in extra allowlist entries or forge a second output
record. So the id must be **exactly** a GHSA, and the emitted allowlist
re-canonicalises rather than passing input through.

A GHSA is also the one key meaning the same thing in every ecosystem, which is
why an advisory without one cannot be excepted at all — bump or pin instead.

## Action pinning

Third-party actions are pinned to a **full commit SHA** with a trailing
`# vX.Y.Z`. Two tag-retargeting attacks make this concrete:
`tj-actions/changed-files` (2025-03) and `aquasecurity/trivy-action` (2026-03) —
both moved an existing tag to secret-exfiltrating code, so every repo pinned to
the tag ran it having reviewed something else.

`actions/*` and `github/*` may keep major tags; GitHub controls those namespaces.

A SHA pin protects you only until someone approves the bump that moves it. So
actions holding write permissions **and** shipping a bundled `dist/` are excluded
from Dependabot's groups — their bumps arrive standalone and get read on their
own, not as one line of a routine batch.

## What none of this covers

**A merge to `main` that changes the workflows themselves.** Once a modified
`ci.yml` is the definition on `main`, every gate runs as that file says and any
attestation it produces is genuinely valid. With zero required approvals, one
account can merge a change to any file in `.github/` and every claim here becomes
whatever that file now says.

[`CODEOWNERS`](../../.github/CODEOWNERS) plus "Require review from Code Owners"
is the closest in-repo lever, and it is **not** a control on its own. It ships
inert because an entry naming an unresolvable user is silently ignored by GitHub
— the "reads as safety, checks nothing" shape of
[`001`](001-writing-a-guard.md).

On a **single-maintainer repo it cannot be a control at all**: nobody can approve
their own PR, so a solo CODEOWNERS is either a deadlock or a decorative
requirement behind an admin bypass. This gap is **open by construction** until a
second person has write access — no repo setting or plan upgrade closes it.

**Branch protection and review of changes to `main` remain the only real
controls.** And they are not always available: GitHub does not offer protection
for a private free-plan repo (`403`). On such a repo every mitigation here
reduces to convention. That is defensible for a solo repo; documenting it as
protected is not, which is why `AGENTS.md` states the rule as an instruction
rather than as a fact.
