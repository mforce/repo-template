// Guards over the template's own contract. Run: node --test .github/scripts/*.test.mjs
//
// TEMPLATE-SETUP.md is the checklist an adopter works through and then deletes.
// Its whole value is being COMPLETE — someone who finishes it believes the repo
// is configured. A slot the checklist never mentions is therefore worse than a
// slot that does not exist: the template quietly ships a half-configured gate
// and reports success.
//
// THE CONTRACT
//
//   in the tree        a marker of the form TODO(template:<slug>)
//   in the checklist   an HTML comment carrying the same slug
//
// ONE SLUG PER MARKER. Slugs are never shared between two markers, even when
// several belong to the same checklist item. An earlier version reused a slug
// across three lines and compared SETS, so deleting two of the three lines left
// the slug present and the guard green — while the grep the checklist tells an
// adopter to run no longer listed them. One slug per marker makes any single
// deletion visible. A checklist item may carry as many slug comments as it
// covers; that is the intended way to group them.
//
// WHY IDS AND NOT FILE NAMES. The first version of this guard matched file
// names, and it PASSED against the bug it was written for: codeql.yml was named
// in the checklist for a repo setting while the `language:` matrix inside it
// stayed invisible. File-level naming is not the invariant; slot-level coverage
// is. See docs/decisions/001-writing-a-guard.md.

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CHECKLIST = "TEMPLATE-SETUP.md";

// Anything that looks like a marker at all. Every hit must then be either a
// well-formed slot or the exact placeholder prose uses when describing the
// convention. Matching loosely first is the point: a near-miss like a stray
// space or an underscore is otherwise invisible to BOTH the slot scan and a
// narrow ban, which is a real instruction in the tree that nothing reports.
const ANY_MARKER = /TODO\(template[^)\n]*\)/g;
const WELL_FORMED = /^TODO\(template:[a-z0-9-]+\)$/;
const PLACEHOLDER = "TODO(template:<slug>)";
const SLOT = /TODO\(template:([a-z0-9-]+)\)/g;
const ITEM = /<!--\s*template:([a-z0-9-]+)\s*-->/g;

// Ask git for the tracked files rather than walking the filesystem: it excludes
// .git, honours .gitignore, and cannot wander into node_modules or a build
// directory a future stack introduces.
const tracked = execFileSync("git", ["-C", ROOT, "ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const unreadable = [];
const read = (path) => {
  try {
    return readFileSync(join(ROOT, path), "utf8");
  } catch (err) {
    // Never swallow this. A file the guard cannot open is a file whose markers
    // are invisible to every check below, and silently returning "" would make
    // that look like a clean tree.
    unreadable.push(`${path} (${err.code ?? err.message})`);
    return "";
  }
};

const sources = tracked.filter((p) => p !== CHECKLIST).map((path) => ({ path, body: read(path) }));

// THE CHECKLIST IS SUPPOSED TO BE DELETED. Step 7 tells the adopter to delete it
// once setup is done, and an earlier version of this guard then failed forever
// on their repo — a red nobody can fix from a branch, which is exactly what
// docs/decisions/000 says teaches people to ignore red. It is also the second
// time that shape shipped here; the first was security-audit.yml's weekly
// `exit 1`.
//
// With the checklist gone there is simply nothing to match slots against, so
// these checks skip. What still fails for a set-up repo is ci.yml's and
// security-audit.yml's own placeholders, which are keyed to the same file.
const setUp = !existsSync(join(ROOT, CHECKLIST));
const skip = setUp
  ? `${CHECKLIST} is gone, so this repo is set up and there is no checklist to match slots against`
  : false;

const checklist = setUp ? "" : read(CHECKLIST);
const matchAll = (body, re) => [...body.matchAll(re)].map((m) => m[1]);

const slots = new Map(); // slug -> ["path:line", …]
for (const { path, body } of sources) {
  body.split("\n").forEach((line, i) => {
    for (const slug of matchAll(line, SLOT)) {
      if (!slots.has(slug)) slots.set(slug, []);
      slots.get(slug).push(`${path}:${i + 1}`);
    }
  });
}
const items = new Set(matchAll(checklist, ITEM));

// Runs in both states: a file that cannot be read is a hole in every other
// assertion here, and "" is indistinguishable from "no markers".
test("every tracked file was actually readable", () => {
  assert.deepEqual(unreadable, [], "these files could not be read, so their markers are invisible to every check below");
});

// Anti-vacuity, on both sides. If either pattern stops matching — a reworded
// marker, a changed comment style — the sets go empty, every assertion below
// passes having compared nothing, and the guard reports safety it never
// checked. The floors sit under today's counts but well above the point where
// a wholesale rewrite could hide behind them.
test("the slot and checklist-item patterns still match something", { skip }, () => {
  assert.ok(slots.size >= 30, `found only ${slots.size} tagged slots — has the marker been reworded?`);
  assert.ok(items.size >= 30, `found only ${items.size} checklist references — has the comment style changed?`);
});

test("every slot in the tree is named by a checklist item", { skip }, () => {
  const orphans = [...slots.entries()]
    .filter(([slug]) => !items.has(slug))
    .map(([slug, where]) => `${slug} (${where.join(", ")})`);

  assert.deepEqual(
    orphans,
    [],
    `these slots have no item in ${CHECKLIST}, so an adopter can finish the checklist ` +
      `with them untouched — add an item carrying the matching slug comment`,
  );
});

test("every checklist item points at a slot that still exists", { skip }, () => {
  const stale = [...items].filter((slug) => !slots.has(slug));

  assert.deepEqual(
    stale,
    [],
    `${CHECKLIST} references slots that no longer exist in the tree — either the marker ` +
      `was removed and the item should go, or the slug is misspelled on one side`,
  );
});

// One slug per marker, so deleting any single marker drops its slug and trips
// the check above. Without this, a slug shared by three lines survives the
// deletion of two of them.
test("no slug is used by more than one marker", { skip }, () => {
  const shared = [...slots.entries()]
    .filter(([, where]) => where.length > 1)
    .map(([slug, where]) => `${slug} used by ${where.length}: ${where.join(", ")}`);

  assert.deepEqual(
    shared,
    [],
    "a shared slug hides the deletion of individual markers — give each marker its own slug " +
      "and list them all on the one checklist item that covers them",
  );
});

// Runs even for a set-up repo: a malformed marker is wrong whether or not a
// checklist exists to match it against.
test("every marker is well formed", () => {
  const malformed = [];
  for (const { path, body } of [...sources, { path: CHECKLIST, body: checklist }]) {
    body.split("\n").forEach((line, i) => {
      for (const hit of line.match(ANY_MARKER) ?? []) {
        if (WELL_FORMED.test(hit) || hit === PLACEHOLDER) continue;
        malformed.push(`${path}:${i + 1}: ${hit}`);
      }
    });
  }

  assert.deepEqual(
    malformed,
    [],
    "a marker must be exactly TODO(template:<slug>) with a lowercase-hyphen id — anything else " +
      "is matched by neither the slot scan nor the checklist, so it is an instruction nobody is " +
      "told to act on. Prose describing the convention writes the literal placeholder form",
  );
});
