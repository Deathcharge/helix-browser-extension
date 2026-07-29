# Security policy

## Supported version

Security fixes are provided for the latest version on the default branch. Samsarix Page Lens has not yet completed Chrome Web Store release, so there is no supported store build at this time.

## Reporting a vulnerability

Please report suspected vulnerabilities privately to [support@samsarix.com](mailto:support@samsarix.com). Include the affected version or commit, browser version, reproduction steps, impact, and any proof of concept that can be shared safely.

Do not include passwords, private page content, access tokens, or personal data in a report. Samsarix LLC will acknowledge reports as capacity allows; no fixed response or bounty commitment is currently offered.

For ordinary product support, use the same address and identify the message as a support request.

## Security model

The extension intentionally has no backend, remote API, analytics, or automatically running content script. It reads the active page only after explicit user action and saves results only on request. Its primary trust boundaries and privacy limitations are documented in [docs/PRIVACY.md](docs/PRIVACY.md) and [docs/PRODUCTIZATION.md](docs/PRODUCTIZATION.md).
