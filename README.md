# Helix Page Lens

Helix Page Lens is a local-first Chrome extension that turns the active webpage into a compact reading and structure brief. It is for researchers, writers, and curious readers who want fast orientation without uploading page content or creating an account.

The extension reports estimated reading time, word count, frequent terms, and three transparent heuristic signals:

- **Readability** uses a Flesch-style estimate based on sentence and syllable length.
- **Structure** reflects the presence of headings and paragraphs.
- **Evidence** reflects links and citation-like markup. It does **not** verify truth or source quality.

Status: credible local-first MVP, ready for unpacked-extension evaluation. Chrome Web Store publication is not yet complete.

## Install and try it

Prerequisites: Chrome or Chromium with Manifest V3 support. Node.js 20+ is only needed for development.

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select `helix_browser_extension/helix-browser-extension`.
5. Open a normal HTTP or HTTPS article, select the extension icon, and choose **Analyze this page**.

Chrome blocks extensions from reading internal pages such as `chrome://extensions` and the Chrome Web Store. The popup explains this when encountered.

Results can be copied, exported as JSON, or saved locally. Saved analyses are deduplicated by URL, capped at 25, and removable from the popup.

## Privacy and permissions

Analysis runs entirely in the extension. There are no network requests, accounts, analytics, or remote dependencies.

- `activeTab`: grants temporary access only to the tab where the user invokes the extension.
- `scripting`: extracts visible text and structural counts after the user chooses **Analyze**.
- `storage`: stores up to 25 user-requested analysis records on the device.

The extension removes scripts, styles, navigation, footers, forms, hidden elements, and dialogs from its temporary page clone before reading text. It processes at most 250,000 characters and saves only a 280-character excerpt. Passwords and form values are not read.

## Development

```bash
npm ci
npm run lint
npm test
npm run build
npm run check
```

`npm run build` creates a clean unpacked artifact in `dist/helix-page-lens`. No dependency installation is currently required beyond Node itself, but `npm ci` validates the lockfile and keeps CI reproducible.

### Architecture

- `manifest.json` declares the minimal browser surface.
- `popup.js` owns the user journey, active-tab extraction, local history, copy, and export.
- `analyzer.js` is a side-effect-free analysis module shared by the popup and Node tests.
- `test/` checks the scoring contract, edge cases, and permission boundary.

The analysis is deliberately heuristic and deterministic. It must not be presented as an AI judgment, accessibility audit, fact check, or substitute for editorial review.

## Packaging and release

Run `npm run check`, then load `dist/helix-page-lens` as an unpacked extension for smoke testing. Store submission requires owner-controlled listing copy, screenshots, privacy disclosures, developer registration, and package signing. See [docs/PRODUCTIZATION.md](docs/PRODUCTIZATION.md) for acceptance criteria and gates.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep permissions minimal, preserve local-only behavior, and accompany scoring changes with tests and an explanation of the user-facing methodology.

## License

The repository currently contains a Business Source License 1.1 text with project-specific parameters that do not clearly name this extension. License applicability and store-distribution rights require owner/legal confirmation; no license change was inferred during productization. See [LICENSE](LICENSE).
