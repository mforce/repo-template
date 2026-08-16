<!--
The PR TITLE is the release note. Squash-merge takes the merged commit subject
from it, and that subject is what release-please parses for both the changelog
and the version bump — so a non-conventional or typo'd prefix silently costs the
bump, with a green run and no sign anything went wrong. No local hook can see
the PR title.

    feat(scope): …   fix(scope): …   docs|chore|test|ci|build|style(scope): …
    feat!: …  or a BREAKING CHANGE: footer for a breaking change
-->

## What and why

<!-- What changed, and the problem it solves. Link the issue. -->

## How it was verified

<!--
Commands run and what they printed — not "tests pass". If a guard was added or
changed, state the mutation you ran and which named test went red. See
docs/decisions/001-writing-a-guard.md: a claim of coverage written before the
mutation is the failure mode that document exists for.
-->

## Checklist

Delete any line that does not apply — an inapplicable ticked box is noise.

- [ ] The **PR title** is a conventional commit, and is the release note I want.
- [ ] Tests cover the change, and I watched the new ones fail first.
- [ ] Any new guard was **mutation-checked**: green baseline, mutant red on that
      guard's own named assertion, baseline green again after restoring.
- [ ] Docs updated in this PR — a user-visible change with no doc update is
      treated like a missing test.
- [ ] A non-obvious decision is recorded in `docs/decisions/`, or there is none.
- [ ] No hardcoded credential, in application code **or** test code. Secret
      scanners flag literals in tests, and flag them on removal too.
- [ ] No hardcoded hosting-provider name in code, config, or a committed doc
      (see the Deployment boundary section of `AGENTS.md`).
- [ ] Any new third-party GitHub Action is pinned to a **full commit SHA** with a
      trailing `# vX.Y.Z` comment, never a mutable tag.
- [ ] A package add or bump commits the regenerated lock file **in the same
      commit** — CI restores in locked mode.
