# Decision records

Each file here holds the **relocated rationale** for a rule that also appears —
in one compressed paragraph — in [`AGENTS.md`](../../AGENTS.md) or
[`README.md`](../../README.md).

The split is the whole point: the short version (the rule plus the one-line
consequence of breaking it) stays resident in `AGENTS.md` so it loads into every
agent session, while the narrative that earned it — what shipped, which review
round found it, what the wrong fix was, what not to break — lives here so it is
reachable without being resident. **Nothing is deleted**; follow the `→` link
from the `AGENTS.md` bullet.

## When to write one

Write an ADR when a choice is **non-obvious and will be re-litigated**:

- you rejected the obvious approach, and the reason is not visible in the code;
- the rule looks like over-engineering until you know the incident;
- someone will "clean it up" in six months and reintroduce the defect.

Do **not** write one for a choice that the code already states plainly. An ADR
nobody needed is a file everyone has to read.

## Format

Copy [`TEMPLATE.md`](TEMPLATE.md). Number files by the issue that produced them
(`412-thing.md`) once you have an issue tracker; the numbers here are
placeholders from the repo template.

## Index

| Decision | Rule lives in |
|---|---|
| [CI security gates](000-ci-security-gates.md) | AGENTS · CI security gates |
| [Writing a guard](001-writing-a-guard.md) | AGENTS · Writing a guard |
| [Releases and artifact publishing](002-release-and-publish.md) | AGENTS · Releases |

Keep this index current. An ADR nobody can find is an ADR nobody reads.
