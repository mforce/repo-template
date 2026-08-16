#!/bin/sh
# Pick which parts of the template to keep, then apply the repo settings the
# checklist cannot.
#
#   ./scripts/setup.sh              interactive
#   ./scripts/setup.sh --list       show the parts and exit
#   ./scripts/setup.sh --drop releases,codeql --settings mforce/my-repo
#   ./scripts/setup.sh --settings mforce/my-repo     settings only, drop nothing
#
# WHAT THIS DOES NOT DO. It deletes files; it does not rewrite prose. Dropping a
# part leaves the docs that describe it, so it prints every remaining reference
# and expects you to resolve them. Silently half-scrubbing prose is how a repo
# ends up documenting something it does not have — the failure this template has
# hit more than once. A list you must act on beats an edit you did not see.
#
# It runs the repo's own tests afterwards, so a part you dropped that something
# else depended on shows up now rather than on your first PR.
set -eu

DROP=""; SETTINGS=""; ASSUME_NO=0

# part|paths…|what it is
PARTS='releases|.github/workflows/release-please.yml release-please-config.json .release-please-manifest.json version.txt CHANGELOG.md docs/decisions/002-release-and-publish.md|release-please: version, changelog, draft release
commit-hook|.githooks/commit-msg|commit-msg hook (conventional commits + the release-please parse trap)
codeql|.github/workflows/codeql.yml|CodeQL static analysis (advisory)
audit-schedule|.github/workflows/security-audit.yml|weekly scheduled dependency audit
vuln-gate|.github/scripts/vuln-gate.mjs .github/scripts/vuln-gate.test.mjs .github/security-exceptions.json|fail-closed vulnerability gate + dated exceptions (SECURITY.md and ADR 000 are kept — they cover more than the gate; the scan lists what to prune)
dependabot|.github/dependabot.yml|grouped dependency updates
codeowners|.github/CODEOWNERS|required reviewers per path
runbooks|docs/runbooks|operational runbooks + drill template
pr-template|.github/pull_request_template.md|pull-request checklist'

# NOT OFFERED, deliberately. AGENTS.md and CLAUDE.md are the repo's ongoing brief
# — build commands, conventions, the deployment boundary, the release rules — and
# every ADR points at them. Dropping them is not opting out of agents, it is
# opting out of the documentation, and it would dangle ten files. Delete them by
# hand if you really mean it.

usage() { sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

list_parts() {
  printf '%s\n' "$PARTS" | while IFS='|' read -r name _paths desc; do
    printf '  %-16s %s\n' "$name" "$desc"
  done
  echo
  echo "  AGENTS.md / CLAUDE.md are not droppable: they are the repo's ongoing"
  echo "  brief, not setup scaffolding. Only TEMPLATE-SETUP.md is deleted at the end."
}

paths_for() {
  printf '%s\n' "$PARTS" | while IFS='|' read -r name paths _desc; do
    [ "$name" = "$1" ] && printf '%s' "$paths"
  done
}

# -F is load-bearing: without it the name is a regex here but a literal in
# paths_for, so `--drop 'rele.*'` validates, deletes nothing, and reports noise.
is_part() { printf '%s\n' "$PARTS" | cut -d'|' -f1 | grep -qxF "$1"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --list) list_parts; exit 0 ;;
    --drop) [ $# -ge 2 ] || { echo "setup.sh: --drop needs a comma-separated list" >&2; exit 2; }
            DROP="$2"; shift 2 ;;
    --settings) [ $# -ge 2 ] || { echo "setup.sh: --settings needs <owner>/<repo>" >&2; exit 2; }
            SETTINGS="$2"; shift 2 ;;
    --yes|-y) ASSUME_NO=1; shift ;;
    -h|--help) usage 0 ;;
    *) echo "unknown option: $1" >&2; usage 2 ;;
  esac
done

# `.git` is a FILE in a linked worktree or a submodule, so testing for a
# directory rejected valid repository roots. Ask git instead.
top="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$top" ] || { echo "setup.sh: not inside a git repository" >&2; exit 2; }
[ "$top" = "$PWD" ] || { echo "setup.sh: run this from the repo root ($top)" >&2; exit 2; }

# --- choose ------------------------------------------------------------------

if [ -z "$DROP" ] && [ -z "$SETTINGS" ] && [ "$ASSUME_NO" -eq 0 ] && [ -t 0 ]; then
  echo "Keep each part? (Y/n)  — anything you drop is deleted, not disabled."
  echo
  chosen=""
  # Read the menu from a copy on fd 3 so the loop's own stdin stays the terminal.
  menu="$(mktemp "${TMPDIR:-/tmp}/setup-parts.XXXXXX")"
  # INT/TERM must EXIT. A trap that only cleans up returns to the loop, and the
  # interrupted `read` becomes an empty answer — so Ctrl-C carried on through the
  # picker and could still delete what was chosen before it.
  trap 'rm -f "$menu"' EXIT
  trap 'rm -f "$menu"; echo; echo "cancelled — nothing was deleted" >&2; exit 130' INT
  trap 'rm -f "$menu"; exit 143' TERM
  printf '%s\n' "$PARTS" > "$menu"
  while IFS='|' read -r name paths desc <&3; do
    [ -e "$(printf '%s' "$paths" | cut -d' ' -f1)" ] || continue
    printf '  %-16s %s [Y/n] ' "$name" "$desc"
    read -r answer || answer=""
    case "$answer" in [Nn]*) chosen="$chosen$name," ;; esac
  done 3< "$menu"
  rm -f "$menu"; trap - EXIT INT TERM
  [ -n "${chosen:-}" ] && echo
  DROP="$chosen"
fi

# --- drop --------------------------------------------------------------------

dropped=""
removed_paths=""
if [ -n "$DROP" ]; then
  # -f disables pathname expansion: without it `--drop 'r*'` globs against the
  # working directory and rejects a filename the user never typed.
  set -f
  # Validate the WHOLE list first. Deleting as we go meant `--drop releases,typo`
  # destroyed releases before rejecting the typo, leaving a half-configured repo
  # and skipping both the reference scan and the tests.
  for part in $(printf '%s' "$DROP" | tr ',' ' '); do
    is_part "$part" || { echo "setup.sh: no such part '$part' (try --list)" >&2; exit 2; }
  done
  echo
  for part in $(printf '%s' "$DROP" | tr ',' ' '); do
    for p in $(paths_for "$part"); do
      removed_paths="$removed_paths $p"
      [ -e "$p" ] && { rm -rf "$p"; echo "  removed  $p"; }
    done
    dropped="$dropped $part"
  done
  set +f
fi

[ -n "$dropped" ] || echo "  nothing dropped"

# --- what still points at what you dropped -----------------------------------

if [ -n "$dropped" ]; then
  echo
  echo "References left behind — resolve these by hand:"
  found=0
  for part in $dropped; do
    # Every removed path, not just the first, and case-insensitively — `codeql`
    # otherwise missed every file that writes it "CodeQL".
    set -- -e "$part"
    for p in $(paths_for "$part"); do
      base="$(basename "$p")"
      set -- "$@" -e "$base" -e "${base%.*}"
    done
    hits="$(git grep -lni "$@" -- ':!scripts/setup.sh' 2>/dev/null || true)"
    if [ -n "$hits" ]; then
      found=1
      printf '  %s:\n' "$part"
      printf '%s\n' "$hits" | sed 's/^/    /'
    fi
  done
  [ "$found" -eq 1 ] || echo "  none"
fi

# --- prove the remainder still holds together --------------------------------

echo
if ! command -v node >/dev/null 2>&1; then
  echo "Skipping the template's tests: node is not installed." >&2
  echo "  The parts you kept were NOT verified as consistent. Install node and run" >&2
  echo "  'node --test .github/scripts/*.test.mjs', or check by hand." >&2
elif [ -d .github/scripts ] && ls .github/scripts/*.test.mjs >/dev/null 2>&1; then
  echo "Running the template's own tests:"
  if node --test .github/scripts/*.test.mjs >/dev/null 2>&1; then
    echo "  pass — the parts you kept are self-consistent"
  else
    echo "  FAIL — a part you kept depends on one you dropped:" >&2
    node --test .github/scripts/*.test.mjs 2>&1 | grep -E '^✖' | sed 's/^/    /' >&2
    echo "  Fix or drop the dependent part before committing." >&2
    exit 1
  fi
else
  echo "  (no tests left to run)"
fi

# --- repo settings the checklist cannot apply --------------------------------

if [ -n "$SETTINGS" ]; then
  echo
  command -v gh >/dev/null 2>&1 || { echo "setup.sh: --settings needs the gh CLI" >&2; exit 2; }
  echo "Applying repo settings to $SETTINGS:"

  # Enabling Dependabot alerts switches the Dependency graph on as a side effect,
  # which is what dependency-review probes for. Measured, not assumed.
  gh api -X PUT "repos/$SETTINGS/vulnerability-alerts" >/dev/null 2>&1 \
    && echo "  Dependabot alerts: on" || echo "  Dependabot alerts: FAILED (need admin?)" >&2

  code="$(gh api "repos/$SETTINGS/dependency-graph/sbom" --silent -i 2>/dev/null \
    | awk 'toupper($1) ~ /^HTTP/ {print $2; exit}')"
  echo "  Dependency graph probe: ${code:-no response} (want 200)"

  gh api -X PATCH "repos/$SETTINGS" \
    -F 'security_and_analysis[secret_scanning][status]=enabled' \
    -F 'security_and_analysis[secret_scanning_push_protection][status]=enabled' \
    >/dev/null 2>&1 && echo "  Secret scanning + push protection: on" \
    || echo "  Secret scanning: FAILED (public repo? admin?)" >&2

  # Branch protection is unavailable on a private free-plan repo; report the 403
  # rather than pretending. TEMPLATE-SETUP.md explains the choice it forces.
  prot="$(gh api "repos/$SETTINGS/branches/main/protection" --silent -i 2>/dev/null \
    | awk 'toupper($1) ~ /^HTTP/ {print $2; exit}')"
  case "$prot" in
    200) echo "  Branch protection: already configured" ;;
    404) echo "  Branch protection: available but not set — see TEMPLATE-SETUP.md step 5" ;;
    403) echo "  Branch protection: 403 — either unavailable on this plan/visibility,"
         echo "    or your token lacks repo Administration. Check which before changing"
         echo "    plans; TEMPLATE-SETUP.md step 5 covers the plan case." ;;
    *)   echo "  Branch protection: probe returned ${prot:-no response}" ;;
  esac
fi

echo
echo "Next: work through TEMPLATE-SETUP.md, then delete it."
