# Releases and artifact publishing

> **Rule** — the one-paragraph version lives in [`AGENTS.md`](../../AGENTS.md).
>
> **Provenance:** inherited with the repo template. The workflow shipped here
> covers only the version/changelog half; the publish half is registry-specific,
> so it ships as reasoning (below) plus a copy-paste OCI/GHCR reference
> implementation ("Reference implementation — OCI images on GHCR"), not as a live
> workflow.

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

## Reference implementation — OCI images on GHCR

The invariants above are registry-agnostic; this is one concrete wiring of them
for OCI images pushed to GHCR, adapted from the pipeline proposed in
[mforce/collectify#116](https://github.com/mforce/collectify/pull/116) (not yet
merged, so treat it as a worked design, not a battle-tested one). Copy the jobs,
then fill the `TODO(template:<slug>)` markers. Everything registry-specific is a
`vars`/`secrets` lookup, so the same jobs target Gitea/Harbor by setting
`REGISTRY`, `IMAGE_NAME`, `REGISTRY_USER`, `REGISTRY_TOKEN` — no YAML change.

> **The jobs below are the single-arch (`linux/amd64`) variant — the simplest
> one.** `--load`, `docker save`, and the image-Id handoff are all
> single-platform, and that is exactly what lets the same bytes be scanned,
> boot-tested, *and* handed to publish unchanged. A multi-arch manifest list can
> round-trip through none of them. Publishing `linux/amd64+arm64` (which the
> linked collectify pipeline does, for Raspberry Pi / Apple Silicon) means
> replacing the save/load handoff with a **push-by-digest** build (`--output
> type=image,push-by-digest=true`), then a server-side `imagetools create` tag in
> publish — scanning and booting the native arch and trusting the builder for the
> other. Decide the arch coverage consciously; don't let a template make that
> call for you.

Add to the top of **both** `ci.yml` and `release-please.yml`:

```yaml
env:
  REGISTRY: ${{ vars.REGISTRY || 'ghcr.io' }}
  IMAGE_NAME: ${{ vars.IMAGE_NAME || github.repository }}
```

### 1. `ci.yml` — build, scan, and export the image (app-specific)

The build + scan + boot-smoke half is where your stack shows through, so it stays
a `TODO(template:<slug>)`. The contract it must satisfy for the publish job below:

- Build the runtime image to a local tag (e.g. `app:ci`) with a
  `docker-container` buildx driver and `--load` so the scanner sees the freshly
  built bytes, not a re-pull.
- **Scan it** (Trivy `severity: HIGH,CRITICAL`, `ignore-unfixed: true`,
  `exit-code: 1`) and **boot it** — prove it starts and serves, not just that it
  builds. A green scan on an unbootable image is a false pass. Pin
  `aquasecurity/trivy-action` to a **commit SHA**, not a tag — it is the named
  2026-03 tag-retargeting incident, so this is the one action where the rule is
  not optional.
- Only on a merge to `main` (or a repair dispatch), `docker save | gzip` the
  image to an artifact named `runtime-image`, and expose the local image Id as a
  job output so the publish job can prove the handoff carried the scanned bytes:

```yaml
    outputs:
      image_id: ${{ steps.export.outputs.image_id }}
    # …after build + scan + smoke test…
      - name: Export the verified image for publishing
        id: export
        if: (github.event_name == 'push' && github.ref == 'refs/heads/main') || github.event_name == 'workflow_dispatch'
        run: |
          set -euo pipefail
          docker save app:ci | gzip > image.tar.gz
          printf 'image_id=%s\n' "$(docker image inspect -f '{{.Id}}' app:ci)" >> "$GITHUB_OUTPUT"
      - name: Upload the verified image
        if: (github.event_name == 'push' && github.ref == 'refs/heads/main') || github.event_name == 'workflow_dispatch'
        uses: actions/upload-artifact@v7
        with:
          name: runtime-image
          path: image.tar.gz
          compression-level: 0   # already gzipped
          retention-days: 1      # intra-run handoff; the registry is the durable copy
```

### 2. `ci.yml` — publish the commit image (generic)

Gated on **every** job that should gate a release — that `needs` list is exactly
what the digest artifact proves downstream (invariant above). Publishes
`:sha-<commit>`, then **attests the digest before recording it**, so a failed
attestation leaves no artifact behind.

```yaml
  publish:
    name: Publish the commit image
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [build-and-test, image]   # TODO(template:release-publish-needs) add EVERY release-gating job
    if: (github.event_name == 'push' && github.ref == 'refs/heads/main') || github.event_name == 'workflow_dispatch'
    permissions:
      contents: read
      packages: write      # push to GHCR
      id-token: write      # OIDC token for the provenance signer
      attestations: write  # record the attestation
    outputs:
      image: ${{ steps.publish.outputs.image }}
      digest: ${{ steps.publish.outputs.digest }}
    steps:
      # A dispatch names its own commit; a push is its own. Either way the commit
      # must ALREADY be on main's history, or this would publish arbitrary branch
      # content under a :sha- name the release workflow will promote.
      - name: Resolve and authorise the commit to publish
        id: target
        env:
          GH_TOKEN: ${{ github.token }}
          INPUT_SHA: ${{ inputs.sha }}
        run: |
          set -euo pipefail
          sha="${INPUT_SHA:-$GITHUB_SHA}"
          if ! printf '%s' "$sha" | grep -qE '^[0-9a-f]{40}$'; then
            echo "::error::'${sha:-(empty)}' is not a full commit sha"; exit 1
          fi
          status="$(gh api "repos/$GITHUB_REPOSITORY/compare/main...$sha" --jq '.status')"
          case "$status" in
            identical|behind) ;;
            *) echo "::error::$sha is not an ancestor of main ($status) — refusing"; exit 1 ;;
          esac
          printf 'sha=%s\n' "$sha" >> "$GITHUB_OUTPUT"

      - name: Download the verified image
        uses: actions/download-artifact@v8
        with:
          name: runtime-image

      # Assert the loaded bytes are the SCANNED bytes, by local image Id.
      - name: Load and verify the image
        env:
          EXPECTED_ID: ${{ needs.image.outputs.image_id }}
        run: |
          set -euo pipefail
          gunzip -c image.tar.gz | docker load
          loaded="$(docker image inspect -f '{{.Id}}' app:ci)"
          if [ -z "$EXPECTED_ID" ] || [ "$loaded" != "$EXPECTED_ID" ]; then
            echo "::error::loaded image ${loaded} is not the scanned image ${EXPECTED_ID:-(unset)}"; exit 1
          fi

      - name: Log in to ${{ env.REGISTRY }}
        # docker/* is third-party — SHA-pin it (resolve the current commit for
        # your chosen version and keep the trailing `# vX` for Dependabot).
        uses: docker/login-action@<commit-sha> # v4
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.REGISTRY_USER || 'x-access-token' }}
          password: ${{ secrets.REGISTRY_TOKEN || secrets.GITHUB_TOKEN }}

      - name: Publish the commit image
        id: publish
        env:
          SHA: ${{ steps.target.outputs.sha }}
        run: |
          set -euo pipefail
          image="$(printf '%s/%s' "$REGISTRY" "$IMAGE_NAME" | tr '[:upper:]' '[:lower:]')"
          docker tag app:ci "$image:sha-$SHA"
          docker push "$image:sha-$SHA"
          # The MANIFEST digest exists only once the image is in a registry
          # (RepoDigests is empty before the push); it differs from the local Id.
          digest="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$image:sha-$SHA" \
            | grep -F "$image@" | grep -oE 'sha256:[0-9a-f]{64}' | head -1 || true)"
          if [ -z "$digest" ]; then
            echo "::error::no manifest digest after push"; exit 1
          fi
          printf 'image=%s\n' "$image" >> "$GITHUB_OUTPUT"
          printf 'digest=%s\n' "$digest" >> "$GITHUB_OUTPUT"
          printf '%s\n' "$digest" > published-digest.txt

      # BEFORE the digest artifact, so a failed attestation leaves nothing behind.
      - name: Attest the published image's build provenance
        uses: actions/attest-build-provenance@v4
        with:
          subject-name: ${{ steps.publish.outputs.image }}
          subject-digest: ${{ steps.publish.outputs.digest }}
          push-to-registry: true   # store as an OCI referrer, for --bundle-from-oci

      # Named by COMMIT, not run: a repair dispatch reports the branch tip as
      # head_sha, so a run-keyed lookup would miss exactly the repair case.
      - name: Record the published digest
        uses: actions/upload-artifact@v7
        with:
          name: published-digest-${{ steps.target.outputs.sha }}
          path: published-digest.txt
          retention-days: 90
```

The `workflow_dispatch` input (`sha`) that the repair path reads:

```yaml
on:
  workflow_dispatch:
    inputs:
      sha:
        description: "Commit on main to build and publish (repair a skipped run)"
        required: true
        type: string
```

### 3. `release-please.yml` — promote the verified digest

Replace the template's single `release-please` job with **cut / promote / groom**.
`promote` reads the digest from CI's artifact (never the mutable tag), verifies
its attestation, then server-side retags. `groom` exists because a release stays
a **draft until promoted** and GitHub withholds the tag for a draft — so a single
release-please pass would compute the next PR at the one moment the new version
has no tag and restate every prior changelog. Split the passes:

```yaml
jobs:
  release-please:      # skip-github-pull-request: true  → cut only
  promote:             # needs: release-please; reads published-digest-<sha>,
                       # verifies attestation, retags with
                       # `docker buildx imagetools create --prefer-index=false`,
                       # then `gh release edit --draft=false` (creates the tag)
  groom:               # needs: [release-please, promote]; skip-github-release: true
                       # guarded: refuse to groom while v<manifest> is a tagless draft
```

The load-bearing details, each of which has a wrong default:

- **`--prefer-index=false`** on the retag — the default `true` wraps the manifest
  in a new index with a different top-level digest, so the version tag would no
  longer resolve to the scanned digest.
- **Provenance verify with all three flags** — none is the default:
  `--bundle-from-oci` (read the registry copy), `--signer-workflow` (bind to the
  workflow path), `--source-ref refs/heads/main` (bind to the ref — so a repair
  dispatch must run *from* main). Boundary in the section above.
- **`docker buildx imagetools inspect --format '{{json .Manifest.Digest}}'`** to
  confirm the retag — the non-`json` form is mis-detected by older buildx and
  prints the whole manifest dump.
- **`groom`'s draft guard needs push access** (an App token, not the job's
  `contents: read` `GITHUB_TOKEN`) — GitHub returns draft releases only to a
  caller with push, so probing with the ambient token lists none and the guard
  silently never fires.

A full worked copy of all three jobs lives in
[mforce/collectify#116](https://github.com/mforce/collectify/pull/116/files)
(`ci.yml` publish job, `release-please.yml` promote/groom) — unmerged, so read it
as the same worked design, not as shipped code. (Once it merges this becomes a
`tree/main` link; the PR-files URL is used here because the branch disappears on
merge while the PR link survives.)
