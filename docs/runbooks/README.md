# Runbooks

Procedures a human follows under pressure: break-glass credential recovery, a
failed deploy, a data repair, restoring from backup.

## What separates a runbook from a wiki page

**The verification drill.** A procedure never executed against a real system is a
hypothesis. Every runbook here ends with a drill — the steps to *prove* it works,
safe on a scratch environment — and the date it was last run.

That is the whole point. The failure this directory prevents is a confident
procedure that references a flag renamed two releases ago, discovered at 03:00 by
the one person who can fix it.

## Rules

- Written for someone who is **not** the author, at their worst hour. No implicit
  context, no "obviously".
- Exact copy-pasteable commands, with the expected output shown.
- Every destructive step states what it destroys and how to undo it — or says
  plainly that it cannot be undone.
- **No environment values.** Connection strings, hostnames, CIDRs and credentials
  live in a secret store, with only its wiring in the deployment repo — never
  here and never in either repo's history. A runbook names the *variable*.
- Re-run the drill after any change to the code paths it touches, and update the
  date.

Copy [`TEMPLATE.md`](TEMPLATE.md) to start one.
