# The checklist guard that was withdrawn

> **Rule** — do not rebuild this. Read the failure first.
>
> **Provenance:** unlike 000–002, this one was **earned here**, 2026-08-16.

## What was attempted

`TEMPLATE-SETUP.md` is a checklist an adopter works through and then deletes. Its
only value is being **complete** — someone who finishes it believes the repo is
configured.

Nothing enforced that, and it had already failed once: `codeql.yml` shipped a
`language:` matrix defaulting to `["actions"]` while the checklist named that file
only for a repo setting, so an adopter could tick every box and ship with CodeQL
passing green having never analysed a line of their application code.

So: give every slot an id, `TODO(template:<slug>)`, match it to a checklist item,
and enforce the correspondence both ways.

## Why it was withdrawn

**Three defects of the same class, each found only after the previous fix.**

1. The guard went **permanently red** once an adopter deleted the checklist —
   which the checklist itself instructs. Unfixable from a branch.
2. The correction over-shot: absence of the checklist made the checks *skip*, so
   a repo could delete it with **every marker still in place** and stay green.
3. Filling in a **single** marker while keeping the checklist — normal
   incremental setup — turned the guard red, with nothing telling the adopter
   what to do. The count floors compounded it: past roughly a third of the slots,
   the anti-vacuity assertions failed too.

Plus a regression the work introduced: tagging `package-name` in
`release-please-config.json` produced a value containing `:`, and release-please
derives its release-PR branch from it. `git check-ref-format` rejects that ref,
so pushes to `main` would have stopped creating or updating the release PR.

[`001`](001-writing-a-guard.md) says two misses of the same shape mean the
**method** is wrong. This was three.

## The root cause

Every version modelled the **template maintainer's** state and never the
**adopter's**. The maintainer's repo is static: all slots open, checklist present.
The adopter's moves through states the design never named — some slots filled,
checklist still present, checklist gone. Each fix moved the red into the next
unmodelled state rather than removing it.

An invariant that holds for one party and fails for the other is not an
invariant. **Enumerate every state your subject passes through and say what the
guard does in each.** A state where someone sees red with no action means the
guard is wrong.

## What is kept

- The `codeql.yml` `language:` checklist items. That was the real defect, and
  prose is what it needed.
- The habit, stated as a habit: read every marker in a file you touch.
- `workflows.test.mjs`, which asserts things true in every adopter state.

## What was rejected

- **A file-level guard** — "every file with a marker is named in the checklist".
  It was written for the `codeql.yml` bug and **passed against it**: the file was
  named, for a different reason, while the slot inside stayed invisible.
- **Slot ids with two-way correspondence** — the subject of this document.
- **Loosening it until adopters stay green** — drops the stale-instruction half,
  which was most of the value.

If this is attempted again, solve this first: *how does a check tell a
half-finished adoption from a broken one?* Until there is an answer, prose and
review are the honest mechanism.

## Postscript

Four review passes across three models found these, each defect sitting in the
**previous** reviewer's fix. The local model caught the guard deciding one thing
from the filesystem (`existsSync`) and everything else from git (`git ls-files`),
which both hosted models walked past. The run given no custom prompt at all found
the release-please regression that the carefully-steered ones missed. Running one
reviewer, or two from the same family, would have shipped this.
