# repo-template

A starting point for a new repository. Stack-agnostic: it carries the **process**
scaffolding that is expensive to rebuild and easy to forget, and none of the
application code.

## What is in here

| Path | What it gives you |
|---|---|
| [`AGENTS.md`](AGENTS.md) + [`CLAUDE.md`](CLAUDE.md) | One shared brief for every coding agent. `CLAUDE.md` is a one-line include so there is exactly one copy. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Branch/PR/commit rules for humans. |
| [`SECURITY.md`](SECURITY.md) | How to report a vulnerability, what CI enforces automatically, and the one way to mute an advisory. |
| [`.githooks/`](.githooks/) | Opt-in `commit-msg` (conventional commits + the release-please parse trap) and `pre-commit` (fast, path-filtered checks, plus actionlint/shellcheck when installed). |
| [`.gitattributes`](.gitattributes) | `eol=lf` everywhere, so a Windows checkout cannot CRLF-mangle the POSIX `sh` hooks into an unrunnable state. |
| [`.editorconfig`](.editorconfig) | Whitespace defaults so formatting churn stops burying real changes in review. A convenience, not a gate. |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | CI skeleton: build-and-test slots, PR-scoped dependency review. |
| [`.github/workflows/security-audit.yml`](.github/workflows/security-audit.yml) | Weekly tree-scoped dependency audit on a schedule. |
| [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml) | CodeQL, advisory. |
| [`.github/workflows/release-please.yml`](.github/workflows/release-please.yml) | Conventional commits → changelog + version bump + draft release. |
| [`.github/scripts/vuln-gate.mjs`](.github/scripts/vuln-gate.mjs) | Fail-closed dependency-vulnerability gate with **dated** exceptions. Pluggable per ecosystem. |
| [`.github/security-exceptions.json`](.github/security-exceptions.json) | The only mute for that gate. Every entry needs a reason and an expiry. |
| [`.github/dependabot.yml`](.github/dependabot.yml) | Grouped version updates; security fixes stay ungrouped on purpose. |
| [`.github/CODEOWNERS`](.github/CODEOWNERS) | The one in-repo lever on "a self-merge to `.github/` rewrites what every gate means". **Ships inert** — an unresolvable entry is silently ignored, so a plausible-looking broken file is worse than an obviously empty one. |
| [`.github/pull_request_template.md`](.github/pull_request_template.md) | The review rules from `CONTRIBUTING.md` as a checklist, plus the reminder that the PR title *is* the release note. |
| [`docs/decisions/`](docs/decisions/) | ADRs — where a rule's rationale lives once the rule itself is one line in `AGENTS.md`. |
| [`docs/runbooks/`](docs/runbooks/) | Operational procedures, each with a verification drill. |

## Using it

```bash
git clone <this> my-new-project && cd my-new-project
rm -rf .git && git init -b main
```

Then work through [`TEMPLATE-SETUP.md`](TEMPLATE-SETUP.md) and delete it. Nothing
here is load-bearing until you fill in the slots marked `TODO(template)`.

## The one rule about copying this

The value of a mature repo's `AGENTS.md` is that **every bullet was earned by a
defect that shipped**. Those bullets cannot be transplanted: a new repo that
inherits them gets rules for bugs it never had, and nobody can tell the live
rules from the cargo cult.

So this template ships the **slots**, each with a one-line note on why the
section exists — not filled-in content. Write a rule the first time something
bites you, and cite the incident in it.

## License

[MIT](LICENSE). That covers **this template**; it is what lets you copy these
files, not a recommendation for what you build. Replace `LICENSE` with your
project's own — `TEMPLATE-SETUP.md` step 1 has the detail.
