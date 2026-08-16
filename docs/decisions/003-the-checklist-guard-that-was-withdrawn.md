# The checklist guard that was withdrawn

> **Rule** — do not rebuild this. Read the failure first.
>
> **Provenance:** unlike [000](000-ci-security-gates.md),
> [001](001-writing-a-guard.md) and [002](002-release-and-publish.md), this one
> was **earned here**, on 2026-08-16. Everything below happened in this repo.

## What was attempted

`TEMPLATE-SETUP.md` is a checklist an adopter works through and then deletes.
Its only value is being **complete**: someone who finishes it believes the repo
is configured.

Nothing enforced that, and it had already failed once. `codeql.yml` shipped a
`language:` matrix defaulting to `["actions"]` — workflow files and nothing else
— while the checklist named that file only for a repo setting. An adopter could
tick every box and ship with CodeQL passing green on every PR having never
analysed a line of their application code.

So: give every slot an id, `TODO(template:<slug>)`, put a matching comment on the
checklist item, and have a test enforce the correspondence in both directions.

It was withdrawn. The idea is sound; what follows is why the implementation
never converged.

## Why it was withdrawn

**Three defects of the same class, each found only after the previous fix.**

1. The guard went **permanently red** once an adopter deleted the checklist —
   which the checklist's own opening instruction tells them to do. Unfixable
   from a branch.
2. The correction over-shot: absence of the checklist made the checks *skip*, so
   a repo could delete it with **all 42 markers still in place** and stay green.
3. Filling in a **single** marker while keeping the checklist — normal
   incremental setup — turned the guard red, with nothing telling the adopter
   what to do. The count floors compounded it: past roughly a third of the slots,
   the anti-vacuity assertions failed too.

Plus a live regression the work itself introduced: tagging `package-name` in
`release-please-config.json` produced a value containing `:`, and release-please
derives its release-PR branch from it. `git check-ref-format` rejects that ref,
so pushes to `main` would have stopped being able to create or update the
release PR.

[`001-writing-a-guard.md`](001-writing-a-guard.md) says two misses of the same
shape mean the **method** is wrong, not that the list needs one more entry. This
was three.

## The actual root cause

Every version modelled the **template maintainer's** state and never the
**adopter's**. The maintainer's repo is static: all slots open, checklist
present. The adopter's repo moves through states the design never had a name
for — some slots filled, checklist still present, some markers deleted, checklist
gone. Each fix moved the red into the next unmodelled state rather than removing
it.

An invariant that holds for one party and fails for the other is not an
invariant. **Before writing a guard, enumerate every state its subject passes
through, and say what the guard does in each.** If that list has a state where
the guard is red and the person seeing it has no action, the guard is wrong.

## What is kept

- The `codeql.yml` `language:` checklist items. That was the real defect, and it
  is fixed by prose, which is what it needed.
- The habit, stated in the checklist as a habit: read every marker in a file you
  touch, not only the one you came for.
- `workflows.test.mjs`, which is unaffected — it asserts things about the
  template's own files that are true in every adopter state.

## What was rejected, and why not to retry it as-is

- **A file-level guard** — "every file carrying a marker is named in the
  checklist". It was written for the `codeql.yml` bug and **passed against it**:
  the file was named, for a different reason, while the slot inside stayed
  invisible. File-level naming is not the invariant.
- **Slot ids with two-way correspondence** — the subject of this document.
- **Loosening it until adopters stay green** — drops the stale-instruction half,
  which was most of the value. What remains does not justify the machinery.

If this is attempted again, the thing to solve first is not the matching. It is:
*how does a check tell a half-finished adoption from a broken one?* Until there
is an answer, prose and review are the honest mechanism.

## Postscript: how it was found

Three independent reviewers, in sequence, each finding what the last missed —
and each defect was in the **previous reviewer's fix**:

| reviewer | found |
|---|---|
| pi via `openai-codex` | shared slugs hid deletions; near-miss markers invisible; `bootstrap-sha` documented but absent |
| codex (`gpt-5.6`) | the skip over-correction, in the fix for pi's round |
| pi via local `qwen3.8-27b` | `existsSync` vs `git ls-files` inconsistency, missed by both of the above |
| codex, default review mode | the incremental-setup red, and the release-please ref regression |

The local model found something the two hosted ones did not. Running one
reviewer, or two from the same family, would have shipped this.
