# AGENTS.md — TODO(template) project name

TODO(template) one line: what this is, the stack, the datastore.

Shared brief for any coding agent. `CLAUDE.md` is a one-line include, so there is
exactly one copy.

> **Maintaining this file.** Every bullet should be a rule someone needed. Add
> the rule **and cite the incident** — the citation is what stops a later reader
> deleting it as obvious. Keep it to the rule plus its one-line consequence; the
> narrative goes in [`docs/decisions/`](docs/decisions/). An empty section is
> honest; generic advice is not.

## Communicating

TODO(template) how you want responses. Starting point: lead with the answer, skip
preambles and recaps.

## Layout

```
TODO(template)
src/          ...
tests/        ...
docs/         decisions (ADRs), runbooks
```

TODO(template) the dependency direction, if the layout has one — e.g.
"Api → Application → Domain; Domain depends on nothing."

## Build / test / run

```bash
TODO(template) build
TODO(template) test          # note anything needing Docker/network/a DB
TODO(template) run locally
```

TODO(template) any test tier excluded from the fast path, and where it runs.

## Conventions

> Empty on purpose. Each bullet names a rule, its one-line consequence, and the
> incident that earned it.

- **TODO(template)** — e.g. exceptions vs a `Result` type, and which failures are
  "expected".
- **TODO(template)** — e.g. how a request is validated, and where.
- **TODO(template)** — e.g. what a migration must and must not do.

## Secrets — never commit

- TODO(template) where real values live (env file, secret store, `user-secrets`).
- TODO(template) where `*.example` placeholders live. An example file must never
  carry a usable credential.
- No hardcoded credentials in source, **including tests**. Scanners flag literals
  in test files, and flag them on *removal* too.

## Deployment boundary

Host-portable: builds and runs against any host, with every environment-specific
value coming from config. Nothing here names or branches on a hosting provider.

- **Stays** — Dockerfile + `HEALTHCHECK`, reference compose stack, health
  endpoints, one-shot CLI verbs, `*.env.example`, docs stating *requirements*.
- **Goes to the ops repo** — provider manifests, IaC, CDN/DNS config,
  secret-store wiring, and concrete values (CIDRs, CA bundles, connection URLs).

Reviewers: a hardcoded provider name is a blocker, like a missing test.

TODO(template) delete this section if the repo is not deployed.

## Writing a guard

A guard is a test whose job is to *fail* when someone later does the wrong thing.
**A wrong guard is worse than none, because it reads as safety.**
→ [`001-writing-a-guard.md`](docs/decisions/001-writing-a-guard.md)

- **Adversarial pass before the first push** — mutation checks, or a second agent
  told to *refute* the guard.
- **Mutation first, claim second** — never write "this catches X" before the
  mutation makes it go red.
- **Two misses of the same shape mean the METHOD is wrong** — walk everything and
  exclude deliberately, rather than listing what you thought of.
- **Enumerate the states your subject passes through** and say what the guard
  does in each. A state where someone sees red with no action means it is wrong.
  → [`003`](docs/decisions/003-the-checklist-guard-that-was-withdrawn.md)
- **For a pinned value, prove portability** — repetition on one machine cannot
  detect environment leakage.
- **Prefer the boring guard.**

## Pre-commit hooks (opt-in)

`git config core.hooksPath .githooks` enables a fast `pre-commit` and a
`commit-msg` check. Skip with `--no-verify` or `SKIP_HOOKS=1`. Slow tiers are
excluded — CI is the authority.

`pre-commit` also runs **actionlint** and **shellcheck** on changed workflows and
shell. Both **warn and continue when not installed**, so "the hook is enabled"
does not mean "the workflows are linted".

## CI security gates

CI fails a PR when a **production** dependency carries a known **high+** advisory.
Both audit gates run through
[`vuln-gate.mjs`](.github/scripts/vuln-gate.mjs) and **fail closed**; the only
mute is a dated entry in
[`security-exceptions.json`](.github/security-exceptions.json) with an exact GHSA
id and a required `expires`. Plus dependency-review on the diff, CodeQL
(**advisory** — deliberately not a merge gate), and a weekly audit.

**Pin third-party Actions to a full commit SHA**, never a mutable tag —
tag-retargeting is live (`tj-actions/changed-files` 2025-03,
`aquasecurity/trivy-action` 2026-03) and means you review one thing and run
another. `actions/*` and `github/*` may keep major tags.

No gate covers a merge to `main` that changes the workflows themselves.
[`CODEOWNERS`](.github/CODEOWNERS) plus "Require review from Code Owners" is the
only lever, and it ships inert.

TODO(template) if your ecosystem has lock files: a package add or bump commits
the regenerated lock file **in the same commit**, or locked-mode restore fails.

→ [`SECURITY.md`](SECURITY.md) for reporting,
[`000`](docs/decisions/000-ci-security-gates.md) for rationale.

## Releases

Conventional commits drive the version and changelog via release-please.
→ [`002-release-and-publish.md`](docs/decisions/002-release-and-publish.md)

- **The PR title is the release note.** It becomes the squashed subject that
  release-please parses, so a non-conventional prefix silently costs the bump.
- **A commit-body parse error drops the whole commit** — no entry, no bump, green
  run. Never start a body line with `word(` containing another `(` before the
  **first** `)` — `foo(bar(baz))` breaks, `foo(bar)(baz)` does not.
  `.githooks/commit-msg` catches this locally; nothing sees the PR title.
- **Below 1.0.0 the bump is damped** (`feat!:` → minor, else patch) and **flips
  silently at 1.0.0**. Get there deliberately with a `Release-As:` footer.
- **Never hand-edit `.release-please-manifest.json` or `version.txt`.**

TODO(template) if you publish artifacts: what ships per merge, what promotion
means, and that promotion is a **retag of the reviewed bytes, never a rebuild**.

## Git / PR workflow

- **Never commit to `main`.** Hold this whether or not branch protection is on —
  it is unavailable on a private free-plan repo (`403`), so the rule is often the
  only thing enforcing it. A successful push is not permission.
- Branches: `feat/…`, `fix/…`, `chore/…`, `docs/…`. PRs squash-merge.
- Only commit or push when the human asks.
- TODO(template) issue-tracker conventions: which tracker is authoritative,
  epic/milestone rules.
- TODO(template) documentation-sync rule: which files must be updated in the same
  PR as a user-visible change, and that a reviewer treats a missing doc update
  like a missing test.

## Project context

TODO(template) what phase the project is in, what ships next, and where the
domain vocabulary lives. Agents read this to tell "not built yet" from
"deliberately absent".
