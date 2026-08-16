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

## Prerequisites

**Node 18+**, for the template's own tooling — never for your application. Three
files are node; `ci.yml` and `scripts/setup.sh` invoke them and need nothing else:

| File | What it does | Why node |
|---|---|---|
| [`vuln-gate.mjs`](.github/scripts/vuln-gate.mjs) | Parses `npm audit` / `dotnet list package` JSON, applies the severity ladder and the dated exceptions, sets the exit code | It has to parse JSON and it must fail closed. Doing that in POSIX `sh` means hand-rolling a JSON parser in the one component everything else trusts |
| [`vuln-gate.test.mjs`](.github/scripts/vuln-gate.test.mjs) | The gate's guards — every way it could pass while an advisory is present | Tests the above, so same runtime |
| [`workflows.test.mjs`](.github/scripts/workflows.test.mjs) | Asserts every action is SHA-pinned and no workflow ships a step that can only fail | Same runtime, no extra dependency |

`node --test` is the whole test framework — there is no `package.json`, no
`node_modules`, and nothing to install.

**It is free where it runs.** GitHub-hosted runners ship Node 20+, so `ci.yml`
has no `setup-node` step. You need node locally only to run the guards yourself
or to let `scripts/setup.sh` verify the parts you kept; the script says so and
carries on without it.

Everything else here — hooks, workflows, the setup script — is POSIX `sh`.

## Using it

Click **Use this template** on GitHub, then in your new repo:

```bash
./scripts/setup.sh                          # pick the parts you want
./scripts/setup.sh --settings <owner>/<repo> # and apply the repo settings
```

The script deletes the parts you drop, prints the docs that still reference them
for you to resolve, and runs the template's own tests so a broken combination
shows up now. `--list` shows the parts; skip it entirely if you want everything.

Or ask a coding agent to set the repo up with you — `AGENTS.md` points it at the
*Agent-led setup* section of the checklist, which has it drive the same script
rather than deleting files by hand.

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
