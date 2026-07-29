# Samsarix Page Lens privacy disclosure

Effective: July 28, 2026

Samsarix Page Lens is developed by Samsarix LLC. The extension does not transmit, sell, share, or remotely process user data. It has no analytics, advertising, account system, remote API, or telemetry.

## Data processed

Only after the user selects **Analyze this page**, the extension temporarily reads the active page’s rendered text, title, URL, headings, paragraphs, links, and citation-like markup. Scripts, styles, navigation, footers, forms, dialogs, hidden elements, and form values are excluded. Processing is capped at 250,000 characters and occurs locally in the browser.

## Data stored

Analysis is not saved automatically. When the user selects **Save locally**, the extension stores the URL, title, counts, scores, frequent terms, timestamp, and an excerpt of at most 280 characters in `chrome.storage.local`. History is deduplicated by URL and capped at 25 records. The user can clear all saved records from the popup.

Chrome extension storage is device-local application storage, not a secure vault. Users should avoid saving analyses of sensitive pages on shared or compromised devices.

## Permissions

- `activeTab` provides temporary access to the tab where the user invokes the extension.
- `scripting` runs the bounded page-extraction function after explicit user action.
- `storage` retains user-requested analysis history.

The extension requests no host permissions and installs no always-on content script.

## Retention and deletion

Unsaved page text exists only in memory while the popup is open. Saved records remain until the user clears them or removes the extension/browser profile. Uninstalling an extension normally removes its local extension storage, subject to browser behavior and enterprise policy.

## Contact

Privacy and product questions: [contact@samsarix.com](mailto:contact@samsarix.com)  
Support: [support@samsarix.com](mailto:support@samsarix.com)

If future versions introduce any remote data processing, this disclosure and the extension’s permissions must be updated before release.
