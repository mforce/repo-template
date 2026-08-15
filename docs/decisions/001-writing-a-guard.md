# Writing a guard (a test that asserts an invariant)

> **Rule** — the one-paragraph version lives in [`AGENTS.md`](../../AGENTS.md).
>
> **Provenance:** these rules are **inherited with the repo template**, not
> earned in this repo. The incidents behind them happened elsewhere. They are
> here because they are cheap and general, but treat them as advice until this
> repo produces its own evidence — and when it does, replace the borrowed
> examples with yours.

A guard is a test whose job is to *fail* when someone later does the wrong
thing: a frozen-migration check, a "no endpoint reads the request body twice"
check, a pinned digest, a fixture with exact expected counts.

**A wrong guard is worse than no guard, because it reads as safety.** Everyone
downstream — reviewers, agents, the next person to touch the file — stops
looking, on the strength of a test that checks nothing. The rules below come
from one guard that took five review rounds to get right, every round finding a
defect in the previous round's fix.

## The rules

### Run an adversarial pass before the first push

The *pass* is the rule; the tool is not. Options, in rough order of cost:

- run the mutation checks (below) before the first push instead of after the
  first review finding;
- hand the diff to a second agent and tell it to **refute** the guard, not
  review it;
- a CLI reviewer where one happens to be installed. Check `command -v <tool>`
  rather than assuming — a maintainer-machine tool is not a repo dependency, and
  a sandboxed agent environment generally will not have it.

What matters is that something hostile reads the guard while the change is still
local. Per-PR review is written around "once the PR is up", which is right for a
feature diff; for guard-shaped work it turns every iteration into a push and a
multi-minute wait. Four of the five rounds above were findable locally in
seconds.

### Mutation first, claim second

Never write "this catches X" — in a comment, a commit message, or a PR reply —
before running the mutation that makes the guard go **red**.

Three of the five findings were a comment asserting coverage the code did not
have. The worst was a branch that was **unreachable dead code** sitting directly
under a comment saying that case was covered. If a branch exists to handle
something, prove it executes.

Two conditions on a mutation check, both of which have produced false confidence:

- **The baseline must be green.** A run where the unmutated case also fails
  proves nothing. Print baseline, mutants, and the restored baseline — see
  `.github/scripts/vuln-gate.test.mjs` and the loop used to verify it.
- **The mutant must die on its NAMED assertion.** A red somewhere else in the
  suite means a different test caught it, and the guard you are claiming for is
  still vacuous. Assert on the specific test name, not the failure count.
- **Restore, then rebuild, then re-run.** A `--no-build`-style re-run after
  restoring the source re-executes the mutant and reports a false green.

### Two misses of the same shape mean the METHOD is wrong

Do not extend the list a second time.

The guard that failed five times hand-enumerated "the properties that matter",
missed one, gained one, then missed another. It only held once it walked *every*
property, so an item is included because it **exists**, not because someone
remembered it.

Prefer **"walk everything, exclude deliberately"** over "list what I thought of"
anywhere the domain can grow. An exclusion list is reviewable; an inclusion list
silently shrinks as the codebase grows.

### For a pinned or golden value, prove portability — repetition is not evidence

Running a digest three times on one machine tests non-determinism *within* a
process. It cannot, even in principle, detect environment leakage, which is
perfectly stable per machine.

One such digest embedded an absolute path to a framework assembly. It passed
locally, every time, and failed in CI.

Assert that the generated **content** carries no environment: no absolute paths,
no base-directory references, no assembly file names — plus a size ceiling if
the generator recurses. That fails **by name** on the next leak instead of
surfacing as a mystery digest mismatch, and it removes the tempting "fix" of
re-baselining the constant until CI agrees, after which the guard checks
nothing.

### Prefer the boring guard

Complexity costs double here, because the complicated thing is the thing you are
trusting.

## Related failure modes

- **Do not assert the trade-off.** Pinning a known loss in a test converts
  "we did not fix this" into "this is the spec". Re-price the alternative before
  writing that assertion.
- **An unenforced invariant in a comment is a bug.** "X can never happen", used
  to justify a simplification, is a defect unless a line of code enforces X.
  Name the line, or drop the simplification.
- **Verify a "would have caught X" claim against that test alone.** Filter the
  run to the single test; a suite-wide red is usually another test killing the
  mutant.
