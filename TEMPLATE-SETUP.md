# Template setup checklist

Work through this after cloning, then **delete this file**.

`grep -rn 'TODO(template)' .` lists the markers in the tree. It is not the whole
checklist — some items are repo settings no marker can represent, and one file
can carry several markers. **Read every marker in a file you touch**, not just
the one you came for: `codeql.yml` shipped a `language:` matrix defaulting to
`["actions"]`, which would let you tick every box with CodeQL analysing none of
your application code. Nothing enforces this — an automated version was tried and
withdrawn.
→ [`003`](docs/decisions/003-the-checklist-guard-that-was-withdrawn.md)

## 1. Identity

- [ ] `AGENTS.md` — name, one-line description, stack, `## Layout`.
- [ ] `README.md` — replace with the project's.
- [ ] `CONTRIBUTING.md` — repo URL, branch prefixes if they differ.
- [ ] `.gitignore` — your stack's ignores.
- [ ] `.gitattributes` — your stack's binary/generated rules. **Leave
      `* text=auto eol=lf`**: the hooks are POSIX `sh`, and a CRLF checkout makes
      git look for `/bin/sh\r`, failing with a message that names neither the
      hook nor the cause.
- [ ] `.editorconfig` — your indent overrides. A convenience, not a gate.
- [ ] `SECURITY.md` — pick one reporting channel, delete the rest, set the
      supported-versions answer. Promise only what you will do.
- [ ] **Replace `LICENSE`.** The shipped MIT covers *this template* — it is what
      lets you copy these files, not a recommendation. A public repo with no
      LICENSE is all-rights-reserved, so pick one before publishing. MIT asks its
      notice be preserved in substantial copies: if you keep much of the
      scaffolding verbatim, carry the attribution separately rather than deleting
      the only copy of it.

## 2. Build and test

- [ ] `AGENTS.md` → `## Build / test / run`.
- [ ] `.github/workflows/ci.yml` → the `build-and-test` steps. The placeholder
      **passes while this file exists and fails once you delete it**, so an
      un-set-up template is not permanently red and a set-up repo cannot ship a
      vacuously green build.
- [ ] `.githooks/pre-commit` → per-stack blocks and path filters. Under ~2s;
      anything slower belongs in CI.
- [ ] Install [`actionlint`](https://github.com/rhysd/actionlint) and
      [`shellcheck`](https://www.shellcheck.net). The hook **warns and continues**
      without them, so "the hook is enabled" ≠ "the workflows are linted".

## 3. Releases

- [ ] `release-please-config.json` → `package-name`, `release-type`, and
      `extra-files` if a version string is embedded anywhere. Keep `package-name`
      free of `:` — release-please derives its release-PR branch from it, and an
      invalid ref stops the release PR being created.
- [ ] Decide the pre-1.0 policy. The shipped config damps `feat!:` to **minor**
      and everything else to **patch**, and that mapping **flips silently at
      1.0.0**. Get there deliberately with a `Release-As: 1.0.0` footer.
- [ ] `.release-please-manifest.json` + `version.txt` — leave at the initial
      version and **never hand-edit them**; release-please owns both.
- [ ] Publishing images? → [`002`](docs/decisions/002-release-and-publish.md),
      then add the publish/promote jobs. The template ships the reasoning, not
      the jobs, because they are registry-specific.

## 4. Security gates

- [ ] `ci.yml` + `security-audit.yml` — enable the ecosystems you use, delete the
      rest. `security-audit.yml`'s placeholder is keyed to this file like
      `ci.yml`'s, so a fresh clone does not go red every Monday.
      `workflows.test.mjs` keeps the two consistent.
- [ ] `.github/scripts/vuln-gate.mjs` — add a parser if your ecosystem is not npm
      or NuGet (see the `PARSERS` map).
- [ ] `.github/dependabot.yml` — directories and ecosystems.
- [ ] **Dependabot alerts + Dependency graph.** Enabling alerts switches the
      graph on as a side effect:

      ```bash
      gh api -X PUT repos/<owner>/<repo>/vulnerability-alerts
      gh api repos/<owner>/<repo>/dependency-graph/sbom --silent -i | head -1   # want 200
      ```

      `dependency-review` self-activates on the next run once the probe returns
      200; until then it warns rather than passing silently.
- [ ] `codeql.yml` → **the `language:` matrix**. It ships `["actions"]`, which
      scans workflow files and **nothing else** — leave it and CodeQL passes
      green having never looked at your code. e.g.
      `["actions", "csharp", "javascript-typescript"]`.
- [ ] `codeql.yml` → **compiled languages need a build step** (`csharp`, `java`,
      `go`, `c-cpp`) between `init` and `analyze`, carrying the same
      `if: steps.scanning.outputs.available == 'true'`.
- [ ] **Code scanning.** A public repo needs nothing; a private one needs GHAS,
      and until then the job skips with a warning. Do **not** enable
      `code-scanning/default-setup` — it conflicts with the advanced workflow
      shipped here and rejects its SARIF. If already on, switch it to advanced
      (Settings → Code security → Code scanning → CodeQL → `…` → Switch to
      advanced) rather than running both.

## 5. Branch protection

- [ ] **Check you can have it.** `gh api repos/<owner>/<repo>/branches/main/protection`
      answers `403` on a private free-plan repo. If it does, choose deliberately
      and write down which: go public, upgrade, or accept that "never commit to
      `main`" is a convention with nothing behind it. The failure is documenting
      protection you do not have.
- [ ] Protect `main`: require a PR and the CI checks, disallow force-push.
- [ ] Decide the review requirement. **Zero required approvals means one account
      can merge a change to `.github/workflows/` and every gate trusts it.**
- [ ] `.github/CODEOWNERS` — activate only if you can tick "Require review from
      Code Owners" **and** a second person has write access. Nobody can approve
      their own PR, so a solo entry is a deadlock or a bypass. Leave it commented
      otherwise; a file that looks like a control and is not one is the failure.
- [ ] `.github/pull_request_template.md` — prune to the rules you enforce. A box
      nobody can fail teaches people to tick without reading.
- [ ] Squash-merge on, with the squash title taken from the PR title.

## 6. Hooks

- [ ] Tell contributors to run `git config core.hooksPath .githooks` once per
      clone. Opt-in by design — a hook nobody can skip gets worked around.

## 7. First ADR

- [ ] Write `docs/decisions/004-<something>.md` for your first non-obvious
      choice. If you cannot think of one, do not invent one.

## What NOT to do

- Do not pre-fill `AGENTS.md`'s Conventions with rules you have not needed. An
  unearned rule reads exactly like a live one.
- Do not add a CI job "because it is good practice". Add it when something it
  would have caught actually happens.
