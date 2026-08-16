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
//   in the tree        TODO(template:<slug>)
//   in the checklist   <!-- template:<slug> -->
//
// Both directions are enforced, because each catches a different failure:
//
//   slot with no item  — a slot nobody is told to fill. This is the one that
//                        shipped: codeql.yml's `language:` matrix defaults to
//                        ["actions"], so an adopter could tick every box and
//                        still have CodeQL passing green having never analysed
//                        a line of application code.
//   item with no slot  — a checklist item pointing at a slot that was filled in
//                        or deleted. Stale instructions age into folklore, and
//                        an adopter cannot tell them from live ones.
//
// WHY IDS AND NOT FILE NAMES. The first version of this guard matched on file
// names, and it PASSED against the codeql bug: the file was named in the
// checklist (for a repo setting) while the slot inside it stayed invisible.
// File-level naming is not the invariant; slot-level coverage is. See
// docs/decisions/001-writing-a-guard.md — two misses of the same shape mean the
// method is wrong, not that the list needs one more entry.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CHECKLIST = "TEMPLATE-SETUP.md";

const SLOT = /TODO\(template:([a-z0-9-]+)\)/g;
const ITEM = /<!--\s*template:([a-z0-9-]+)\s*-->/g;
// A slot with no id is invisible to both directions above, so it is banned
// outright. Prose that needs to name the convention writes the placeholder form
// `TODO(template:<slug>)`, which carries no id and so is not a slot.
const UNTAGGED = /TODO\(template\)/;

// Ask git for the tracked files rather than walking the filesystem: it excludes
// .git, honours .gitignore, and cannot wander into node_modules or a build
// directory a future stack introduces.
const tracked = execFileSync("git", ["-C", ROOT, "ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const read = (path) => {
  try {
    return readFileSync(join(ROOT, path), "utf8");
  } catch {
    return ""; // binary or unreadable: carries no slots either way
  }
};

const sources = tracked.filter((path) => path !== CHECKLIST).map((path) => ({ path, body: read(path) }));
const checklist = read(CHECKLIST);

const matchAll = (body, re) => [...body.matchAll(re)].map((m) => m[1]);

const slots = new Map(); // slug -> [files]
for (const { path, body } of sources) {
  for (const slug of matchAll(body, SLOT)) {
    if (!slots.has(slug)) slots.set(slug, []);
    if (!slots.get(slug).includes(path)) slots.get(slug).push(path);
  }
}
const items = new Set(matchAll(checklist, ITEM));

// Anti-vacuity, on both sides. If either pattern stops matching — a reworded
// marker, a changed comment style — the set is empty, every assertion below
// passes having compared nothing, and the guard reports safety it never checked.
// The floors sit well under today's counts so ordinary edits do not trip them.
test("the slot and checklist-item patterns still match something", () => {
  assert.ok(slots.size >= 20, `found only ${slots.size} tagged slots — has the marker been reworded?`);
  assert.ok(items.size >= 20, `found only ${items.size} checklist references — has the comment style changed?`);
});

test("every slot in the tree is named by a checklist item", () => {
  const orphans = [...slots.entries()]
    .filter(([slug]) => !items.has(slug))
    .map(([slug, files]) => `${slug} (${files.join(", ")})`);

  assert.deepEqual(
    orphans,
    [],
    `these slots have no item in ${CHECKLIST}, so an adopter can finish the checklist ` +
      `with them untouched — add an item carrying <!-- template:<slug> -->`,
  );
});

test("every checklist item points at a slot that still exists", () => {
  const stale = [...items].filter((slug) => !slots.has(slug));

  assert.deepEqual(
    stale,
    [],
    `${CHECKLIST} references slots that no longer exist in the tree — either the marker ` +
      `was removed and the item should go, or the id was misspelled on one side`,
  );
});

test("no slot is left untagged", () => {
  const untagged = sources
    .filter(({ body }) => UNTAGGED.test(body))
    .map(({ path }) => path)
    .concat(UNTAGGED.test(checklist) ? [CHECKLIST] : []);

  assert.deepEqual(
    untagged,
    [],
    `an id-less marker cannot be matched to a checklist item in either direction. ` +
      `Give it an id, or — if the text is prose about the convention rather than a real ` +
      `slot — write the placeholder form TODO(template:<slug>) instead. ` +
      `This guard holds itself to the same rule, which is why it never writes the ` +
      `id-less form out in full`,
  );
});
