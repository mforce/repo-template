# Releases and artifact publishing

> **Rule** — the one-paragraph version lives in [`AGENTS.md`](../../AGENTS.md).
>
> **Provenance:** inherited with the repo template. The workflow shipped here
> covers only the version/changelog half; the publish half is described but not
> implemented, because it is registry-specific.

## Two stages, deliberately separate

1. **CI publishes an artifact per merge**, addressed by commit
   (`…:sha-<commit>`), scanned and tested.
2. **Merging the "Release vX.Y.Z" PR turns one of those into a version.**

Keeping these apart is what makes a release a *promotion of already-reviewed
bytes* rather than a fresh build nobody looked at.

## Invariants, if you add the publish half

- **Promotion is a server-side retag of the existing digest, never a rebuild.**
  A rebuild yields different bytes than the ones any scan examined — same source,
  different artifact. For OCI images this is
  `docker buildx imagetools create --prefer-index=false`; the flag is
  load-bearing, because the default wraps the result in a *new* top-level digest.
- **Read the digest from CI's own run artifact, never by resolving the
  `sha-<commit>` tag.** That tag is mutable, and there is a public window between
  merge and CI's push in which anyone with registry write can occupy it.
- **Adding a CI job that should gate a release means adding it to the publish
  job's `needs`.** That list is exactly what the digest artifact proves, and
  nothing else enforces it.
- **Keep the release a draft until its artifact is promoted.** GitHub withholds
  the git tag for a draft release, so a failed promotion leaves no version
  pointing at nothing.
- **Deploy by digest, never by tag** — and treat *obtaining* the digest and
  *verifying* its origin as two separate problems. Publish an `image.json`
  release asset carrying `reference` / `digest` / `commit` so deploys do not
  parse prose or resolve a tag; verify with build-provenance attestation bound
  to the workflow **and** the source ref, then confirm the tag still resolves to
  the digest you verified.

## Where the verification boundary actually is

State this at exactly the strength the argument supports, because overstating it
is how it gets discovered to be false and then discarded whole:

- Attestation verification **fails closed for a leaked registry credential** —
  substituted bytes carry no valid attestation.
- Binding to the signer workflow and source ref additionally stops a **branch
  push** substituting its own bytes.
- It does **not** stop a branch writer swapping in *other* attested bytes. The
  tag/digest comparison raises the cost, but that actor holds registry write too.
- **And none of it survives a merge to `main`.** Once a modified workflow is the
  definition on `main`, its attestation is genuinely valid — right signer
  workflow, right source ref — because the ref binding records *which ref built
  this*, not *whether that ref's content is trustworthy*. Review of changes to
  `main` is the only control that closes it.

If you restate this boundary anywhere else (a README, a workflow comment), keep
**this file** canonical and have the others point here. Successive corrections
to a claim like this reliably update one copy and leave the others contradicting
it.

## Version mapping, and the silent flip at 1.0.0

The shipped config damps pre-1.0 bumps:

```
bump-minor-pre-major: true          feat! / BREAKING CHANGE → minor
bump-patch-for-minor-pre-major: true    feat: and everything else → patch
```

Both settings apply **only below 1.0.0**. The mapping flips at 1.0.0 with no
warning and no config change: the same `feat!:` that yielded `0.4.0` yields
`2.0.0`. Reach 1.0.0 deliberately with a `Release-As: 1.0.0` commit footer.

## The parse trap

release-please runs a conventional-commits parser over the **whole** message,
subject and body. A parse error is caught, logged, and the commit is dropped
entirely — no changelog entry, no bump contribution — while the workflow reports
success. It is silent in both directions.

Concretely: **a body line that starts with `word(` and contains another `(`
before the closing `)`** breaks it. `.githooks/commit-msg` catches that locally,
and explains the fix using the author's own line.

The half no local hook can catch is the **subject of a multi-commit squash**,
which GitHub takes from the **PR title**. That is why "the PR title is the
release note" is a review rule and not a hook.

## Never hand-edit the manifest or version file

`.release-please-manifest.json` and `version.txt` are owned by release-please.
A manual edit desynchronises it from the tags that actually exist, after which it
either re-proposes a version that is already released or skips one.
