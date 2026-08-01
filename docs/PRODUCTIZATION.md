# Productization record

Last updated: 2026-07-28

## Product definition

Samsarix Page Lens is a local-first Manifest V3 Chrome extension from Samsarix LLC for researchers, writers, and readers who want a quick, private orientation to the page in front of them. Its primary journey is: open an HTTP(S) page, invoke the extension, explicitly analyze it, understand the result, then copy, export, or save it locally.

This narrow utility is independently useful and does not reproduce or require `helix-unified`. It intentionally excludes accounts, subscriptions, cloud sync, remote AI, telemetry, content scripts that run on every page, and claims of factual verification. Distribution starts as a reproducible unpacked extension; Chrome Web Store distribution is an owner-controlled follow-up.

## Repository assessment and baseline

The repository began as an extracted Chrome extension client for an undocumented Helix service. The checked-in popup and service worker advertised coordination analysis, authentication, subscriptions, OAuth, usage tiers, saving, and production endpoints. The root simultaneously described a Python package and referenced files, CI, dependencies, and documentation that did not exist. The manifest restricted content scripts to Helix-owned domains despite claiming to analyze any page. Tokens were stored in `chrome.storage.local` by the worker but read/written through `chrome.storage.session` in several popup paths. There was no JavaScript toolchain or extension-level test.

Baseline captured on Windows 11 with Node 24.12.0, npm 11.6.2, and Python 3.11.9:

- `git status --short --branch`: clean, `main...origin/main`.
- `node --check helix_browser_extension/helix-browser-extension/background.js`: passed syntax checking.
- `python -m pytest -q -p no:timeout -p no:xdist`: 24 passed in 1.26s, but tests asserted only Python mocks and did not load shipped code.
- `python -m pytest` with all installed plugins began collection/execution but did not produce a complete result in the command session; the plugin-reduced run established the suite baseline.
- No root `package.json`, lockfile, GitHub Actions workflow, build script, or package artifact existed.
- The documented `pip install -r requirements.txt` could not work because `requirements.txt` did not exist; Python metadata also required the apparently external `helix-hub-shared` package despite shipping no Python package.

## Decisions and assumptions

- Preserve the familiar popup interaction while adopting the current Samsarix identity and making the functionality honest and standalone.
- Use transparent deterministic heuristics. “Evidence” counts link and citation markup; it is explicitly not truth verification.
- Request `activeTab`, `scripting`, and `storage` only. Analysis begins on an explicit button press.
- Keep up to 25 records, deduplicate by URL, store only a short excerpt, and expose a destructive-action confirmation.
- Cap extracted text at 250,000 characters to bound CPU and memory.
- License source under unmodified MPL-2.0 with Samsarix LLC copyright and notice metadata. This file-level copyleft protects distributed modifications to covered files without imposing project-wide strong copyleft on integrations. Brand and trademark rights remain separate.

## Findings and implementation checklist

### P0

- [x] Remove the undocumented production API dependency and nonfunctional authentication/subscription journey.
- [x] Replace contradictory Python packaging with a JavaScript extension toolchain.
- [x] Make the advertised active-page journey work through explicit `activeTab` injection.
- [x] Add real tests, deterministic build output, and CI.
- [x] Replace misleading production-ready documentation with verified setup and limitations.

### P1

- [x] Remove host permissions, always-on content scripts, OAuth, token persistence, and external network calls.
- [x] Handle protected pages, insufficient content, loading, retry, success, and local-history states.
- [x] Bound extraction and retention; avoid forms and hidden content.
- [x] Add keyboard focus visibility, live regions, semantic controls, and reduced-motion behavior.
- [ ] Complete hands-on Chrome smoke testing across long articles, SPAs, PDFs, iframes, and non-English pages.
- [x] Replace the mis-scoped custom BSL with a standard license chosen by the owner: MPL-2.0.

### P2

- [x] Make the five most recent saved analyses directly reopenable from the popup.
- [ ] Add locale-aware tokenization and language-specific readability models.
- [ ] Add a user-visible methodology drawer with per-score inputs.
- [ ] Add Firefox support only after testing API differences and distribution demand.

## Completed work

- Rebuilt the extension as Samsarix Page Lens with on-device analysis and no server dependency.
- Added meaningful readability, structure, evidence, reading-time, keyword, and count output.
- Added copy, JSON export, capped/deduplicated local save, clear confirmation, and recovery states.
- Reduced the permission surface and removed unreachable legacy implementations and mock-only Python tests.
- Added Node tests, manifest policy checks, syntax checks, reproducible artifact assembly, and GitHub Actions CI.
- Rewrote the README around the actual product, setup, architecture, privacy boundary, methodology, and release path.

## Release acceptance criteria

- [x] Product identity, user, primary journey, and limitations are documented.
- [x] No private service, credentials, environment variables, remote network request, or broad host permission is required.
- [x] Static checks, unit tests, manifest policy test, and artifact build are automated.
- [ ] Manual Chrome tests pass on at least three representative public pages plus a protected page and low-content page.
- [x] Owner identified Samsarix LLC as the rights holder and authorized the Samsarix rebrand and license update.
- [ ] Owner supplies and approves store listing, screenshots, privacy disclosures, developer account, and signing/submission.

## Final verification results

Executed on 2026-07-28:

- `npm ci`: exited successfully with the committed dependency-free lockfile.
- `npm run lint`: passed; manifest policy and syntax checks reported `Manifest and JavaScript checks passed.`
- `npm test`: passed 5/5 Node tests with 0 failures, skips, or cancellations.
- `npm run build`: the first pass produced `dist/helix-page-lens` for version 1.0.0. The Samsarix 1.1.0 verification results are recorded below after the second pass.
- `npm run check`: exited successfully as the combined lint/test/build gate. Individual commands were also run to capture their full output.
- `git diff --check`: passed with no whitespace errors.
- `npm audit --omit=dev`: exited successfully; the project has no installed runtime or development dependencies.
- Artifact inspection confirmed only `BUILD_INFO.json`, `analyzer.js`, icons, the manifest, and popup HTML/CSS/JS were packaged.
- A targeted source scan found no shipped network calls, credential identifiers, broad host permissions, or always-on content script declarations; the only matching terms were negative assertions/documentation.

A first-pass Playwright Chromium smoke attempt was not countable because the installed Playwright package had no matching managed Chromium binary. Second-pass browser results are recorded below.

## Samsarix 1.1.0 pass

- Updated product identity, copyright, support, and contact details to Samsarix Page Lens / Samsarix LLC.
- Replaced the inaccurate custom BSL with unmodified MPL-2.0, added SPDX headers and `NOTICE`, and included license/source notices in the release artifact.
- Added reopenable recent history, delayed export-URL cleanup, a complete privacy disclosure, and a store-listing packet.
- Reviewed nearby repositories for portfolio context. They confirm a broader Samsarix/Helix ecosystem exists, but this extension remains deliberately standalone and has no runtime dependency on those repositories.
- Final command and browser outcomes are appended after verification rather than assumed here.

Verification completed for 1.1.0 on Windows 11:

- `npm ci`: passed; audited one package record with zero vulnerabilities.
- `npm run check`: passed the manifest/privacy policy check, six Node tests, and artifact build.
- Browser smoke test using a Playwright persistent Chromium profile and `--load-extension`: passed. Chromium loaded `dist/samsarix-page-lens`, rendered the packaged popup, executed the packaged analyzer on a representative fixture, displayed the results, saved to real `chrome.storage.local`, rendered reopenable recent history, and captured a screenshot at `output/playwright/samsarix-page-lens-popup.png`.
- The installed-extension smoke does not emulate the browser-toolbar gesture that grants `activeTab`; one manual toolbar analysis on a normal public article remains required before store submission.
- The local `LICENSE` was byte-normalized and compared with the SPDX license-list MPL-2.0 text; it matched.
- `git diff --check` and final artifact/security scans are run again immediately before commit.

## Risks, security, reliability, privacy, and cost

Active-tab text is untrusted input but is treated only as text; result tags use `textContent`, not HTML. Extraction runs in an isolated extension script invocation, does not execute page strings, skips form/dialog/hidden content, caps input, and has no network sink. Local history may still contain a title, URL, and 280-character excerpt from sensitive intranet pages; users are told storage is local and can clear it. Chrome local storage is not encrypted storage, so saving is explicit rather than automatic.

Heuristic scores can be misunderstood. UI and documentation state their limits, and raw structural counts accompany them. Very large pages are bounded. SPAs can change after analysis; rerunning produces a fresh result. Only English-oriented readability/tokenization is currently supported well. Operating cost is effectively zero beyond store fees and maintenance because there is no hosted service, model, database, telemetry, or third-party API.

## Distribution and sustainability

The simplest path is a free Chrome Web Store utility with no account. Sustainability should initially come from portfolio value, sponsorship, or paid support/custom analysis work rather than an artificial subscription. If demand is validated, optional paid functionality must remain explicit and must not weaken the local/private core.

## Owner- or externally blocked work

1. **Legal review (recommended, not a code blocker):** counsel should confirm Samsarix LLC’s chain of title, contributor treatment, and any trademark strategy. MPL-2.0 is now applied consistently, but licensing cannot establish ownership of third-party contributions or register a brand.
2. **Chrome Web Store:** owner must provide developer registration, listing assets, hosted privacy URL, region choices, signing, and submission. Verify with an installed store build matching the locally tested manifest version.
3. **Manual browser matrix:** a human must verify visual layout and browser-specific injection behavior in supported Chrome versions before store release unless automated installed-extension coverage is completed below.

## Samsarix 1.2 competitive pass

Chosen wedge: a private, transparent source-triage brief for researchers, writers, journalists, students, and analysts. Competitive research is recorded in `docs/MARKET_RESEARCH.md`. AI chat, remote summaries, SEO certification, and opaque credibility claims remain out of scope.

Completed locally:

- Schema-v2 briefs with sanitized page/source URLs, visible provenance metadata, external source domains, heading outline, and explicit methodology limits.
- Bounded extraction: at most 15,000 DOM nodes and 250,000 characters, with truncation surfaced in the result.
- Markdown and JSON export plus strict schema-v2 local-history validation.
- Canonical `extension/` source directory.
- Committed Playwright Chromium test covering the built artifact, DOM extraction, form exclusion, metadata/source detection, URL sanitization, popup rendering, local save, and history reopening.
- Version advanced to 1.2.0; exact final verification, artifact digest, commits, CI result, and merge evidence will be recorded at release handoff.

Local release-candidate verification:

- `npm run lint`: passed manifest/version/permission/no-network policy and JavaScript syntax checks.
- `npm test`: 15 passed, 0 failed/skipped/cancelled, including legacy-history privacy migration, Markdown injection resistance, and exact extractor bounds.
- `npm run build`: produced the unpacked artifact and `dist/samsarix-page-lens-1.2.0.zip`.
- Two independent builds after review hardening produced the same ZIP SHA-256: `DB5840ED68F2978E3DF20B5A70FC9E2FC03AA2D8D1C85893B4EE2222C7CF531C`.
- `npm run test:browser`: passed against Playwright Chromium with the built extension loaded.
- `npm audit`: 0 vulnerabilities after upgrading Playwright to the fixed 1.62.1 release.

Remaining release gates:

- Manual toolbar invocation on representative public and internal pages to exercise Chrome’s real `activeTab` gesture.
- Manual clipboard and download confirmation behavior on supported Chrome versions.

## Samsarix 1.3 comparison pass

The next complete research journey builds on saved briefs rather than introducing another standalone score:

- Save a source brief as a baseline, analyze another HTTP(S) page, and select the saved baseline in the popup.
- Compare word count, reading time, readability, structure, source signals, external-domain count, and citation signals as current-minus-baseline deltas.
- Show shared external source domains and frequent terms without declaring a winner or credibility outcome.
- Copy or download a privacy-safe Markdown comparison; comparisons are calculated locally and are not stored automatically.
- Preserve unavailable source signals when repeatedly migrating legacy 1.1 history so those values remain explicitly not comparable.

Local release evidence for 1.3:

- `npm run check`: passed the manifest/privacy policy, 18 unit tests, deterministic build, and installed-extension Chromium journey.
- `npm audit`: 0 vulnerabilities.
- Two independent builds produced the same `dist/samsarix-page-lens-1.3.0.zip` SHA-256: `603A8A9D0312A5C75E4145504F0471C1ABE545805DCA1645B52CE9EBA83C2E14`.
- PR, merge commit, exact-head CI, and post-merge `main` CI will be recorded at release handoff.
- Hosted privacy URL, final screenshots, store account, signed upload, and bounded pilot feedback.
