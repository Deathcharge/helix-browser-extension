# Samsarix Page Lens roadmap

This roadmap separates four gates: merge, release, publication, and flagship adoption. Passing one does not imply the next.

## Product boundary

Portfolio role: **integration or extension**. Keep its platform-specific packaging and release lifecycle separate. Any flagship integration should use a documented HTTP, event, or package contract with explicit auth, privacy, and failure ownership.
Planned repository identity: `Deathcharge/samsarix-page-lens` (ready).

Current disposition: Merge the productization branch after exact-head verification and rollback-ref creation; release and adoption remain separate decisions.

## Stabilize the productized default

- Keep the default branch buildable from a clean checkout and preserve exact-head CI evidence.
- Keep Samsarix LLC branding, package identity, license metadata, and compatibility aliases internally consistent.
- Preserve the pre-productization default under a rollback ref before merging; do not delete legacy history.
- Review priority: Publish visible heuristic limits.
- Review priority: bound DOM extraction.
- Review priority: decide URL retention.
- Review priority: commit Chrome integration tests.
- Review priority: reproduce and review the signed/store artifact.

## Release candidate

- Test the exact distributable on its target platform, including failure and upgrade paths.
- Review permissions, data retention, privacy copy, signing, and store or platform ownership.
- Release a prerelease to a bounded pilot before broad distribution.

Current hardening backlog:

- Popup/Chrome integration, extraction behavior, history, clipboard/export, and exact built artifact are not covered by the committed suite; manual toolbar `activeTab` behavior remains a release gate.
- No store account, screenshots, hosted privacy disclosure, signed submission, or adoption evidence.
- English-oriented tokenization/readability and crude “evidence”/structure heuristics can be misunderstood; the popup itself lacks the not-a-fact-check/methodology disclosure.
- DOM work is not bounded by node count before cloning, and privacy copy overstates exclusion of CSS-hidden content.
- Saved full URLs can preserve sensitive query/fragment data; history schema validation is shallow.
- Stale repository/directory naming obscures the current product.
- Browser policy/API changes create recurring review and store-maintenance work.

## Samsarix adoption

- Define a public API, event, schema, artifact, or deployment contract before connecting to Samsarix Unified.
- Add a consumer-owned contract fixture covering authentication, privacy, limits, errors, and version compatibility.
- Make one implementation canonical; remove or freeze duplicate behavior only after parity and rollback are proven.
- Record an owner, support level, compatibility window, and measurable adoption signal.

## Completion evidence

A milestone is complete only when its exact commit, commands and results, artifact digest, consumer or deployment, and rollback path are recorded in a pull request or release record. README claims must not exceed that evidence.
