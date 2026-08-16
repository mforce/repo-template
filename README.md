# repo-template

A starting point for a new repository. Stack-agnostic: the **process**
scaffolding that is expensive to rebuild and easy to forget, and none of the
application code.

## What is in here

| Path | What it gives you |
|---|---|
| [`AGENTS.md`](AGENTS.md) + [`CLAUDE.md`](CLAUDE.md) | One shared brief for every coding agent; `CLAUDE.md` is a one-line include. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Branch, PR and commit rules. |
| [`SECURITY.md`](SECURITY.md) | Reporting, what CI enforces, and the one way to mute an advisory. |
| [`.githooks/`](.githooks/) | Opt-in `commit-msg` and `pre-commit`, plus actionlint/shellcheck when installed. |
| [`.gitattributes`](.gitattributes) | `eol=lf`, so a Windows checkout cannot CRLF-mangle the POSIX `sh` hooks. |
| [`.editorconfig`](.editorconfig) | Whitespace defaults. A convenience, not a gate. |
| [`.github/workflows/`](.github/workflows/) | CI skeleton, weekly dependency audit, CodeQL, and release-please. |
| [`.github/scripts/vuln-gate.mjs`](.github/scripts/vuln-gate.mjs) | Fail-closed vulnerability gate with **dated** exceptions. Pluggable per ecosystem. |
| [`.github/security-exceptions.json`](.github/security-exceptions.json) | The only mute. Every entry needs a reason and an expiry. |
| [`.github/dependabot.yml`](.github/dependabot.yml) | Grouped updates; bundled-`dist` actions stay ungrouped on purpose. |
| [`.github/CODEOWNERS`](.github/CODEOWNERS) | The one in-repo lever on a self-merge to `.github/`. **Ships inert.** |
| [`.github/pull_request_template.md`](.github/pull_request_template.md) | The review rules as a checklist. |
| [`docs/decisions/`](docs/decisions/) | ADRs — where a rule's rationale lives once the rule is one line in `AGENTS.md`. |
| [`docs/runbooks/`](docs/runbooks/) | Operational procedures, each with a verification drill. |

## Using it

```bash
git clone <this> my-new-project && cd my-new-project
rm -rf .git && git init -b main
```

Then work through [`TEMPLATE-SETUP.md`](TEMPLATE-SETUP.md) and delete it. Nothing
here is load-bearing until you fill in the `TODO(template)` slots.

## The one rule about copying this

A mature repo's `AGENTS.md` is valuable because **every bullet was earned by a
defect that shipped**. Those bullets do not transplant: a new repo inherits rules
for bugs it never had, and nobody can tell the live ones from cargo cult.

So this ships the **slots**, not filled-in content. Write a rule the first time
something bites you, and cite the incident.

## License

[MIT](LICENSE), covering **this template** — it is what lets you copy these
files, not a recommendation for what you build. Replace `LICENSE` with your own.
