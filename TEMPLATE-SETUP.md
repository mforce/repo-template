# Template setup checklist

Work through this after cloning, then **delete this file**. Every item
corresponds to a `TODO(template)` marker in the tree — `grep -rn 'TODO(template)' .`
finds the ones you have not done.

## 1. Identity

- [ ] `AGENTS.md` — project name, one-line description, stack, `## Layout` tree.
- [ ] `README.md` — replace this template's README with the project's.
- [ ] `CONTRIBUTING.md` — repo URL, branch prefixes if they differ.
- [ ] `.gitignore` — add your stack's ignores (this one covers only the basics).

## 2. Build and test

- [ ] `AGENTS.md` → `## Build / test / run` — the actual commands.
- [ ] `.github/workflows/ci.yml` → the `build-and-test` job steps. The shipped
      placeholder **passes while this file exists and fails once you delete it**
      (step 7), so an un-set-up template is not permanently red and a set-up
      repo cannot ship a vacuously green build job.
- [ ] `.githooks/pre-commit` → the per-stack blocks and their path filters.
  Keep it under ~2s. Anything slower belongs in CI.

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
      jobs, because they are registry-specific.

## 4. Security gates

- [ ] `.github/workflows/ci.yml` + `security-audit.yml` — enable the ecosystems
      you actually use; delete the rest.
- [ ] `.github/scripts/vuln-gate.mjs` — if your ecosystem is not npm or NuGet,
      add a parser (see the `PARSERS` map and the comment above it).
- [ ] `.github/dependabot.yml` — set the directories and ecosystems.
- [ ] Repo settings → **Advanced Security → Dependency graph: on**. The
      `dependency-review` job self-activates once it is; until then it warns on
      every PR rather than passing silently.
- [ ] Repo settings → **Advanced Security → Code scanning: on**. `codeql.yml`
      behaves the same way — it skips with a warning until the toggle is on,
      rather than failing the run for a setting no code change can fix.
- [ ] Repo settings → **Dependabot alerts: on**.

## 5. Branch protection

- [ ] Protect `main`: require a PR, require the CI checks, disallow force-push.
- [ ] Decide the review requirement. **Zero required approvals means a single
      account can merge a change to `.github/workflows/` and every gate in this
      repo trusts it.** Nothing inside the repo can close that; only branch
      protection can.
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
