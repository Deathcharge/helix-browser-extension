# Chrome Web Store release packet

## Draft listing

**Name:** Samsarix Page Lens

**Short description:** Inspect a page’s reading effort, structure, and evidence signals privately in your browser.

**Category:** Productivity

**Single purpose:** Give the user a transparent, on-device reading and structure brief for the active webpage.

**Detailed description:**

Samsarix Page Lens helps researchers, writers, and readers quickly understand the shape of the page in front of them. With one explicit click, it calculates estimated reading time, word count, frequent terms, readability, structural organization, and evidence signals.

Analysis stays in the browser. There are no accounts, analytics, ads, remote AI services, or page-content uploads. Results can be copied, exported as JSON, or saved locally for later reference.

Readability is a sentence-and-syllable estimate. Structure reflects headings and paragraphs. Evidence reflects links and citation-like markup; it is not a fact check or quality judgment.

## Permission justifications

- `activeTab`: needed to inspect only the page where the user explicitly invokes the extension.
- `scripting`: needed to run the bounded, one-time extraction function in that active tab.
- `storage`: needed to save analyses only when the user requests it.

No host permissions are requested.

## Owner-provided assets and actions

- [ ] Confirm Samsarix LLC owns or has permission to use the product name and supplied icon artwork.
- [ ] Provide a 1280×800 or 640×400 store screenshot showing a representative analysis.
- [ ] Provide a 440×280 promotional tile if desired.
- [ ] Host the privacy disclosure at a stable public HTTPS URL and use that URL in the listing.
- [ ] Confirm `support@samsarix.com` is monitored.
- [ ] Complete Chrome Web Store developer registration and identity verification.
- [ ] Load and manually test the exact `dist/samsarix-page-lens` artifact before upload.
- [ ] Upload the packaged build, complete data-use declarations, and submit for review.

## Data-use declaration basis

The current source performs no network requests and includes no analytics or advertising SDK. Page content is processed ephemerally on-device. User-requested history is stored locally. Store declarations must be revalidated against the exact submission artifact and current Chrome Web Store questionnaire.
