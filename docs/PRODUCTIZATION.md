# Productization record

Last updated: 2026-07-28

## Product definition

Helix Page Lens is a local-first Manifest V3 Chrome extension for researchers, writers, and readers who want a quick, private orientation to the page in front of them. Its primary journey is: open an HTTP(S) page, invoke the extension, explicitly analyze it, understand the result, then copy, export, or save it locally.

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

- Preserve the familiar popup interaction and Helix identity while making the functionality honest and standalone.
- Use transparent deterministic heuristics. “Evidence” counts link and citation markup; it is explicitly not truth verification.
- Request `activeTab`, `scripting`, and `storage` only. Analysis begins on an explicit button press.
- Keep up to 25 records, deduplicate by URL, store only a short excerpt, and expose a destructive-action confirmation.
- Cap extracted text at 250,000 characters to bound CPU and memory.
- Treat the current license text as an owner/legal issue: it identifies “Helix Licensing System,” contains commercial-use terms, and conflicts with earlier MIT metadata. No legal interpretation or license change was made.

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
- [ ] Resolve the license scope and store-distribution rights with the owner/legal counsel.

### P2

- [ ] Add a dedicated history/details screen if validation shows users need to revisit more than a count.
- [ ] Add locale-aware tokenization and language-specific readability models.
- [ ] Add a user-visible methodology drawer with per-score inputs.
- [ ] Add Firefox support only after testing API differences and distribution demand.

## Completed work

- Rebuilt the extension as Helix Page Lens with on-device analysis and no server dependency.
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
- [ ] Owner confirms the license terms apply to this extension and permit the chosen distribution.
- [ ] Owner supplies and approves store listing, screenshots, privacy disclosures, developer account, and signing/submission.

## Final verification results

Executed on 2026-07-28:

- `npm ci`: exited successfully with the committed dependency-free lockfile.
- `npm run lint`: passed; manifest policy and syntax checks reported `Manifest and JavaScript checks passed.`
- `npm test`: passed 5/5 Node tests with 0 failures, skips, or cancellations.
- `npm run build`: exited successfully and produced `dist/helix-page-lens` with the declared six runtime assets, icons, and `BUILD_INFO.json` for version 1.0.0.
- `npm run check`: exited successfully as the combined lint/test/build gate. Individual commands were also run to capture their full output.
- `git diff --check`: passed with no whitespace errors.
- `npm audit --omit=dev`: exited successfully; the project has no installed runtime or development dependencies.
- Artifact inspection confirmed only `BUILD_INFO.json`, `analyzer.js`, icons, the manifest, and popup HTML/CSS/JS were packaged.
- A targeted source scan found no shipped network calls, credential identifiers, broad host permissions, or always-on content script declarations; the only matching terms were negative assertions/documentation.

A Playwright Chromium smoke attempt was not countable: the installed Playwright package had no matching managed Chromium binary. A fallback attempt against locally installed Chrome did not return a trustworthy assertion result in the command runner. No browser download was added and no manual Chrome UI result is claimed. Hands-on Chrome verification therefore remains a release gate.

## Risks, security, reliability, privacy, and cost

Active-tab text is untrusted input but is treated only as text; result tags use `textContent`, not HTML. Extraction runs in an isolated extension script invocation, does not execute page strings, skips form/dialog/hidden content, caps input, and has no network sink. Local history may still contain a title, URL, and 280-character excerpt from sensitive intranet pages; users are told storage is local and can clear it. Chrome local storage is not encrypted storage, so saving is explicit rather than automatic.

Heuristic scores can be misunderstood. UI and documentation state their limits, and raw structural counts accompany them. Very large pages are bounded. SPAs can change after analysis; rerunning produces a fresh result. Only English-oriented readability/tokenization is currently supported well. Operating cost is effectively zero beyond store fees and maintenance because there is no hosted service, model, database, telemetry, or third-party API.

## Distribution and sustainability

The simplest path is a free Chrome Web Store utility with no account. Sustainability should initially come from portfolio value, sponsorship, or paid support/custom analysis work rather than an artificial subscription. If demand is validated, optional paid functionality must remain explicit and must not weaken the local/private core.

## Owner- or externally blocked work

1. **License:** owner/legal counsel must confirm the intended licensed work, licensor identity/contact, change date, commercial thresholds, and whether store distribution is permitted. Verify by recording the decision and updating `LICENSE` plus README wording.
2. **Chrome Web Store:** owner must provide developer registration, listing assets/copy, privacy disclosure, region choices, signing, and submission. Verify with an installed store build matching the locally tested manifest version.
3. **Manual browser matrix:** a human must verify visual layout and browser-specific injection behavior in supported Chrome versions before store release.
