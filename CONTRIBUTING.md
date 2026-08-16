# Contributing

## Once per clone

```bash
git config core.hooksPath .githooks
```

Enables `pre-commit` (fast, path-filtered) and `commit-msg`. Both are skippable
with `--no-verify` or `SKIP_HOOKS=1`, on purpose — a hook nobody can skip gets
routed around.

Optional if you touch workflows or shell: install
[`actionlint`](https://github.com/rhysd/actionlint) and
[`shellcheck`](https://www.shellcheck.net). `pre-commit` **warns instead of
failing** when they are missing, so you just do not get the check.

## Branches and PRs

- Never commit to `main`, whether or not branch protection is switched on (a
  private free-plan repo cannot have it). A push succeeding is not permission.
- Branches: `feat/…`, `fix/…`, `chore/…`, `docs/…`. PRs squash-merge.
- The PR body is prefilled from
  [`pull_request_template.md`](.github/pull_request_template.md). Delete lines
  that do not apply rather than ticking them.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/) — the type decides
the bump and the changelog section:

```
feat(scope): add a thing          → minor (patch below 1.0.0)
fix(scope): stop doing a thing    → patch
docs|chore|test|ci|build|style    → patch, hidden from the changelog
feat!: … / BREAKING CHANGE:       → major (minor below 1.0.0)
```

Two traps, both producing a **green run with no release entry**:

1. **The PR title is the release note.** On a multi-commit PR the squashed
   subject comes from it, and no local hook can see it. A non-conventional title
   silently costs the bump.
2. **A body line starting with `word(` that contains another `(` before the
   first `)`** breaks the parser, and an unparseable commit is *dropped
   entirely*. (`foo(bar(baz))` breaks; `foo(bar)(baz)` is fine.) Indent it, make
   it a list item, or put a word in front:

   ```
   Assert.Single(AllMigrations())      ← breaks the parser
     Assert.Single(AllMigrations())    ← fine (indented)
   - Assert.Single(AllMigrations())    ← fine (list item)
   see Assert.Single(AllMigrations())  ← fine (word in front)
   ```

   `.githooks/commit-msg` catches this locally.

## Tests

TODO(template) the expectation — e.g. "every change to `src/` ships with tests in
the same PR" — and which tiers run where.

## Reviewing

Block on these like a missing test:

- a hardcoded credential, in application **or** test code;
- a hardcoded hosting-provider name in code, config, or a committed doc;
- a third-party Action pinned to a tag rather than a full commit SHA;
- a user-visible change with no matching doc update.

## Dependencies

- A package add or bump commits the regenerated lock file **in the same commit** —
  CI restores in locked mode.
- A known-vulnerable dependency fails CI, once the audit steps are filled in (the
  template ships them commented out). The only mute is a dated
  entry in [`security-exceptions.json`](.github/security-exceptions.json). Prefer,
  in order: bump the package → pin the patched transitive → an exception, with
  the unblocking PR linked in the reason.
