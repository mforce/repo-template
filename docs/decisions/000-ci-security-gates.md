# CI security gates

> **Rule** — the one-paragraph version lives in [`AGENTS.md`](../../AGENTS.md).
>
> **Provenance:** inherited with the repo template. The design is forward-looking
> for this repo; the shapes it avoids were observed elsewhere.

## The four gates and what each one alone misses

| Gate | Scope | Blind to |
|---|---|---|
| `vuln-gate.mjs` in `ci.yml` | the whole dependency tree, on every PR | a repo nobody opens a PR against this week |
| `security-audit.yml` | the same tree, weekly on a schedule | advisories published mid-week — it is a clock, not a tripwire |
| `dependency-review` | the **diff** of a PR | anything already on `main` |
| `codeql.yml` | first-party source | dependencies |

They overlap on purpose. Deleting one because "the others cover it" is how the
gap opens: the tree gates and the diff gate answer different questions ("is our
tree clean?" vs "does *this PR* make it worse?"), and only the diff gate names
the offending dependency in the PR that introduced it.

## A gate blocked on a repo setting warns; it does not fail

Two of the four need a one-time owner toggle that no API can flip and no commit
can supply: `dependency-review` needs **Dependency graph**, `codeql.yml` needs
**Code scanning**. Left alone, both fail every PR on a fresh repo — for a reason
that is not a defect in the change being reviewed.

A red check nobody can fix from a branch is worse than a missing check, because
it teaches everyone to merge past red, and that habit does not stay confined to
the one check that earned it. So each probes for its setting, and:

- **only a definitive not-enabled answer skips**, with a loud warning naming the
  setting — so the gate self-activates on the next run once the toggle is on,
  with nobody having to remember to re-enable it;
- **anything else runs**, so a transient or unexpected failure surfaces as a real
  error rather than silently disabling the gate.

The CodeQL probe matches on the response **message**, not the status alone: a
fork PR's restricted token returns `403` from the same endpoint, and treating
that as "not enabled" would skip analysis on exactly the PRs that most need it.
Both statuses were measured against a disabled and an enabled repo rather than
assumed.

The same reasoning drives the `build-and-test` placeholder, which passes while
`TEMPLATE-SETUP.md` exists and fails once it is deleted — an un-set-up template
is not permanently red, and a set-up repo cannot ship a vacuously green build.

## Why a script instead of the stock commands

- `npm audit --audit-level=high` gates, but has **no allowlist**. One unfixable
  upstream advisory blocks every unrelated PR until it is patched, and the only
  escape is to disable the gate — permanently, in practice.
- `dotnet list package --vulnerable` **always exits 0**, so on its own it cannot
  gate anything. Its output has to be parsed either way.

Both sides need parsing, so parsing once buys a single exceptions file, one
severity ladder, and one report format across every ecosystem.

## Fail closed, everywhere

The gate blocks whenever it cannot be sure:

- **an unrecognised severity ranks above `critical`**, so a tool that invents a
  new level blocks rather than slipping through below the floor;
- **an error-shaped report is exit 2, not "clean"**. `npm audit` is
  network-backed; on a registry or auth failure it prints `{ "error": … }` with
  no `vulnerabilities` key and a non-zero exit — which a workflow's `|| true`
  swallows. Without a shape check that parses as zero findings and passes;
- **a malformed exception never suppresses**, and is reported as a warning so it
  gets fixed rather than silently doing nothing.

Each of those is pinned by a test in `.github/scripts/vuln-gate.test.mjs`, and
each test was mutation-checked: the corresponding line was broken and the run
confirmed red on that test's own assertion.

## Why exceptions must expire

An allowlist with no expiry is a permanent hole that nobody revisits, because
nothing ever asks. The entry format therefore **requires** a real calendar date,
and the window is inclusive through the end of that UTC day. The day after, the
advisory blocks again *and* CI warns that the entry is stale, so a lapsed entry
gets deleted instead of lingering as dead config.

The date validation is strict on purpose: `2026-02-30` normalises to March 2 in
JavaScript and would otherwise be accepted as a valid-looking date that means
something else. A value that does not round-trip is rejected.

## Why the exception id must be an anchored GHSA

The same file feeds `dependency-review-action`'s `allow-ghsas` input — a
**comma-separated string** — and `$GITHUB_OUTPUT`, which is newline-delimited. An
id validated with a prefix check rather than an anchored match lets a single
entry like `GHSA-aaaa-bbbb-cccc,GHSA-dddd-eeee-ffff` or one carrying an embedded
newline smuggle in extra allowlist entries, or forge a second `GITHUB_OUTPUT`
record. So the id must be **exactly** a GHSA and nothing else, and the emitted
allowlist re-canonicalises every id rather than passing the input through.

A GHSA is also the one key that means the same thing in every ecosystem, which
is why an advisory with no GHSA cannot be excepted at all — bump or pin the
package instead.

## Action pinning

Third-party actions are pinned to a **full commit SHA** with a trailing
`# vX.Y.Z` comment. Two tag-retargeting supply-chain attacks make this concrete
rather than theoretical: `tj-actions/changed-files` (2025-03) and
`aquasecurity/trivy-action` (2026-03). Both moved an existing tag to
secret-exfiltrating code, so every repo pinned to the tag ran it on the next
push, having reviewed something else.

`actions/*` and `github/*` may keep major-version tags — GitHub controls those
namespaces, and pinning them costs more maintenance than it buys.

A SHA pin protects you only up to the moment someone approves the bump that
moves it. So actions that hold write permissions **and** ship a bundled `dist/`
are excluded from Dependabot's grouped PRs (see `.github/dependabot.yml`): their
bumps arrive standalone and get read on their own, rather than as one line of a
routine batch.

## What none of this covers

**A merge to `main` that changes the workflows themselves.** Once a modified
`ci.yml` is the definition on `main`, every gate here runs exactly as that file
says, and any attestation it produces is genuinely valid. If `main` requires a PR
but zero approving reviews, a single account can merge a change to any file in
`.github/` and every claim on this page becomes whatever that file now says.

[`.github/CODEOWNERS`](../../.github/CODEOWNERS) is the closest the repo itself
gets to a lever on this: with branch protection's *"Require review from Code
Owners"* ticked, a `.github/` change cannot merge with nobody having looked. It
is **not** a control on its own — an owner approving their own change is no
review, and the file ships inert because a CODEOWNERS entry naming an
unresolvable user is silently ignored by GitHub, which is precisely the "reads as
safety, checks nothing" shape of
[`001-writing-a-guard.md`](001-writing-a-guard.md).

**Branch protection and review of changes to `main` remain the only real
controls.** Nothing in the repo can substitute for them.
