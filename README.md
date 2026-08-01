# Samsarix Page Lens

Samsarix Page Lens creates a private source-triage brief for the webpage in front of you. It helps researchers, writers, journalists, students, and analysts decide whether a source deserves deeper reading—without uploading page content, creating an account, or trusting an opaque AI summary.

One explicit click produces:

- reading time, word count, and frequent terms;
- transparent readability and document-structure indicators;
- a provenance checklist covering visible bylines, dates, external source domains, and citation markup;
- the page’s heading outline and linked source domains;
- privacy-safe Markdown or JSON export and optional local history.
- an on-device comparison between the current brief and any saved baseline, with descriptive deltas and shared signals.

Source signals describe what the page exposes. They do **not** establish factuality, credibility, authority, or quality.

Status: **1.3 release candidate for unpacked-extension evaluation.** Chrome Web Store publication and pilot adoption are not yet complete.

## Install and try it

Prerequisites: Chrome or Chromium with Manifest V3 support. Node.js 24+ is needed only for development and release verification.

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select `extension`.
5. Open a normal HTTP or HTTPS article, select the extension icon, and choose **Create page brief**.

Chrome blocks extensions from reading internal pages such as `chrome://extensions` and the Chrome Web Store. The popup explains this when encountered.

## Real use cases

- **Research triage:** inspect length, outline, byline/date metadata, and linked source domains before investing time in a page.
- **Writing and editing:** gauge readability, structure, repeated terms, and whether provenance cues are visible to readers.
- **Source handoff:** export a consistent Markdown brief for notes, review, or collaboration without copying private query parameters.
- **Source comparison:** save a baseline, analyze a second page, and compare length, structure, provenance cues, citations, shared source domains, and frequent terms locally.
- **Private browsing workflow:** analyze intranet or sensitive pages locally, then choose explicitly whether to save a bounded brief.

## Privacy and permissions

Analysis runs entirely in the extension. There are no runtime network requests, accounts, analytics, advertising, or remote dependencies.

- `activeTab` grants temporary access only to the tab where the user invokes the extension.
- `scripting` runs one bounded extraction after the user selects **Create page brief**.
- `storage` retains up to 25 briefs only when the user selects **Save locally**.

Chrome shares `chrome.storage.local` between regular and Incognito extension contexts. If the extension is enabled in Incognito, selecting **Save locally** there adds the brief to the same persistent history visible in regular browsing. Do not save an Incognito brief unless that retention is intended.

Extraction visits at most 15,000 DOM nodes and retains at most 250,000 characters. It excludes content inside scripts, styles, navigation, footers, forms, dialogs, templates, and elements explicitly marked hidden or `aria-hidden`. It does not inspect form values. CSS-only visibility cannot be inferred without substantially more page work, so the privacy disclosure does not claim that all CSS-hidden text is excluded.

Saved and exported page/source URLs have credentials, queries, and fragments removed. A saved brief retains only structured counts, signals, keywords, metadata, and a 280-character excerpt. See [docs/PRIVACY.md](docs/PRIVACY.md).

Comparisons are calculated on demand from two briefs already in the popup and are not stored automatically. Comparison Markdown contains sanitized URLs and descriptive deltas; it does not rank either page as more truthful or credible.

## Development and verification

```bash
npm ci
npx playwright install chromium
npm run check
```

The complete gate runs manifest/privacy policy checks, eighteen deterministic unit tests, a clean artifact build, and an installed-extension Chromium test covering extraction, sanitization, popup rendering, local save, history reopening, and saved-baseline comparison.

Individual commands:

```bash
npm run lint
npm test
npm run build
npm run test:browser
```

`npm run build` creates the unpacked `dist/samsarix-page-lens` directory and deterministic `dist/samsarix-page-lens-1.3.0.zip`, containing only the runtime extension, icons, license, notice, and build metadata. Playwright, jsdom, and fflate are development-only dependencies and are not shipped.

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
- [Roadmap](ROADMAP.md)

## Support, ownership, and license

- Product contact: [contact@samsarix.com](mailto:contact@samsarix.com)
- Support and private security reports: [support@samsarix.com](mailto:support@samsarix.com)
- Contributions: [CONTRIBUTING.md](CONTRIBUTING.md)

Copyright © 2026 Samsarix LLC. Source code is licensed under [MPL-2.0](LICENSE); see [NOTICE](NOTICE) and the [licensing decision](docs/LICENSING.md). The code license does not grant general rights to Samsarix names, brands, marks, or logos.
