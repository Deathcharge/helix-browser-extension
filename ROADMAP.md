# Samsarix Page Lens roadmap

This roadmap separates four gates: merge, release, publication, and flagship adoption. Passing one does not imply the next.

## Product boundary

Portfolio role: **integration or extension**. Keep its platform-specific packaging and release lifecycle separate. Any flagship integration should use a documented HTTP, event, or package contract with explicit auth, privacy, and failure ownership.
Planned repository identity: `Deathcharge/samsarix-page-lens` (ready).

Current disposition: productization is merged. Version 1.3 develops the private source-triage wedge with saved-baseline comparison; public release and adoption remain separate decisions.

## Stabilize the productized default

- Keep the default branch buildable from a clean checkout and preserve exact-head CI evidence.
- Keep Samsarix LLC branding, package identity, license metadata, and compatibility aliases internally consistent.
- [x] Preserve the pre-productization default as rollback tag `pre-productization-20260728`; do not delete legacy history.
- [x] Publish visible heuristic limits in the popup.
- [x] Bound DOM extraction by text-node and character count.
- [x] Sanitize stored/exported URLs by removing credentials, query, and fragment data.
- [x] Commit installed-extension Chromium coverage for extraction, analysis, rendering, save, and history.
- [x] Produce and reproduce a deterministic unsigned store ZIP locally.
- [x] Add an on-device current-versus-saved comparison with descriptive, non-ranking deltas and portable Markdown.
- Review priority: inspect and sign the exact store artifact under the owner-controlled store account.

## Release candidate

- Test the exact distributable on its target platform, including failure and upgrade paths.
- Review permissions, data retention, privacy copy, signing, and store or platform ownership.
- Release a prerelease to a bounded pilot before broad distribution.

Current hardening backlog:

- Popup/Chrome integration, extraction, sanitization, history, and the exact built artifact are covered by committed Chromium smoke testing. Manual toolbar `activeTab` behavior and clipboard/download prompts remain release gates.
- No store account, screenshots, hosted privacy disclosure, signed submission, or adoption evidence.
- English-oriented tokenization/readability remains a limitation; unsupported-language behavior needs an explicit product decision.
- Provenance cues vary by page type and need pilot feedback before weighting is treated as stable.
- CSS-only hidden content is not detected; privacy copy now states this precisely.
- [x] Rename the extracted source directory to the canonical `extension/` path.
- Browser policy/API changes create recurring review and store-maintenance work.

## Samsarix adoption

- Define a public API, event, schema, artifact, or deployment contract before connecting to Samsarix Unified.
- Add a consumer-owned contract fixture covering authentication, privacy, limits, errors, and version compatibility.
- Make one implementation canonical; remove or freeze duplicate behavior only after parity and rollback are proven.
- Record an owner, support level, compatibility window, and measurable adoption signal.

## Completion evidence

A milestone is complete only when its exact commit, commands and results, artifact digest, consumer or deployment, and rollback path are recorded in a pull request or release record. README claims must not exceed that evidence.
