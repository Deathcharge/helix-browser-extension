# Samsarix Page Lens roadmap

This roadmap separates four gates: merge, release, publication, and flagship adoption. Passing one does not imply the next.

## Product boundary

Portfolio role: **integration or extension**. Keep its platform-specific packaging and release lifecycle separate. Any flagship integration should use a documented HTTP, event, or package contract with explicit auth, privacy, and failure ownership.
Planned repository identity: `Deathcharge/samsarix-page-lens` (ready).

Current disposition: productization is merged. Version 1.8 packages the private source-triage wedge for a bounded, privacy-preserving pilot with saved-baseline comparison, language-honest readability, a local research decision queue, explicit portable recovery, structured voluntary feedback, and the completed security-hardening pass; store publication and real-participant adoption remain separate decisions.

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
- [x] Publish the verified unsigned artifact as GitHub prerelease `v1.7.0-pilot.1`, explicitly labeled non-production and not Chrome Web Store approved.
- [ ] Publish the superseding security-hardened artifact as GitHub prerelease `v1.8.0-pilot.1` and retain 1.7 only as historical evidence.
- [x] Define a bounded pilot protocol with cohorts, representative tasks, privacy rules, explicit thresholds, severity, and an anonymized evidence template.
- [x] Add a static, structured pilot-feedback route that opens the user's email client without attaching page data or introducing an extension network request.

Current hardening backlog:

- Popup/Chrome integration, extraction, sanitization, history, and the exact built artifact are covered by committed Chromium smoke testing. Manual toolbar `activeTab` behavior and clipboard/download prompts remain release gates.
- Store screenshots are prepared and policy-checked. The privacy disclosure is published over enforced HTTPS and verified against its repository source after deployment. Store account/signing/submission and adoption evidence remain owner-controlled.
- [x] Use Unicode-aware word/term tokenization; calculate the English readability formula only for pages that explicitly declare English, and show an unavailable reason for non-English or undeclared language.
- [x] Turn triage into an actionable local queue with bounded private notes, explicit review decisions, filtering, migration, and portable export.
- [x] Add a versioned, bounded queue backup/import contract and whole-queue Markdown handoff without introducing an account, network request, or sync permission.
- [x] Encode page-controlled URL delimiters for Markdown export, enforce hidden/excluded roots and metadata, and bound secondary extraction fields before snapshot serialization.
- [x] Add an explicit local-only extension-page CSP and reject symlinks or non-regular release-package inputs.
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
