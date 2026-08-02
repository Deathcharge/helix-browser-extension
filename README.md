# Samsarix Page Lens

Samsarix Page Lens creates a private source-triage brief for the webpage in front of you. It helps researchers, writers, journalists, students, and analysts decide whether a source deserves deeper reading—without uploading page content, creating an account, or trusting an opaque AI summary.

One explicit click produces:

- reading time, word count, and frequent terms;
- an English readability indicator only for pages that explicitly declare English, with clear unavailable states otherwise, plus document-structure signals;
- a provenance checklist covering visible bylines, dates, external source domains, and citation markup;
- the page’s heading outline and linked source domains;
- privacy-safe Markdown or JSON export and optional local history.
- an on-device comparison between the current brief and any saved baseline, with descriptive deltas and shared signals.
- a private research queue with review decisions, bounded notes, and decision filters.
- versioned JSON queue backup/import and whole-queue Markdown handoff without cloud sync.

Source signals describe what the page exposes. They do **not** establish factuality, credibility, authority, or quality.

Status: **1.7 bounded-pilot candidate for unpacked-extension evaluation.** Chrome Web Store publication and real-participant validation are not yet complete.

## Join the bounded pilot

Page Lens needs 8–12 consenting participants who make real source-reading decisions. Researchers, analysts, writers, journalists, educators, students, and independent knowledge workers are all useful perspectives. The pilot uses the unsigned [v1.7.0-pilot.1 prerelease](https://github.com/Deathcharge/samsarix-page-lens/releases/tag/v1.7.0-pilot.1) and takes place over one initial session plus one return use 2–7 days later.

Read the [pilot protocol](docs/PILOT.md), then [email support@samsarix.com to volunteer](mailto:support@samsarix.com?subject=Page%20Lens%201.7%20pilot%20volunteer&body=I%20would%20like%20to%20volunteer%20for%20the%20Page%20Lens%201.7%20bounded%20pilot.%0A%0ACohort%20%28research%2Fanalysis%2C%20writing%2Fjournalism%2C%20education%2Fstudent%2C%20or%20independent%20knowledge%20work%29%3A%0ABrowser%20and%20operating%20system%3A%0ARelevant%20source-triage%20use%20case%20%28do%20not%20include%20private%20URLs%20or%20confidential%20content%29%3A). Do not send page URLs, browsing history, source contents, screenshots, queue exports, or private notes. Participation is voluntary; positive feedback is neither expected nor rewarded.

## Install and try it

Prerequisites: Chrome or Chromium with Manifest V3 support. Node.js 24+ is needed only for development and release verification.

1. For ordinary development, clone this repository. Pilot participants instead download and extract `samsarix-page-lens-1.7.0.zip` from the pinned prerelease and verify SHA-256 `67BAFCADE5B374C17E03347BCEDD473AA3E7AACB3041054B402E13F6105EBEB4`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select `extension` for a source checkout, or the extracted pilot ZIP directory for the pinned prerelease.
5. Open a normal HTTP or HTTPS article, select the extension icon, and choose **Create page brief**.

Chrome blocks extensions from reading internal pages such as `chrome://extensions` and the Chrome Web Store. The popup explains this when encountered.

## Real use cases

- **Research triage:** inspect length, outline, byline/date metadata, and linked source domains before investing time in a page.
- **Writing and editing:** gauge readability, structure, repeated terms, and whether provenance cues are visible to readers.
- **Multilingual triage:** retain Unicode-aware word counts, frequent terms, structure, and source cues while avoiding a misleading English readability score when a page declares another language or no language.
- **Source handoff:** export a consistent Markdown brief for notes, review, or collaboration without copying private query parameters.
- **Source comparison:** save a baseline, analyze a second page, and compare length, structure, provenance cues, citations, shared source domains, and frequent terms locally.
- **Private browsing workflow:** analyze intranet or sensitive pages locally, then choose explicitly whether to save a bounded brief.
- **Research queue:** mark a saved source to read deeper, keep as a reference, or skip; add a short private note and filter the queue without creating an account.
- **Portable recovery:** download the bounded queue as versioned JSON, restore it into another Page Lens profile, or hand off the whole queue as readable Markdown.

## Privacy and permissions

Analysis runs entirely in the extension. There are no runtime network requests, accounts, analytics, advertising, or remote dependencies.

- `activeTab` grants temporary access only to the tab where the user invokes the extension.
- `scripting` runs one bounded extraction after the user selects **Create page brief**.
- `storage` retains up to 25 briefs only when the user selects **Save locally**.

Chrome shares `chrome.storage.local` between regular and Incognito extension contexts. If the extension is enabled in Incognito, selecting **Save locally** there adds the brief to the same persistent history visible in regular browsing. Do not save an Incognito brief unless that retention is intended.

Extraction visits at most 15,000 DOM nodes and retains at most 250,000 characters. It excludes content inside scripts, styles, navigation, footers, forms, dialogs, templates, and elements explicitly marked hidden or `aria-hidden`. It does not inspect form values. CSS-only visibility cannot be inferred without substantially more page work, so the privacy disclosure does not claim that all CSS-hidden text is excluded.

Saved and exported page/source URLs have credentials, queries, and fragments removed. A saved brief retains only structured counts, signals, keywords, metadata, a 280-character excerpt, and an optional user-entered review decision and note, with the note capped at 500 characters. See [docs/PRIVACY.md](docs/PRIVACY.md).

Comparisons are calculated on demand from two briefs already in the popup and are not stored automatically. Comparison Markdown contains sanitized URLs and descriptive deltas; it does not rank either page as more truthful or credible.

Queue backup and import are explicit local actions, not synchronization. JSON imports are limited to 1 MB and 100 input records, validated before storage, normalized through the same privacy migration as existing history, deduplicated, and capped at 25 stored briefs. A structurally invalid backup does not modify the current queue.

## Development and verification

```bash
npm ci
npx playwright install chromium
npm run check
```

The complete gate runs manifest/privacy/workflow policy checks, twenty-seven deterministic unit tests, a clean artifact build, and an installed-extension Chromium test covering extraction, sanitization, popup rendering, local save, review decisions and filtering, queue backup/import, history reopening, saved-baseline comparison, export, and declared non-English behavior.

Individual commands:

```bash
npm run lint
npm test
npm run build
npm run test:browser
```

`npm run build` creates the unpacked `dist/samsarix-page-lens` directory and deterministic `dist/samsarix-page-lens-1.7.0.zip`, containing only the runtime extension, icons, license, notice, and build metadata. Playwright, jsdom, and fflate are development-only dependencies and are not shipped.

### Architecture

- `extension/extractor.js` performs bounded, on-demand DOM extraction.
- `extension/analyzer.js` validates and transforms snapshots into schema-v2 source briefs and creates descriptive two-brief comparisons.
- `extension/popup.js` owns the UI, export, sanitized local history, and recovery states.
- `scripts/check.mjs` protects the minimal permission and no-network boundary.
- `scripts/browser-smoke.cjs` loads the built extension in Chromium and exercises the primary packaged flow.

## Product and release context

- [Competitive research and product wedge](docs/MARKET_RESEARCH.md)
- [Productization and acceptance record](docs/PRODUCTIZATION.md)
- [Chrome Web Store release packet](docs/STORE_LISTING.md)
- [Privacy-preserving pilot protocol](docs/PILOT.md)
- [Roadmap](ROADMAP.md)
- [Chrome Web Store screenshots](store-assets/README.md)
- [Public privacy disclosure](https://deathcharge.github.io/samsarix-page-lens/) and its [repository source](site/privacy/index.html)

## Support, ownership, and license

- Product contact: [contact@samsarix.com](mailto:contact@samsarix.com)
- Support and private security reports: [support@samsarix.com](mailto:support@samsarix.com)
- Contributions: [CONTRIBUTING.md](CONTRIBUTING.md)

Copyright © 2026 Samsarix LLC. Source code is licensed under [MPL-2.0](LICENSE); see [NOTICE](NOTICE) and the [licensing decision](docs/LICENSING.md). The code license does not grant general rights to Samsarix names, brands, marks, or logos.
