// Guards over the template's own contract. Run: node --test .github/scripts/*.test.mjs
//
// TEMPLATE-SETUP.md is the checklist an adopter works through and then deletes.
// Its whole value is being COMPLETE — an adopter who finishes it believes the
// repo is set up. A slot the checklist never mentions is therefore worse than a
// slot that does not exist: the template quietly ships a half-configured gate
// and reports success.
//
// WHAT THIS CATCHES, AND WHAT IT DEMONSTRABLY DOES NOT.
//
// It catches a file full of slots that the checklist never mentions at all.
//
// It does NOT catch a file the checklist mentions for one reason while a
// different slot inside it goes unlisted — and that is not hypothetical. This
// guard was written for exactly such a bug and passed against it:
// `.github/workflows/codeql.yml` carried a `language:` matrix defaulting to
// `["actions"]`, so an adopter shipping C# or TypeScript would have had CodeQL
// scan their workflow files, pass green, and never analyse a line of
// application code — while the checklist named `codeql.yml` only for a repo
// setting. File-level naming was satisfied; the slot was still invisible.
//
// So this is a floor, not the contract. Enforcing the real invariant — every
// SLOT is covered, not every file — needs the markers to carry ids the
// checklist can be matched against. Until that exists, do not read a green here
// as "the checklist is complete".

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { basename, join } from "node:path";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CHECKLIST = "TEMPLATE-SETUP.md";
const MARKER = "TODO(template)";

// Ask git for the tracked files rather than walking the filesystem: it excludes
// .git, honours .gitignore, and cannot wander into node_modules or a build
// directory a future stack introduces.
const tracked = execFileSync("git", ["-C", ROOT, "ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const carriesMarker = tracked.filter((path) => {
  if (path === CHECKLIST) return false; // the checklist describes markers; it is not a slot
  try {
    return readFileSync(join(ROOT, path), "utf8").includes(MARKER);
  } catch {
    return false; // binary or unreadable: not a slot either way
  }
});

test("every file carrying a TODO(template) marker is named in TEMPLATE-SETUP.md", () => {
  const checklist = readFileSync(join(ROOT, CHECKLIST), "utf8");

  // Anti-vacuity. If the marker string is ever reworded, this guard would find
  // zero slots, assert nothing, and pass — reporting safety it never checked.
  // The floor is well below today's count so ordinary edits do not trip it.
  assert.ok(
    carriesMarker.length >= 10,
    `found only ${carriesMarker.length} files carrying "${MARKER}" — if the marker was ` +
      `reworded, update this guard rather than letting it check nothing`,
  );

  // A file counts as named by its full path or by its basename, because the
  // checklist writes some entries bare (`security-audit.yml`). That is loose on
  // purpose: the failure this catches is a slot nobody mentioned AT ALL, and a
  // stricter match would fail on harmless prose rewording instead.
  const unlisted = carriesMarker.filter(
    (path) => !checklist.includes(path) && !checklist.includes(basename(path)),
  );

  assert.deepEqual(
    unlisted,
    [],
    `these files ship a ${MARKER} slot that TEMPLATE-SETUP.md never mentions, so an adopter ` +
      `can finish the checklist believing the repo is configured while the slot is untouched`,
  );
});
