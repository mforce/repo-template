# Releases and artifact publishing

> **Rule** — the short version is in [`AGENTS.md`](../../AGENTS.md).
>
> **Provenance:** inherited with the repo template. The shipped workflow covers
> the version/changelog half only; the publish half is registry-specific and
> ships as reasoning plus a link to a worked implementation.

## Two stages, deliberately separate

1. **CI publishes an artifact per merge**, addressed by commit (`…:sha-<commit>`),
   scanned and tested.
2. **Merging the "Release vX.Y.Z" PR turns one of those into a version.**

Keeping them apart is what makes a release a *promotion of already-reviewed bytes*
rather than a fresh build nobody looked at.

## Invariants, if you add the publish half

- **Promotion is a server-side retag of the existing digest, never a rebuild.**
  A rebuild yields different bytes than the ones any scan examined. For OCI,
  `docker buildx imagetools create --prefer-index=false` — the flag is
  load-bearing, because the default wraps the result in a *new* top-level digest.
- **Read the digest from CI's own run artifact, never by resolving the
  `sha-<commit>` tag.** That tag is mutable, and there is a public window between
  merge and CI's push in which anyone with registry write can occupy it.
- **A CI job that should gate a release must be in the publish job's `needs`.**
  That list is exactly what the digest artifact proves, and nothing else enforces
  it.
- **Keep the release a draft until its artifact is promoted.** GitHub withholds
  the git tag for a draft, so a failed promotion leaves no version pointing at
  nothing.
- **Deploy by digest, never by tag.** Treat *obtaining* the digest and *verifying*
  its origin as separate problems: publish an `image.json` release asset carrying
  `reference`/`digest`/`commit`, then verify provenance bound to the workflow
  **and** the source ref.

## Where the verification boundary actually is

State this at exactly the strength the argument supports — overstating it is how
it gets discovered to be false and then discarded whole.

- Attestation **fails closed for a leaked registry credential**: substituted bytes
  carry no valid attestation.
- Binding to the signer workflow and source ref additionally stops a **branch
  push** substituting its own bytes.
- It does **not** stop a branch writer swapping in *other* attested bytes.
- **None of it survives a merge to `main`.** Once a modified workflow is the
  definition on `main`, its attestation is genuinely valid — the ref binding
  records *which ref built this*, not *whether that ref is trustworthy*. Review of
  changes to `main` is the only control that closes it.

Keep **this file** canonical if you restate the boundary elsewhere. Successive
corrections reliably update one copy and leave the others contradicting it.

## Version mapping, and the silent flip at 1.0.0

```
bump-minor-pre-major: true              feat! / BREAKING CHANGE → minor
bump-patch-for-minor-pre-major: true    feat: and everything else → patch
```

Both apply **only below 1.0.0**. The mapping flips at 1.0.0 with no warning and
no config change: the same `feat!:` that yielded `0.4.0` yields `2.0.0`. Get
there deliberately with a `Release-As: 1.0.0` footer.

## The parse trap

release-please parses the **whole** message, subject and body. A parse error is
caught, logged, and the commit dropped entirely — no changelog entry, no bump —
while the workflow reports success. Silent in both directions.

Concretely: **a body line starting with `word(` that contains another `(` before
the first `)`** — `foo(bar(baz))` breaks, `foo(bar)(baz)` does not.
`.githooks/commit-msg` catches it locally, and its regex is the authority if this
prose and that ever disagree.

The half no hook can catch is the **subject of a multi-commit squash**, which
GitHub takes from the PR title. Hence "the PR title is the release note" is a
review rule, not a hook.

## Never hand-edit the manifest or version file

release-please owns `.release-please-manifest.json` and `version.txt`. A manual
edit desynchronises it from the tags that exist, after which it either re-proposes
a released version or skips one.

Related: keep `package-name` free of characters git rejects in a ref (notably
`:`). release-please derives its release-PR branch from that value, so an invalid
ref stops the release PR being created or updated at all.

## Reference implementation — OCI images on GHCR

A full worked copy of the three jobs — `publish` in `ci.yml`, `promote` and
`groom` in `release-please.yml` — lives in
[mforce/collectify](https://github.com/mforce/collectify/tree/main/.github/workflows).
The invariants above are registry-agnostic; that wiring is one concrete
instantiation. Everything registry-specific is a `vars`/`secrets` lookup, so the
same jobs target Gitea or Harbor by setting `REGISTRY`, `IMAGE_NAME`,
`REGISTRY_USER`, `REGISTRY_TOKEN`:

```yaml
env:
  REGISTRY: ${{ vars.REGISTRY || 'ghcr.io' }}
  IMAGE_NAME: ${{ vars.IMAGE_NAME || github.repository }}
```

**The shape, as linked.** CI builds the native arch to a local tag, scans it
(Trivy `HIGH,CRITICAL`, `ignore-unfixed`, `exit-code: 1`) and **boots** it — a
green scan on an unbootable image is a false pass. On a merge it then builds
multi-arch and pushes **by digest** (`--output type=image,push-by-digest=true`),
handing `publish` the image and digest as job outputs. `publish` attests that
digest **before** recording it, so a failed attestation leaves nothing behind.
`promote` reads the recorded digest, verifies the attestation, retags
server-side, then undrafts the release.

A manifest list cannot round-trip through `docker save`/`--load`, which is why
the linked pipeline pushes by digest rather than handing over a tarball. Shipping
one architecture buys a stronger handoff instead — see *Arch coverage* below.

**Why `groom` is a separate pass.** A release stays a draft until promoted, and
GitHub withholds the tag for a draft — so a single release-please pass would
compute the next PR at the one moment the new version has no tag, and restate
every prior changelog entry.

**Details with a wrong default**, each of which has bitten:

- **`--prefer-index=false`** on the retag; the default wraps the manifest in a new
  index with a different top-level digest.
- **Provenance verify needs all three flags** — `--bundle-from-oci`,
  `--signer-workflow`, `--source-ref refs/heads/main`. None is the default, and
  the last means a repair dispatch must run *from* main.
- **Confirm the retag by comparing digests.** `imagetools inspect --format
  '{{json .Manifest.Digest}}'`, then assert it equals the digest you verified,
  and fail the job if it does not — otherwise a raced or unexpected retag
  undrafts a release whose version tag resolves to different bytes. The
  non-`json` form is mis-detected by older buildx and dumps the whole manifest.
- **`groom`'s draft guard needs push access** (an App token, not
  `contents: read`). GitHub returns draft releases only to a caller with push, so
  probing with the ambient token lists none and the guard silently never fires.

**Arch coverage is your call.** Single-arch is both simpler and a *stronger*
handoff: `--load`, `docker save` and the image-Id handoff are all
single-platform, so `publish` can assert the bytes it loads are the exact bytes
that were scanned and booted. A multi-arch manifest list round-trips through none
of them, so it needs a push-by-digest build plus a server-side `imagetools
create` — scanning and booting the native arch and trusting the builder for the
other. That is the trade: wider reach, weaker handoff. Decide consciously.
