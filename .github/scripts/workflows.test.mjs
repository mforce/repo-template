// Guards over the workflow files themselves. Run: node --test .github/scripts/*.test.mjs
//
// These are GUARDS, not coverage. Workflows have no compiler and no type
// checker, so an invariant stated only in a YAML comment is enforced by nothing.
// Anything here should be a rule that, if broken, produces a CI failure whose
// cause is not obvious from the red.

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const WORKFLOWS = fileURLToPath(new URL("../workflows/", import.meta.url));

// Walk every workflow, rather than naming the two we happen to know about. An
// inclusion list silently shrinks as the repo grows: a third placeholder added
// later would simply not be checked.
const workflows = readdirSync(WORKFLOWS)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .map((name) => ({ name, body: readFileSync(join(WORKFLOWS, name), "utf8") }));

// The template ships unimplemented steps in more than one workflow. Each must
// PASS WITH A WARNING while TEMPLATE-SETUP.md exists and FAIL once it is gone —
// the repo is admittedly un-set-up until that file is deleted, and per
// docs/decisions/000 a red nobody can fix from a branch teaches people to ignore
// red, which does not stay confined to the check that earned it. An
// unconditional `exit 1` in a *scheduled* workflow is the worst version: it
// fails every week, on a trigger no one chose, for a reason no change can fix.
//
// This is the "if you change one, change the other" note in those files, made
// enforceable — a comment cannot fail.
test("every unimplemented placeholder is keyed to TEMPLATE-SETUP.md, not an unconditional red", () => {
  const placeholders = workflows.filter((w) => w.body.includes("not implemented"));

  // Without this the guard passes vacuously the moment the marker is reworded:
  // zero placeholders found, zero assertions run, green. Two is what exists
  // today; a new one must be added here deliberately, not discovered by silence.
  assert.ok(
    placeholders.length >= 2,
    `expected at least 2 placeholder workflows, found ${placeholders.length} ` +
      `(${placeholders.map((p) => p.name).join(", ") || "none"}) — if the marker was ` +
      `reworded, update this test rather than letting it check nothing`,
  );

  for (const { name, body } of placeholders) {
    assert.ok(
      body.includes("[ -f TEMPLATE-SETUP.md ]"),
      `${name}: an unimplemented step must be keyed to TEMPLATE-SETUP.md so it warns ` +
        `while the repo is un-set-up and fails once it claims to be set up`,
    );
    assert.match(
      body,
      /::warning title=[^:]*not implemented/,
      `${name}: the passing branch must emit a ::warning, or an un-set-up repo looks clean`,
    );
    assert.match(
      body,
      /::error title=[^:]*not implemented/,
      `${name}: the failing branch must emit an ::error naming what is missing`,
    );
  }
});

// Every third-party action is pinned to a full 40-hex commit SHA with a trailing
// version comment. `actions/*` and `github/*` may keep major tags — GitHub owns
// those namespaces. Tag retargeting is a live supply-chain shape
// (tj-actions/changed-files 2025-03, aquasecurity/trivy-action 2026-03), and a
// mutable tag means you review one thing and run another.
test("third-party actions are pinned to a full commit SHA, not a mutable tag", () => {
  const offenders = [];
  let checked = 0;

  for (const { name, body } of workflows) {
    for (const line of body.split("\n")) {
      const match = line.match(/^\s*(?:-\s*)?uses:\s*([^\s@]+)@([^\s#]+)\s*(.*)$/);
      if (!match) continue;
      const [, action, ref, trailer] = match;
      if (/^(actions|github)\//.test(action)) continue; // GitHub-owned namespaces
      checked++;
      if (!/^[0-9a-f]{40}$/.test(ref)) offenders.push(`${name}: ${action}@${ref} is not a full SHA`);
      else if (!/^#\s*v?\d/.test(trailer.trim()))
        offenders.push(`${name}: ${action} is SHA-pinned but has no trailing "# vX.Y.Z" comment`);
    }
  }

  // Same vacuity trap as above: if the `uses:` regex ever stops matching, this
  // test would pass having examined nothing.
  assert.ok(checked > 0, "found no third-party `uses:` lines to check — the matcher is broken");
  assert.deepEqual(offenders, []);
});
