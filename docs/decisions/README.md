# Decision records

Each file holds the **relocated rationale** for a rule that also appears, in one
compressed paragraph, in [`AGENTS.md`](../../AGENTS.md).

The split is the point: the rule plus its one-line consequence stays resident in
`AGENTS.md` so it loads into every agent session, while the narrative that earned
it — what shipped, what the wrong fix was — lives here, reachable but not
resident. Nothing is deleted; follow the `→` link.

## When to write one

When a choice is **non-obvious and will be re-litigated**:

- you rejected the obvious approach for a reason not visible in the code;
- the rule looks like over-engineering until you know the incident;
- someone will "clean it up" in six months and reintroduce the defect.

Not for a choice the code already states plainly. An ADR nobody needed is a file
everyone has to read.

## Format

Copy [`TEMPLATE.md`](TEMPLATE.md). Number by the issue that produced them
(`412-thing.md`) once you have a tracker; the numbers here are template
placeholders.

## Index

| Decision | Rule lives in |
|---|---|
| [CI security gates](000-ci-security-gates.md) | AGENTS · CI security gates |
| [Writing a guard](001-writing-a-guard.md) | AGENTS · Writing a guard |
| [Releases and artifact publishing](002-release-and-publish.md) | AGENTS · Releases |
| [The checklist guard that was withdrawn](003-the-checklist-guard-that-was-withdrawn.md) | AGENTS · Writing a guard |

Keep this index current. An ADR nobody can find is an ADR nobody reads.
