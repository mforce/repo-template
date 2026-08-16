# Writing a guard (a test that asserts an invariant)

> **Rule** — the short version is in [`AGENTS.md`](../../AGENTS.md).
>
> **Provenance:** mostly **inherited** with the repo template; the incidents
> behind them happened elsewhere. This repo has since earned two of its own —
> see [`003`](003-the-checklist-guard-that-was-withdrawn.md), which added the
> state-enumeration rule below.

A guard is a test whose job is to *fail* when someone later does the wrong thing:
a frozen-migration check, a pinned digest, a fixture with exact counts.

**A wrong guard is worse than no guard, because it reads as safety.** Everyone
downstream stops looking, on the strength of a test that checks nothing. The
rules below come from one guard that took five review rounds, each finding a
defect in the previous round's fix.

## The rules

### Run an adversarial pass before the first push

The *pass* is the rule; the tool is not:

- run the mutation checks below **before** the first push, not after the first
  review finding;
- hand the diff to a second agent and tell it to **refute** the guard;
- a CLI reviewer, if one is installed — check `command -v`, since a
  maintainer-machine tool is not a repo dependency.

What matters is that something hostile reads the guard while it is still local.
Four of those five rounds were findable locally in seconds.

### Mutation first, claim second

Never write "this catches X" — in a comment, a commit message or a PR reply —
before running the mutation that makes the guard go **red**.

Three of the five findings were a comment asserting coverage the code did not
have; the worst sat directly above **unreachable dead code**. If a branch exists
to handle something, prove it executes.

Three conditions, each of which has produced false confidence:

- **The baseline must be green.** A run where the unmutated case also fails
  proves nothing. Print baseline, mutants, and the restored baseline.
- **The mutant must die on its NAMED assertion.** A red elsewhere means a
  different test caught it and yours is still vacuous.
- **Restore, then rebuild, then re-run.** A `--no-build`-style re-run after
  restoring re-executes the mutant and reports a false green. Print the restored
  baseline too — an incomplete restore looks exactly like a passing one.

### Two misses of the same shape mean the METHOD is wrong

Do not extend the list a second time.

The guard that failed five times hand-enumerated "the properties that matter",
missed one, then missed another. It only held once it walked *every* property, so
an item is included because it **exists**, not because someone remembered it.

Prefer **"walk everything, exclude deliberately"**. An exclusion list is
reviewable; an inclusion list silently shrinks as the codebase grows.

### Enumerate the states your subject passes through

Say what the guard does in each. If any state leaves someone looking at a red
they have no action for, the guard is wrong — and a guard that only models one
party's view of the world will keep moving that red rather than removing it.
→ [`003`](003-the-checklist-guard-that-was-withdrawn.md)

### For a pinned value, prove portability — repetition is not evidence

Running a digest three times on one machine tests non-determinism *within* a
process. It cannot detect environment leakage, which is perfectly stable per
machine. One such digest embedded an absolute path to a framework assembly: it
passed locally every time and failed in CI.

Assert the generated **content** carries no environment — no absolute paths, no
base-directory references, no assembly file names, plus a size ceiling if the
generator recurses — so the next leak fails *by name* rather than as a
mystery mismatch, and nobody is tempted to re-baseline the constant until CI
agrees.

### Prefer the boring guard

Complexity costs double when the complicated thing is the thing you are trusting.

## Related failure modes

- **Do not assert the trade-off.** Pinning a known loss converts "we did not fix
  this" into "this is the spec".
- **An unenforced invariant in a comment is a bug.** "X can never happen", used
  to justify a simplification, is a defect unless a line of code enforces X.
- **Verify a "would have caught X" claim against that test alone.** A suite-wide
  red is usually another test killing the mutant.
