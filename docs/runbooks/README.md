# Runbooks

Procedures a human follows under pressure: a break-glass credential recovery, a
failed deploy, a data repair, restoring from backup.

## What separates a runbook from a wiki page

**The verification drill.** A runbook whose steps have never been executed
against a real system is a hypothesis. Every runbook here ends with a drill —
the steps to *prove* the procedure works, safe to run on a scratch environment —
and a date recording the last time someone ran it.

The drill is the whole point. The failure mode this directory exists to prevent
is a confident procedure that turns out to reference a flag that was renamed two
releases ago, discovered at 03:00 by the one person who can fix it.

## Rules

- Written for someone who is **not** the author, at their worst hour. No implicit
  context, no "obviously".
- Exact commands, copy-pasteable, with the expected output shown.
- Every destructive step states what it destroys and how to undo it — or says
  plainly that it cannot be undone.
- **No environment values.** Connection strings, hostnames, CIDRs and credentials
  live in the deployment repo or the secret store, not here. A runbook names the
  *variable*; the ops repo holds the *value*.
- Re-run the drill after any change to the code paths it touches, and update the
  date.

Copy [`TEMPLATE.md`](TEMPLATE.md) to start one.
