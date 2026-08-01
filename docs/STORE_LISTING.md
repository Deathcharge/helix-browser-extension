# Chrome Web Store release packet

## Draft listing

**Name:** Samsarix Page Lens

**Short description:** Create a private source-triage brief with reading, structure, and provenance signals.

**Category:** Productivity

**Single purpose:** Give the user a transparent, on-device reading and structure brief for the active webpage.

**Detailed description:**

Samsarix Page Lens helps researchers, writers, journalists, students, and analysts decide whether a webpage deserves deeper reading. With one explicit click, it creates an on-device brief with estimated reading time, frequent terms, readability, document structure, visible byline/date metadata, citation markup, heading outline, and external source domains. Save a brief as a baseline, then compare another page against it using descriptive deltas and shared source signals.

Analysis and comparison stay in the browser. There are no accounts, analytics, ads, remote AI services, or page-content uploads. Results can be copied, exported as JSON or Markdown, or saved locally for later reference; comparisons are not stored automatically.

Readability is an English-oriented sentence-and-syllable estimate. It is calculated for declared English pages; when a page omits its language, the extension labels the English assumption, and when a page declares another language, readability is shown as unavailable. Unicode-aware word counts, frequent terms, structure, and source signals remain available. Source signals are not a fact check, credibility rating, or quality judgment. Saved and exported URLs have credentials, queries, and fragments removed.

## Permission justifications

- `activeTab`: needed to inspect only the page where the user explicitly invokes the extension.
- `scripting`: needed to run the bounded, one-time extraction function in that active tab after explicit user action.
- `storage`: needed to save analyses only when the user requests it.

No host permissions are requested.

## Owner-provided assets and actions

- [ ] Confirm Samsarix LLC owns or has permission to use the product name and supplied icon artwork.
- [ ] Provide a 1280×800 or 640×400 store screenshot showing a representative analysis.
- [ ] Provide a 440×280 promotional tile if desired.
- [ ] Host the privacy disclosure at a stable public HTTPS URL and use that URL in the listing.
- [ ] Confirm `support@samsarix.com` is monitored.
- [ ] Complete Chrome Web Store developer registration and identity verification.
- [ ] Load and manually test the exact `dist/samsarix-page-lens` artifact, then upload the matching versioned ZIP.
- [ ] Upload the packaged build, complete data-use declarations, and submit for review.

## Data-use declaration basis

The current runtime performs no network requests and includes no analytics or advertising SDK. Page content is processed ephemerally on-device. User-requested schema-v2 briefs are stored locally, capped at 25, and removable. Store declarations must be revalidated against the exact submission artifact and current Chrome Web Store questionnaire.
