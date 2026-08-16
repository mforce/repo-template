# Contributing

## Once per clone

```bash
git config core.hooksPath .githooks
```

Enables a fast `pre-commit` (path-filtered checks) and a `commit-msg` check that
keeps the message parseable by the release tooling. Both are skippable with
`--no-verify` or `SKIP_HOOKS=1` — on purpose. A hook nobody can skip is a hook
people route around.

Optional, and worth it if you touch workflows or shell:

```bash
# actionlint — https://github.com/rhysd/actionlint
# shellcheck — https://www.shellcheck.net
```

`pre-commit` runs them on the files you changed and **warns instead of failing
when they are missing**, so nothing breaks without them — you just do not get
the check.

## Branches and PRs

- Never commit to `main`. Branch, push, open a PR — whether or not branch
  protection is actually switched on (a private repo on the free plan cannot
  have it). A push to `main` succeeding does not mean it was allowed.
- Branch names: `feat/…`, `fix/…`, `chore/…`, `docs/…`.
- PRs squash-merge.
- The PR body is prefilled from
  [`.github/pull_request_template.md`](.github/pull_request_template.md). Delete
  the checklist lines that do not apply rather than ticking them — a box nobody
  can fail teaches people to tick without reading.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/). The type decides
the version bump and the changelog section:

```
feat(scope): add a thing          → minor (or patch below 1.0.0)
fix(scope): stop doing a thing    → patch
docs|chore|test|ci|build|style    → patch, hidden from the changelog
feat!: ... / BREAKING CHANGE:     → major (damped to minor below 1.0.0)
```

Two traps, both of which produce a **green run with no release entry**:

1. **The PR title is the release note.** For a multi-commit PR, the squashed
   subject comes from the PR title — which no local hook can see. A
   non-conventional title silently costs the bump.
2. **A body line that starts with `word(` and contains another `(` before the
   closing `)` breaks the commit parser**, and a commit that fails to parse is
   *dropped entirely* — no changelog entry, no bump, and the release workflow
   still reports success. Indent the line, make it a list item, or put a word in
   front of it:

   ```
   Assert.Single(AllMigrations())      ← breaks the parser
     Assert.Single(AllMigrations())    ← fine (indented)
   - Assert.Single(AllMigrations())    ← fine (list item)
   see Assert.Single(AllMigrations())  ← fine (word in front)
   ```

   `.githooks/commit-msg` catches this locally.

## Tests

TODO(template) state the expectation, e.g. "every change to `src/` ships with
tests in the same PR", and which tiers run where.

## Reviewing

Treat these like a missing test and block on them:

- a hardcoded credential, in application code **or** test code;
- a hardcoded hosting-provider name in code, config, or a committed doc;
- a third-party GitHub Action pinned to a tag rather than a full commit SHA;
- a user-visible change with no matching documentation update.

## Dependencies

- A package add or bump must commit the regenerated lock file **in the same
  commit** — CI restores in locked mode and a stale lock fails the run.
- A known-vulnerable production dependency fails CI. The only mute is a dated
  entry in [`.github/security-exceptions.json`](.github/security-exceptions.json);
  prefer, in order: bump the package → pin/override the patched transitive →
  only then an exception, with the unblocking PR linked in the reason.
