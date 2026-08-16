# AGENTS.md — TODO(template:agents-project-name) project name

TODO(template:agents-one-line) one line: what this is, the stack, the datastore.

This file is the shared brief for any coding agent (Claude Code, Codex, Cursor,
…). `CLAUDE.md` is a one-line include of it, so there is exactly one copy.

> **How to maintain this file.** Every bullet below should be a rule someone
> needed. When a defect ships, add the rule **and cite the incident** — the
> citation is what stops a later reader from deleting it as obvious. Keep the
> resident version to the rule plus the one-line consequence of breaking it, and
> put the narrative in [`docs/decisions/`](docs/decisions/) with a `→` link. An
> empty section here is honest; a section full of generic advice is not.

## Communicating

TODO(template:agents-communicating) how you want responses. A starting point:

Keep explanations clear and human-sounding. Lead with the action or the answer;
skip preambles and recaps.

## Layout

```
TODO(template:agents-layout)
src/          ...
tests/        ...
docs/         decisions (ADRs), runbooks
```

TODO(template:agents-dependency-direction) state the dependency direction if the layout has one, e.g.
"dependencies point inward: Api → Application → Domain; Domain depends on
nothing."

## Build / test / run

```bash
TODO(template:agents-commands) build
TODO(template:agents-commands) test          # note anything that needs Docker/network/a DB
TODO(template:agents-commands) run locally
```

TODO(template:agents-test-tiers) note any test tier that is deliberately excluded from the fast
path, and where it does run instead.

## Conventions

> Empty on purpose. Each bullet here should name a rule, the one-line
> consequence of breaking it, and — once there is one — the incident that earned
> it. Add them as you learn them.

- **TODO(template:agents-conventions)** — e.g. error handling: exceptions vs a `Result` type, and
  which failures are "expected".
- **TODO(template:agents-conventions)** — e.g. how a request is validated, and where.
- **TODO(template:agents-conventions)** — e.g. what a new database migration must and must not do.

## Secrets — never commit

- TODO(template:agents-secrets) where real values live (env file, secret store, `user-secrets`).
- TODO(template:agents-secrets) where placeholders live (`*.example`), and that they are
  placeholders — an example file must never carry a usable credential.
- No hardcoded passwords or keys in source, **including tests**. Generate test
  credentials at runtime; secret scanners flag literals in test files too, and
  they flag them on *removal* as well as on addition.

## Deployment boundary

This repo is **host-portable**: it must build and run against any host without
carrying provider-specific config. Every environment-specific value comes from
config or the environment, and nothing in here names or branches on a hosting
provider.

- **Stays here** — the Dockerfile and its `HEALTHCHECK`, a reference compose
  stack, health endpoints, one-shot CLI verbs (`migrate`, `healthcheck`, …),
  `*.env.example`, and docs that state *requirements* ("needs a trusted-proxy
  list", "needs TLS to the database").
- **Does not belong here** — provider deploy manifests, IaC, CDN/DNS/edge
  config, secret-store wiring, provider-named runbooks, and the concrete
  environment *values* (proxy CIDRs, CA bundles, connection URLs). Those go to a
  separate deployment/ops repo.

Reviewers: treat a hardcoded provider name in code, config, or a committed doc
like a missing test — flag it.

TODO(template:agents-deployment-boundary) delete this section if the repo is not deployed.

## Writing a guard (a test that asserts an invariant)

A guard is a test whose job is to *fail* when someone later does the wrong
thing — a frozen-migration check, a "no endpoint reads the body twice" check, a
pinned digest. **A wrong guard is worse than no guard, because it reads as
safety.** Full rules and the incidents behind them:
[`docs/decisions/001-writing-a-guard.md`](docs/decisions/001-writing-a-guard.md).
In brief:

- **Run an adversarial pass before the first push** — mutation checks, or a
  second agent handed the diff and told to *refute* it.
- **Mutation first, claim second** — never write "this catches X" before running
  the mutation that makes the guard go red.
- **Two misses of the same shape mean the METHOD is wrong** — prefer "walk
  everything, exclude deliberately" over "list what I thought of".
- **For a pinned/golden value, prove portability** — repetition on one machine
  cannot detect environment leakage. Assert the generated content names no
  absolute paths.
- **Prefer the boring guard** — complexity costs double when the complicated
  thing is the thing you are trusting.

## Pre-commit hooks (opt-in)

`git config core.hooksPath .githooks` enables a fast `pre-commit` (path-filtered
unit tests / typecheck) and a `commit-msg` check that keeps the message
parseable by release-please. Slow tiers are deliberately excluded — CI is the
authority. Skip once with `--no-verify` or `SKIP_HOOKS=1`.

`pre-commit` also runs **actionlint** on changed workflows and **shellcheck** on
changed shell, because neither has a compiler and a red CI run minutes later is
the alternative. Both **warn and continue when not installed** — they are not
repo dependencies, so "the hook is enabled" does not mean "the workflows are
linted".

## CI security gates

CI fails a PR when a **production** dependency carries a known **high+**
advisory. Both audit gates run through
[`.github/scripts/vuln-gate.mjs`](.github/scripts/vuln-gate.mjs) and **fail
closed**; the only mute is a dated entry in
[`.github/security-exceptions.json`](.github/security-exceptions.json) (exact
GHSA id, required `expires`). Plus dependency-review on the PR diff, CodeQL
(advisory), and a weekly scheduled audit.

**Pin third-party Actions to a full commit SHA** with a trailing `# vX.Y.Z`
comment — **never a mutable tag**. Tag-retargeting is a live supply-chain attack
shape (`tj-actions/changed-files`, 2025-03; `aquasecurity/trivy-action`,
2026-03), and a mutable tag means you review one thing and run another.
`actions/*` and `github/*` may keep major-version tags.

TODO(template:agents-lockfile-rule) if your ecosystem uses lock files, state here that a package
add/bump must commit the regenerated lock file **in the same commit**, or CI's
locked-mode restore fails.

None of those gates covers a merge to `main` that changes the workflows
themselves — after it, every gate runs exactly as the modified file says.
[`.github/CODEOWNERS`](.github/CODEOWNERS) plus branch protection's *"Require
review from Code Owners"* is the only lever the repo has on that, and it ships
**inert**: an entry naming an unresolvable user is silently ignored, which is a
guard that reads as safety while checking nothing.

Reporting policy and the exception process: [`SECURITY.md`](SECURITY.md).
Rationale: [`docs/decisions/000-ci-security-gates.md`](docs/decisions/000-ci-security-gates.md).

## Releases

Conventional commits drive the version and the changelog via release-please.
Invariants — the mechanism is in
[`docs/decisions/002-release-and-publish.md`](docs/decisions/002-release-and-publish.md):

- **The PR title is the release note.** It becomes the squashed commit subject,
  which is what release-please parses for both the changelog and the bump — so a
  typo'd or non-conventional prefix silently costs a bump.
- **A commit-body parse error drops the whole commit** — no changelog entry, no
  bump, green run. Concretely: **never start a body line with `word(` that has
  another `(` inside it**. `.githooks/commit-msg` catches this in a local commit;
  a multi-commit PR's subject comes from the PR title, which no local hook sees.
- **Below 1.0.0 the bump is damped** (`feat!:` → minor, everything else →
  patch). The mapping **flips silently at 1.0.0** — get there deliberately with
  a `Release-As:` footer.
- **Never hand-edit `.release-please-manifest.json` or `version.txt`.**

TODO(template:agents-publish-promotion) if you publish artifacts, add: what is published per merge, what
promotion means, and that promotion is a **retag of the reviewed bytes, never a
rebuild**.

## Git / PR workflow

- **Never commit to `main`** — branch, push, open a PR. Hold this as a rule
  whether or not branch protection is switched on: GitHub does not offer
  protection for a **private repo on the free plan** (the API answers `403
  Upgrade to GitHub Pro or make this repository public`), so on many repos the
  rule is the only thing enforcing it. Do not read a successful push to `main`
  as permission.
- Branch names: `feat/…`, `fix/…`, `chore/…`, `docs/…`. PRs squash-merge.
- Only commit or push when the human asks.
- TODO(template:agents-issue-tracker) issue-tracker conventions: which tracker is authoritative,
  whether slices go on an epic checklist, milestone rules.
- TODO(template:agents-doc-sync) documentation-sync rule: name the files that must be updated in
  the same PR as a user-visible change (a glossary, an in-app help page), and
  say that a reviewer treats a missing doc update like a missing test.

## Project context

TODO(template:agents-project-context) what phase the project is in, what is shipped, what is next, and
where the domain vocabulary is defined. Agents read this to decide whether a
thing is "not built yet" or "deliberately absent".
