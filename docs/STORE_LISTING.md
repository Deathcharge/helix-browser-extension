# Chrome Web Store release packet

## Draft listing

**Name:** Samsarix Page Lens

**Short description:** Create a private source-triage brief with reading, structure, and provenance signals.

**Category:** Productivity

**Single purpose:** Give the user a transparent, on-device reading and structure brief for the active webpage.

**Detailed description:**

Samsarix Page Lens helps researchers, writers, journalists, students, and analysts decide whether a webpage deserves deeper reading. With one explicit click, it creates an on-device brief with estimated reading time, frequent terms, readability, document structure, visible byline/date metadata, citation markup, heading outline, and external source domains. Mark saved sources to read deeper, keep as references, or skip; add a bounded private note and filter the resulting research queue. Back up or restore the queue with versioned JSON, hand it off as Markdown, or use a saved brief as a comparison baseline.

Analysis, queue filtering, backup/import, and comparison stay in the browser. There are no accounts, analytics, ads, remote AI services, or page-content uploads. Results and user-entered review metadata can be copied, exported as JSON or Markdown, or saved locally for later reference; comparisons are not stored automatically and backup files are never synchronized by Page Lens.

Readability is an English-oriented sentence-and-syllable estimate calculated only for pages that explicitly declare English. If a page declares another language or omits its language, readability is shown as unavailable with the reason. Unicode-aware word counts, frequent terms, structure, and source signals remain available. Source signals are not a fact check, credibility rating, or quality judgment. Saved and exported URLs have credentials, queries, and fragments removed.

## Permission justifications

- `activeTab`: needed to inspect only the page where the user explicitly invokes the extension.
- `scripting`: needed to run the bounded, one-time extraction function in that active tab after explicit user action.
- `storage`: needed to save analyses only when the user requests it.

No host permissions are requested.

## Owner-provided assets and actions

- [ ] Confirm Samsarix LLC owns or has permission to use the product name and supplied icon artwork.
- [x] Generate and visually review three 1280×800 screenshots in `store-assets/` from the packaged 1.8.2 browser journey.
- [x] Generate and visually review the required 440×280 small promotional tile in `store-assets/`.
- [x] Prepare the standalone disclosure at `site/privacy/index.html` and a SHA-pinned, owner-triggered GitHub Pages workflow.
- [x] Publish and byte-verify the disclosure at `https://deathcharge.github.io/samsarix-page-lens/` with HTTPS enforcement; use this URL in the listing.
- [ ] Confirm `support@samsarix.com` is monitored.
- [ ] Complete Chrome Web Store developer registration and identity verification.
- [ ] Load and manually test the exact `dist/samsarix-page-lens` artifact, then upload the matching versioned ZIP.
- [x] Run `npm run release:verify` to audit the exact ZIP layout, packaged bytes, manifest, required assets, and disclosure URL; retain the printed SHA-256 with the submission record.
- [ ] Upload the packaged build, complete data-use declarations, and submit for review.

## Data-use declaration basis

The current runtime performs no network requests and includes no analytics or advertising SDK. Page content is processed ephemerally on-device. User-requested schema-v2 briefs, including optional review decisions and notes capped at 500 characters, are stored locally, capped at 25, and removable. The static pilot-feedback link opens the user's email client with questions and a warning not to include private URLs or confidential content; Page Lens does not send the message itself. Store declarations must be revalidated against the exact submission artifact and current Chrome Web Store questionnaire.

Chrome's user-data policy treats website content, browsing activity, and user-provided content as handled data even when processing and storage never leave the device. Use these conservative dashboard answers for the 1.8.2 candidate (confirm against the live questionnaire):

- **Single purpose:** Give the user a transparent, on-device reading and structure brief for the active webpage.
- **Remote code:** No, this extension does not use remote code.
- **Data types handled:** Website content; web browsing activity (the explicitly analyzed page URL); user-generated content (optional queue notes and review decisions).
- **Not handled:** Authentication, financial/payment, health, personal communications, precise location, or analytics data.
- **Limited use certification:** certify every statement. Data is used only for the described user-facing source-triage workflow, is never transferred or sold, is never used for advertising or credit decisions, and is not available to humans at Samsarix LLC.
- **Privacy policy:** `https://deathcharge.github.io/samsarix-page-lens/`

These answers deliberately disclose local handling rather than interpreting “collection” to mean server transmission. They are based on Chrome's [privacy-field guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) and [user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/). If the dashboard wording or artifact changes, stop and re-audit rather than weakening the disclosure.

## Reviewer test instructions

No account, credentials, payment, server, or special setup is required.

1. Open any ordinary public HTTP(S) article and select the Page Lens toolbar icon.
2. Select **Create page brief**. Confirm that the brief shows reading effort, structure, visible source signals, and the sanitized page URL under **Displayed brief**.
3. Choose a review decision, enter a short note, then select **Save locally**. Reopen the popup and confirm the record and note remain in the private queue.
4. Use **Backup JSON** and **Queue Markdown**. Select **Remove** beside one saved record, cancel once to check that nothing changes, then confirm removal. Import the downloaded JSON only after accepting the replacement/cap warning and verify that it restores the removed record.
5. Analyze a second public article, select the saved source as a baseline, and confirm the local comparison and Markdown export.
6. Remove the last saved record and confirm the empty state and that **Import backup** remains available. **Clear** also removes the full queue after confirmation.

Expected restrictions: Chrome blocks script injection on browser-internal pages and the Chrome Web Store; the popup explains that limitation. Pages without an explicit English language declaration do not receive an English readability score. No test credentials are necessary.

## Current official release constraints

- The listing requires an icon, description, and at least one current screenshot; Page Lens supplies three 1280×800 screenshots and the required 440×280 small promotional tile. See Chrome's [listing guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-listing/) and [quality guidance](https://developer.chrome.com/docs/webstore/best-listing).
- The artifact requests only `activeTab`, `scripting`, and `storage`, contains authored/unminified code, has no broad host permissions, and executes no remote code. This keeps review scope aligned with Chrome's [review guidance](https://developer.chrome.com/docs/webstore/review-process).
- The publisher account must have 2-Step Verification enabled and must complete current developer/trader identity requirements before submission. Submission should use deferred publishing so approval can be followed by one final signed-store smoke test before public release.
