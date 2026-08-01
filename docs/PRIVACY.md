# Samsarix Page Lens privacy disclosure

Effective: August 1, 2026

Samsarix Page Lens is developed by Samsarix LLC. The extension does not transmit, sell, share, or remotely process user data. It has no runtime analytics, advertising, account system, remote API, telemetry, or third-party SDK.

## Data processed

Only after the user selects **Create page brief**, the extension temporarily processes the active page’s text, title, URL, description, language, headings, paragraphs, links, citation-like markup, visible byline/date metadata, and up to 20 unique external source domains.

Extraction visits at most 15,000 DOM nodes and retains at most 250,000 characters. It skips content inside scripts, styles, navigation, footers, forms, dialogs, templates, and elements explicitly marked with `hidden` or `aria-hidden="true"`. Form values are not inspected. CSS-only hidden text may be encountered because computing full rendered visibility would require substantially more page processing.

Processing occurs locally in the browser. Unsaved page text exists only in memory while the extension popup is active.

## Data stored or exported

Nothing is saved automatically. When the user selects **Save locally**, the extension stores the resulting source brief in `chrome.storage.local`. Briefs contain structured counts, scores, visible metadata, frequent terms, an outline, external source domains, timestamps, and an excerpt of at most 280 characters.

Before storage or export, URL credentials, query parameters, and fragments are removed from the analyzed page URL and linked source URLs. This reduces accidental retention of tokens and private identifiers but cannot make titles, paths, metadata, or excerpts non-sensitive.

History is deduplicated by sanitized page URL, restricted to schema-v2 records, and capped at 25 briefs. Users can clear all saved briefs from the popup. Chrome extension storage is device-local application storage, not encrypted secure storage; sensitive briefs should not be saved on shared or compromised devices.

Markdown and JSON export occur only after an explicit user action. The browser’s normal download behavior controls the resulting file.

## Permissions

- `activeTab` provides temporary access only to the tab where the user invokes the extension.
- `scripting` runs the bounded extractor after explicit user action.
- `storage` retains user-requested source briefs.

The extension requests no host permissions and installs no background worker or always-on content script.

## Retention and deletion

Saved records remain until the user clears them or removes the extension/browser profile. Uninstalling normally removes local extension storage, subject to browser behavior and enterprise policy. Exported files are controlled by the user and are not deleted by the extension.

## Contact and changes

Privacy and product questions: [contact@samsarix.com](mailto:contact@samsarix.com)  
Support: [support@samsarix.com](mailto:support@samsarix.com)

Any future remote data processing requires an architecture, permission, store-declaration, and disclosure review before release.
