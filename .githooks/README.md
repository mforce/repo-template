# .githooks

Opt-in git hooks. Enable once per clone:

```bash
git config core.hooksPath .githooks
```

| Hook | What it does | Cost |
|---|---|---|
| `commit-msg` | Rejects a message release-please cannot parse — a bad subject, or a body line that breaks the parser and silently drops the commit from the changelog. | instant |
| `pre-commit` | Fast, path-filtered checks for the stacks the commit touches, plus actionlint/shellcheck when installed. | ~2s |

`git commit --no-verify` skips one commit. `SKIP_HOOKS=1` skips every commit for
as long as it is set — it is an environment variable, not a per-commit flag.

## Why opt-in and skippable

A hook nobody can bypass gets bypassed anyway — by unsetting `core.hooksPath`, or
never setting it. An obvious escape hatch keeps the hook installed, which is the
only state in which it catches anything.

CI is the authority. These shorten the loop, they do not replace it.
