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

  // No count floor. An adopter may legitimately drop a placeholder workflow, and
  // asserting "at least 2" turned that into a red they could not act on — the
  // second time a hardcoded floor did that here, so the method is what changed.
  // Vacuity is caught by comparing two independently-derived sets instead: a
  // workflow keyed to the checklist but no longer marked, or the reverse, means
  // one of the two markers was reworded and the checks below stopped meaning
  // anything. Both empty is consistent — every placeholder was filled in.
  const keyed = workflows.filter((w) => w.body.includes("[ -f TEMPLATE-SETUP.md ]"));
  assert.deepEqual(
    placeholders.map((w) => w.name).sort(),
    keyed.map((w) => w.name).sort(),
    "the 'not implemented' marker and the TEMPLATE-SETUP.md key disagree about which " +
      "workflows are placeholders — one of them was reworded, so these checks are vacuous",
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

// Release automation is gated on the template's own placeholder package name.
// A fresh clone has not chosen one, and release-please there pushes its branch
// and then dies on PR creation — GITHUB_TOKEN cannot open a PR unless the repo
// setting is on — so the first push to main goes red for a reason no branch can
// fix. That is the shape docs/decisions/000 rules out.
//
// The gate is one file grepping a literal string out of another, so it stops
// matching silently if either side is reworded. Both sides are checked against
// the declaration below rather than against each other — comparing them to each
// other cannot tell a maintainer's typo from an adopter naming their package,
// and the version that guessed (any name containing "TODO" is a placeholder)
// would have gone red on an adopter who picked one.
//
// Reading the whole command, not the literal alone: `grep -qv` keeps the string
// and inverts the gate, which would leave release automation idle forever in a
// repo that finished setup.
//
// LIMIT, stated: an adopter's own package name is not checked against anything,
// so rewording the placeholder in the config ALONE is not caught. That direction
// arms the workflow rather than disarming it, and it shows up as the same red
// this gate exists to prevent, on the first push after the change.
const PLACEHOLDER = "TODO-template-package-name";

test("release automation stays idle while the package name is the template placeholder", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const workflow = workflows.find((w) => w.name === "release-please.yml");
  let config = null;
  try {
    config = JSON.parse(readFileSync(join(root, "release-please-config.json"), "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  // Dropping the `releases` part deletes both. Either one alone is the state
  // worth failing on: a workflow with no config cannot run, and a config with
  // no workflow never does.
  assert.equal(
    Boolean(workflow),
    Boolean(config),
    "release-please.yml and release-please-config.json must be present or absent together",
  );
  if (!workflow || !config) return;

  assert.ok(
    config.packages?.["."]?.["package-name"],
    "release-please-config.json has no package-name for the root package",
  );

  // Which branch does what, not just which strings appear. A swap of the two
  // assignments, or an inverted grep, keeps every literal and ships a gate that
  // is either always open or never open.
  const gate = workflow.body.match(
    /if ! grep -q '([^']*)' release-please-config\.json; then\n\s*echo "named=true"[\s\S]{0,120}?\n\s*elif \[ -f TEMPLATE-SETUP\.md \]; then\n\s*echo "named=false"/,
  );
  assert.ok(
    gate,
    "release-please.yml must decide in this order: a named package runs release-please, " +
      "the placeholder plus TEMPLATE-SETUP.md warns and stops, anything else fails. Any " +
      "other spelling inverts the gate or drops a state, and both are silent",
  );
  assert.equal(
    gate[1],
    PLACEHOLDER,
    `release-please.yml greps for ${JSON.stringify(gate[1])}, but the template's placeholder ` +
      `package name is ${JSON.stringify(PLACEHOLDER)} — a gate that cannot match arms release ` +
      `automation on an un-set-up repo, which goes red on its first push to main`,
  );

  // The third state is the one that earned this: a repo that deleted the
  // checklist without naming the package has declared itself set up, and a gate
  // that stays quiet there disables releases for good with a green tick over it.
  assert.match(
    workflow.body,
    /else\n\s*echo "::error title=[^:]*not implemented[\s\S]{0,600}?\n\s*exit 1\n/,
    "release-please.yml must fail once TEMPLATE-SETUP.md is gone and the package is still " +
      "unnamed — silently skipping there is a release pipeline nobody knows is off",
  );

  // Both files the gate reads have to be IN the checkout. A sparse checkout that
  // omits one makes `[ -f ]` false everywhere and the test above cannot see it:
  // the workflow reads correctly and behaves as if the file never exists.
  //
  // Only when the checkout IS sparse. Dropping the narrowing for a plain full
  // checkout leaves both files present and the workflow correct, and an earlier
  // version failed there — a red on a change that broke nothing.
  const key = workflow.body.match(/^([ \t]*)sparse-checkout:[ \t]*(.*)$/m);
  if (!key) return;

  let listed;
  if (key[2].trim().startsWith("|")) {
    const after = workflow.body.slice(workflow.body.indexOf(key[0]) + key[0].length).split("\n").slice(1);
    listed = [];
    for (const line of after) {
      if (line.trim() === "") continue;
      if (line.length - line.replace(/^[ \t]*/, "").length <= key[1].length) break;
      listed.push(line.trim());
    }
  } else {
    listed = [key[2].trim()]; // one path, inline
  }

  for (const file of ["release-please-config.json", "TEMPLATE-SETUP.md"]) {
    assert.ok(
      listed.includes(file),
      `${file} is read by the gate but not in the sparse-checkout — it will be missing at ` +
        `runtime, and the gate reads a repo that does not contain it`,
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
  let seen = 0;     // every `uses:` key, however spaced
  let parsed = 0;   // of those, ones carrying an @ref we could split
  let checked = 0;  // of those, the third-party ones held to the SHA rule

  for (const { name, body } of workflows) {
    for (const line of body.split("\n")) {
      // Tolerant on YAML spacing: `uses : x@v5` is valid and used to escape both
      // this and the vacuity count, so a mutable tag passed the guard silently.
      const key = line.match(/^\s*(?:-\s*)?uses\s*:\s*(\S.*?)\s*$/);
      if (!key) continue;
      seen++;
      const value = key[1];
      // Local actions and container refs carry no @ref and are not marketplace
      // actions, so the SHA rule does not govern them. Counted as understood so
      // the vacuity check below stays meaningful.
      if (/^\.{1,2}\//.test(value) || value.startsWith("docker://")) { parsed++; continue; }
      const match = value.match(/^([^\s@]+)@([^\s#]+)\s*(.*)$/);
      if (!match) { offenders.push(`${name}: cannot parse \`uses: ${value}\``); continue; }
      const [, action, ref, trailer] = match;
      parsed++;
      if (/^(actions|github)\//.test(action)) continue; // GitHub-owned namespaces
      checked++;
      if (!/^[0-9a-f]{40}$/.test(ref)) offenders.push(`${name}: ${action}@${ref} is not a full SHA`);
      else if (!/^#\s*v?\d/.test(trailer.trim()))
        offenders.push(`${name}: ${action} is SHA-pinned but has no trailing "# vX.Y.Z" comment`);
    }
  }

  // A repo with no third-party actions at all is a legitimate state — an adopter
  // who drops the release workflow reaches it, and this used to fail there, which
  // is a red nobody can act on. So distinguish the two cases: no third-party
  // `uses:` anywhere is fine, but `uses:` lines existing while none of them parse
  // means the matcher broke and every assertion below is vacuous.
  // The vacuity risk is the MATCHER breaking, not the repo having no third-party
  // actions. Those are different: an adopter who drops the release workflow has
  // only `actions/*` left, which is a legitimate state that must stay green.
  // Compare raw `uses:` lines against ones the regex understood.
  assert.ok(
    seen === 0 || parsed > 0,
    `${seen} \`uses:\` keys exist but none carried a parsable @ref — this check is vacuous`,
  );
  assert.deepEqual(offenders, []);
});

// INDEPENDENT OF BOTH MARKERS, deliberately. The check above compares two sets
// derived from the same file, so it sees the markers diverge from each other but
// not a workflow leaving the set — delete both at once and a bare `exit 1` walks
// straight through. That is the state the header calls the worst version, so it
// needs a detector that reads neither marker.
//
// "Bare failure" = a run block that, ignoring comments and `set -*`, does
// nothing but print and exit non-zero. A real build step runs something; an
// `exit 1` inside one is error handling and is not flagged.
//
// LIMIT, stated rather than implied: the per-line test is shell-shaped, not a
// shell parser. `echo exit 1`, `exit $X` and an exit inside a loop are judged by
// line shape alone. It catches the placeholder people
// actually write; it is not a proof that no step can only fail.
// Every `run:` script this guard is willing to reason about.
//
// LITERAL BLOCKS AND INLINE SCALARS ONLY. Folded `run: >` is skipped on purpose.
// Folding joins lines with spaces inside a paragraph and with newlines across
// blank ones, and it happens BEFORE the shell sees anything — so `# comment` on
// one line and `exit 1` on the next fold into a single comment that never runs.
// Reproducing that faithfully needs a YAML parser and a shell parser inside a
// guard, and two attempts to approximate it produced a false red on a valid
// workflow. Literal blocks and inline scalars are line-faithful: what the file
// shows is what the shell gets.
//
// The gap is real and narrow — a placeholder written as a folded scalar is not
// detected. Being right about less beats being wrong about more.
// → docs/decisions/001-writing-a-guard.md
function runScripts(body) {
  const found = [];
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const indentOf = (l) => l.length - l.replace(/^[ \t]*/, "").length;

  for (let i = 0; i < lines.length; i++) {
    // Inline: `run: exit 1`. One command, nothing to fold.
    const inline = lines[i].match(
      /^[ \t]*(?:-[ \t]+)?run[ \t]*:[ \t]*([^|>\s#][^#]*?)[ \t]*(?:#.*)?$/,
    );
    if (inline) { found.push([inline[1]]); continue; }

    const key = lines[i].match(
      /^([ \t]*)((?:-[ \t]+)?)run[ \t]*:[ \t]*([|>])(?:[+-]?\d*|\d*[+-]?)[ \t]*(?:#.*)?$/,
    );
    if (!key || key[3] === ">") continue; // folded — see above
    const keyIndent = key[1].length + key[2].length;

    const collected = [];
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (line.trim() === "") { collected.push(""); continue; }
      if (indentOf(line) <= keyIndent) break;
      collected.push(line);
    }
    if (collected.length) found.push(collected);
  }
  return found;
}


test("no workflow ships a step that can only fail", () => {
  const bare = [];
  for (const { name, body } of workflows) {
    for (const raw of runScripts(body)) {
      const lines = raw
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#") && !/^set\s/.test(l));
      if (!lines.length) continue;
      const fails = lines.some((l) => /^exit\s+[1-9]/.test(l));
      const onlyTalks = lines.every((l) => /^(echo|printf)\b/.test(l) || /^exit\s+\d/.test(l));
      // Exempt on the actual guard, not a substring: `block.includes` fired from
      // a comment, so `# see TEMPLATE-SETUP.md` above a bare `exit 1` muted this
      // entirely. `lines` already has comments stripped.
      const keyed = lines.some((l) => l.includes("[ -f TEMPLATE-SETUP.md ]"));
      if (fails && onlyTalks && !keyed) {
        bare.push(`${name}: ${lines.join(" ; ").slice(0, 90)}`);
      }
    }
  }
  assert.deepEqual(
    bare,
    [],
    "these steps do nothing but fail, and are not keyed to TEMPLATE-SETUP.md — an " +
      "unconditional red with no action attached",
  );
});
