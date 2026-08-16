# Template setup checklist

Work through this after cloning, then **delete this file**.

Every slot in the tree is tagged `TODO(template:<slug>)` and named by exactly one
item below, which carries a matching `<!-- template:<slug> -->` comment. List
what is left:

```bash
grep -rn 'TODO(template:[a-z0-9-]' .
```

The character class is load-bearing. Dropping it also matches the literal
`TODO(template:<slug>)` that this file, the README, ADR 002 and the guard's own
source use when *describing* the convention — eight lines of prose mixed in with
the real work.

`.github/scripts/template.test.mjs` enforces the correspondence **in both
directions**: a slot with no item fails, and an item pointing at a slot that no
longer exists fails. That is why the tags are worth the noise — the checklist's
only value is being complete, and nothing but a guard keeps it that way.

Two things the tags still cannot tell you:

- **Some items are repo settings** — branch protection, Dependabot alerts, code
  scanning — that no marker in the tree can represent. Finishing the grep is not
  finishing the setup.
- **A green guard means every slot is *mentioned*, not that you did it well.**
  Ticking without reading is still ticking without reading.

> **Why this exists.** `codeql.yml` shipped a `language:` matrix defaulting to
> `["actions"]` while this checklist named the file only for a repo setting. An
> adopter could tick every box and still have CodeQL passing green on every PR
> having never analysed a line of their application code. Tagging every slot
> found **nine more** of the same shape in `AGENTS.md` alone — sections nobody
> would have been told to fill in.

## 1. Identity

`AGENTS.md` is the brief every coding agent reads, and it carries more slots than
any other file — hence its own list. An unfilled section there is not cosmetic:
an agent treats a missing rule as "no rule", not as "ask someone".

- [ ] `AGENTS.md` — project name and the one-line description of what this is,
      the stack, and the datastore.
      <!-- template:agents-project-name --> <!-- template:agents-one-line -->
- [ ] `AGENTS.md` → `## Communicating` — how you want responses written.
      <!-- template:agents-communicating -->
- [ ] `AGENTS.md` → `## Layout` — the directory tree, **and** the dependency
      direction if the layout has one. An agent that does not know which way
      dependencies point will happily invert them.
      <!-- template:agents-layout --> <!-- template:agents-dependency-direction -->
- [ ] `AGENTS.md` → `## Conventions` — leave empty until a rule is earned. See
      *What NOT to do* at the bottom; an empty section here is honest.
      <!-- template:agents-conventions -->
- [ ] `AGENTS.md` → `## Secrets` — where real values live, and where the
      placeholder `*.example` files live. **Say that the examples are
      placeholders**, or someone will paste a working credential into one.
      <!-- template:agents-secrets -->
- [ ] `AGENTS.md` → `## Deployment boundary` — keep it if this repo deploys,
      delete the section if it does not. Leaving it in for a repo that never
      deploys trains readers to skip the section.
      <!-- template:agents-deployment-boundary -->
- [ ] `AGENTS.md` → the lock-file rule, if your ecosystem has lock files: a
      package add or bump commits the regenerated lock file **in the same
      commit**, or CI's locked-mode restore fails.
      <!-- template:agents-lockfile-rule -->
- [ ] `AGENTS.md` → `## Git / PR workflow` — the issue-tracker conventions and
      the documentation-sync rule: which files must be updated in the same PR as
      a user-visible change, and that a reviewer treats a missing doc update
      like a missing test.
      <!-- template:agents-issue-tracker --> <!-- template:agents-doc-sync -->
- [ ] `AGENTS.md` → `## Project context` — what phase the project is in and
      where the domain vocabulary is defined. This is what an agent reads to
      decide whether something is "not built yet" or "deliberately absent";
      without it, it will guess.
      <!-- template:agents-project-context -->
- [ ] `README.md` — replace this template's README with the project's.
- [ ] `CONTRIBUTING.md` — repo URL, branch prefixes if they differ.
- [ ] `CONTRIBUTING.md` → `## Tests` — state the expectation and which tiers run
      where.
      <!-- template:contributing-tests -->
- [ ] `.gitignore` — add your stack's ignores (this one covers only the basics).
      <!-- template:gitignore-stack -->
- [ ] `.gitattributes` — add your stack's binary/generated rules. **Leave
      `* text=auto eol=lf` alone**: `.githooks/*` are POSIX `sh`, and a CRLF
      checkout makes git look for an interpreter named `/bin/sh\r`, failing with
      a message that names neither the hook nor the cause.
      <!-- template:gitattributes-stack-rules -->
- [ ] `.editorconfig` — add your stack's indent overrides. It is a convenience,
      not a gate; nothing enforces it.
      <!-- template:editorconfig-overrides -->
- [ ] `SECURITY.md` — pick a reporting channel and delete the others, set the
      supported-versions answer, and say what a reporter can expect back.
      Promise only what you will actually do.
      <!-- template:security-report-channel -->
      <!-- template:security-response-expectations -->
      <!-- template:security-supported-versions -->
- [ ] **Replace `LICENSE` with your project's.** The one shipped here is MIT and
      covers *this template* — it is what lets you copy these files at all, not a
      recommendation for what you build. Two things follow:

      - a **public** repo with no `LICENSE` is all-rights-reserved, so pick one
        before you publish rather than after;
      - MIT asks that its notice be preserved in substantial copies. If you keep
        large parts of the scaffolding verbatim and that matters to you, keep the
        attribution; if it does not fit your project, say so with the template
        author rather than assuming.

## 2. Build and test

- [ ] `AGENTS.md` → `## Build / test / run` — the actual commands, plus any
      test tier deliberately excluded from the fast path and where it does run.
      <!-- template:agents-commands --> <!-- template:agents-test-tiers -->
- [ ] `.github/workflows/ci.yml` → the `build-and-test` job steps. The shipped
      placeholder **passes while this file exists and fails once you delete it**
      (step 7), so an un-set-up template is not permanently red and a set-up
      repo cannot ship a vacuously green build job.
      <!-- template:ci-overview --> <!-- template:ci-build-and-test -->
- [ ] `.githooks/pre-commit` → the per-stack blocks and their path filters.
      Keep it under ~2s. Anything slower belongs in CI.
      <!-- template:precommit-stack-blocks -->
- [ ] Install [`actionlint`](https://github.com/rhysd/actionlint) and
      [`shellcheck`](https://www.shellcheck.net) so the workflow/shell block in
      `pre-commit` actually runs. It **warns and continues** when they are
      missing, so those checks are genuinely optional — do not treat "the hook
      is enabled" as "the workflows are linted".

## 3. Releases

- [ ] `release-please-config.json` → `package-name`, `release-type`
      (`simple` | `node` | `python` | `rust` | `dotnet` | …),
      and `extra-files` if a version string is embedded anywhere.
- [ ] Decide the pre-1.0 policy. The shipped config damps `feat!:` to a **minor**
      and everything else to a **patch** below 1.0.0. That mapping **flips
      silently at 1.0.0** — reach 1.0.0 deliberately with a `Release-As: 1.0.0`
      commit footer, not by accident.
- [ ] `.release-please-manifest.json` + `version.txt` — leave at the initial
      version. **Never hand-edit them afterwards**; release-please owns both, and
      a manual edit desynchronises it from the tags that exist.
- [ ] `.github/workflows/release-please.yml` — set `bootstrap-sha` to your first
      commit, or drop the key to have it scan all history.
- [ ] If you publish container images: read
      [`docs/decisions/002-release-and-publish.md`](docs/decisions/002-release-and-publish.md)
      and add the publish/promote jobs. The template ships the reasoning, not the
      jobs, because they are registry-specific. Record in `AGENTS.md` what is
      published per merge and that promotion is a **retag of the reviewed bytes,
      never a rebuild**.
      <!-- template:release-publish-gate -->
      <!-- template:agents-publish-promotion -->

## 4. Security gates

- [ ] `.github/workflows/ci.yml` + `security-audit.yml` — enable the ecosystems
      you actually use; delete the rest. **`security-audit.yml`'s placeholder is
      keyed to this file exactly like `ci.yml`'s build step** (step 2): it warns
      while `TEMPLATE-SETUP.md` exists and fails once you delete it, so a fresh
      clone does not go red every Monday on a schedule nobody triggered. A guard
      in `.github/scripts/workflows.test.mjs` keeps the two behaving the same.
      <!-- template:ci-audit-ecosystems --> <!-- template:audit-steps -->
- [ ] `.github/scripts/vuln-gate.mjs` — if your ecosystem is not npm or NuGet,
      add a parser (see the `PARSERS` map and the comment above it).
      <!-- template:vuln-gate-parser -->
- [ ] `.github/dependabot.yml` — set the directories and ecosystems, and
      exclude from the grouped bump any action that holds write permissions and
      ships a bundled `dist/`, so its bumps arrive standalone.
      <!-- template:dependabot-ecosystems -->
      <!-- template:dependabot-action-exclusions -->
- [ ] **Dependabot alerts + Dependency graph.** One call does both — enabling
      alerts switches the graph on as a side effect:

      ```bash
      gh api -X PUT repos/<owner>/<repo>/vulnerability-alerts
      gh api repos/<owner>/<repo>/dependency-graph/sbom --silent -i | head -1   # want: 200
      ```

      The `dependency-review` job self-activates on the next run once the probe
      returns 200; until then it warns on every PR rather than passing silently.
      (`automated-security-fixes` is a separate choice — it opens fix PRs and has
      no bearing on the graph.)
- [ ] `.github/workflows/codeql.yml` → **the `language:` matrix**. It ships
      `["actions"]`, which scans your workflow files and **nothing else**. Leave
      it unset and CodeQL passes green on every PR having never looked at your
      application code — a gate that reads as safety while analysing none of what
      you ship. Add the languages you actually ship, e.g.
      `["actions", "csharp", "javascript-typescript"]`.
      <!-- template:codeql-languages -->
- [ ] `.github/workflows/codeql.yml` → **compiled languages need a build step**
      (`csharp`, `java`, `go`, `c-cpp`) between `init` and `analyze`. Carry the
      same `if: steps.scanning.outputs.available == 'true'` onto it, or the build
      runs against a skipped analysis and fails with no CodeQL database.
      <!-- template:codeql-compiled-build -->
- [ ] **Code scanning**, the repo setting `codeql.yml` needs. A **public** repo
      needs nothing here.
      A private repo needs GitHub Advanced Security; until then the job skips
      with a warning rather than failing the run for a setting no code change can
      fix. Do **not** reach for
      `PUT /repos/<owner>/<repo>/code-scanning/default-setup` — default setup
      conflicts with the advanced workflow this template ships and rejects its
      SARIF. If a repo already has default setup on, switch it to advanced
      (Settings → Code security → Code scanning → CodeQL → `…` → Switch to
      advanced) instead of running both.

## 5. Branch protection

- [ ] **First, check you can have it at all.** Branch protection is not
      available for a **private repo on the free plan** — the API answers
      `403 Upgrade to GitHub Pro or make this repository public`. Confirm with:

      ```bash
      gh api repos/<owner>/<repo>/branches/main/protection
      ```

      If it 403s, pick one deliberately and **write down which**: make the repo
      public, upgrade the plan, or accept that "do not commit to `main`" is a
      convention with nothing enforcing it. The third is a legitimate choice for
      a solo repo — but only if it is a choice. The failure is documenting
      protection you do not have, which is why `AGENTS.md` states the rule as an
      instruction rather than as a fact about the repo.
- [ ] Protect `main`: require a PR, require the CI checks, disallow force-push.
- [ ] Decide the review requirement. **Zero required approvals means a single
      account can merge a change to `.github/workflows/` and every gate in this
      repo trusts it.** Nothing inside the repo can close that; only branch
      protection can — and where protection is unavailable, nothing closes it at
      all.
- [ ] `.github/CODEOWNERS` — uncomment the rules and replace `@OWNER` with a real
      user or `@org/team` **with write access**, then tick branch protection's
      **"Require review from Code Owners"**. Both halves are needed: an entry
      that does not resolve is silently ignored by GitHub, and without the tick
      the file only suggests reviewers. Verify by opening a PR that touches
      `.github/` and confirming the owner is auto-requested.

      **Leave it commented out in either of these cases**, which is most repos:

      - the step above 403'd, so there is no tick to make;
      - **you are the only owner.** Nobody can approve their own PR, so a solo
        CODEOWNERS plus "Require review from Code Owners" means every PR you
        open needs an approval that cannot exist — you either never merge, or
        you keep an admin bypass and the requirement means nothing. Going public
        does not fix this; **a second person with write access** does.

      Shipping a file that looks like a control and is not one is the failure
      here, not the missing control itself.
      <!-- template:codeowners-setup -->
- [ ] `.github/pull_request_template.md` — prune the checklist to the rules this
      repo actually enforces. A box nobody can fail teaches people to tick
      without reading.
- [ ] Squash-merge on; set the squash title source to the PR title (see the
      commit-message note in `CONTRIBUTING.md`).

## 6. Hooks

- [ ] Tell contributors to run `git config core.hooksPath .githooks` once per
      clone (it is in `CONTRIBUTING.md`). Hooks are opt-in by design — a hook
      nobody can skip is a hook people work around.

## 7. First ADR

- [ ] Write `docs/decisions/003-<something>.md` for the first non-obvious choice
      you make. If you cannot think of one yet, that is fine — do not invent one.

## What NOT to do

- Do not pre-fill `AGENTS.md`'s Conventions section with rules you have not
  needed. An unearned rule is indistinguishable from a live one and costs the
  same to read.
- Do not add a CI job "because it is good practice". Every job is billed per run
  and read by a human on every red. Add it when something it would have caught
  actually happens.
