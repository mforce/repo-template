# Security policy

## Reporting a vulnerability

**Do not open a public issue** — that hands a working exploit to everyone reading
the tracker before the fix ships.

TODO(template) pick one channel and delete the other:

- **GitHub private vulnerability reporting** — repo → Security → Report a
  vulnerability. Preferred: no shared mailbox, and it gives a private fork to fix
  in. Enable it once under Settings → Advanced Security.
- **Email** — TODO(template) `security@example.test`.

TODO(template) what a reporter can expect: time to first response, time to a fix
or a decision, and whether you credit reporters. Promise only what you will do —
an unmet published SLA is worse than none.

## Supported versions

TODO(template) which versions get fixes. Pre-1.0, the honest answer is usually
"the latest release only" — say that rather than publishing a table you will not
maintain.

## What is enforced automatically

→ [`000-ci-security-gates.md`](docs/decisions/000-ci-security-gates.md) for why
each exists and what it alone misses.

- A dependency with a **high or above** advisory fails CI, on every PR and again
  weekly — **once the audit steps in `ci.yml` and `security-audit.yml` are filled
  in**, which the template ships commented out. npm is scoped to production via
  `--omit=dev`; the NuGet audit covers the full tree. The gate
  ([`vuln-gate.mjs`](.github/scripts/vuln-gate.mjs)) **fails closed**: unreadable
  input, an unrecognised report shape, an unknown severity or an unusable
  `--level` all block rather than pass.
- `dependency-review` checks the PR **diff**; CodeQL scans first-party source.
- Third-party Actions are pinned to a **full commit SHA**. A mutable tag means
  you review one thing and run another — a live attack shape, not a hypothetical.

## Muting an advisory

The only mute is a dated entry in
[`security-exceptions.json`](.github/security-exceptions.json), with an exact
GHSA id and a **required** `expires`. An allowlist with no expiry is a hole
nobody revisits.

Prefer, in order: bump the package → pin or override the patched transitive →
only then an exception, naming the blocker and linking the PR that removes it.

The day after `expires`, the advisory blocks again **and** CI warns the entry is
stale, so it gets deleted rather than lingering as dead config.

## What this repo does not hold

Secrets, provider manifests and concrete environment values live elsewhere — see
**Deployment boundary** in [`AGENTS.md`](AGENTS.md). `*.example` files carry
placeholders only.

If a secret is committed, **rotate first, scrub second**. Scrubbing alone leaves
a live credential in every existing clone and in the pull-request refs, which a
force-push does not reach.
