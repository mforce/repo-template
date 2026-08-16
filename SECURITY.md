# Security policy

## Reporting a vulnerability

**Do not open a public issue.** A public report is a working exploit handed to
everyone who reads the tracker before the fix ships.

TODO(template:security-report-channel) pick one channel and delete the others:

- **GitHub private vulnerability reporting** — repo → Security → Report a
  vulnerability. Preferred: it needs no shared mailbox and gives a private fork
  to develop the fix in. Requires the setting to be enabled once
  (Settings → Advanced Security → Private vulnerability reporting).
- **Email** — TODO(template:security-report-email) `security@example.test`.

TODO(template:security-response-expectations) state what a reporter can expect: time to first response, time to
a fix or a decision, and whether you credit reporters. Promise only what you will
actually do — an unmet published SLA is worse than none.

## Supported versions

TODO(template:security-supported-versions) which versions get fixes. For a pre-1.0 project the honest answer
is usually "the latest release only" — say that rather than publishing a table
you will not maintain.

## What is enforced automatically

Automation, not policy prose. See
[`docs/decisions/000-ci-security-gates.md`](docs/decisions/000-ci-security-gates.md)
for why each one exists and what it alone misses.

- A **production** dependency with a known **high or above** advisory fails CI,
  on every PR and again on a weekly schedule. The gate
  ([`.github/scripts/vuln-gate.mjs`](.github/scripts/vuln-gate.mjs)) **fails
  closed**: unreadable input, an unrecognised report shape, an unknown severity
  or an unusable `--level` all block rather than pass.
- `dependency-review` checks the **diff** of a PR; CodeQL scans first-party
  source.
- Third-party GitHub Actions are pinned to a **full commit SHA**. A mutable tag
  means you review one thing and run another — this is a live attack shape, not
  a hypothetical.

## Muting an advisory

The only mute is a dated entry in
[`.github/security-exceptions.json`](.github/security-exceptions.json), with an
exact GHSA id and a **required** `expires` date. There is no permanent
allowlist, because an allowlist with no expiry is a hole nobody revisits.

Prefer, in order:

1. bump the package;
2. pin or override the patched transitive dependency;
3. only then an exception — with the reason naming the blocker and linking the
   PR or issue that will remove it.

The day after `expires`, the advisory blocks again **and** CI warns that the
entry is stale, so it gets deleted instead of lingering as dead config.

## What this repo does not hold

Secrets, provider deploy manifests, and concrete environment values live outside
this repo — see the **Deployment boundary** section of
[`AGENTS.md`](AGENTS.md). `*.example` files carry placeholders only; an example
file with a usable credential is the bug, not the convenience.

If a secret is ever committed, rotate it first and scrub history second. Scrubbing
alone leaves a live credential in every existing clone and in the pull-request
refs, which a force-push does not reach.
