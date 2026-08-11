# Security review and hardening record

Date: August 10, 2026  
Reviewed revision: `b356d50ebd2f3a745b80d7307326f2056f7653e8` (version 1.7.0)  
Remediated in: version 1.8.0

This repository-wide, source-backed review covered all 43 tracked files at the reviewed revision: the Manifest V3 runtime, DOM extraction, analysis, popup rendering, storage and migration, JSON import, Markdown/JSON export, permissions, privacy contract, automated tests, CI, and release packaging. It is an internal engineering review, not an independent audit or a guarantee that no vulnerability exists.

## Findings and resolution

Three low-severity issues were validated and fixed:

1. **Markdown URL destination encoding (CWE-116).** HTTP(S) protocol sanitization did not also encode Markdown delimiters retained in a URL path. Version 1.8 encodes those delimiters before every Markdown destination and plain source-URL export. Regression coverage uses a crafted `)![track](` path in briefs and comparisons.
2. **Pre-limit DOM materialization (CWE-400).** Whole subtree text getters and secondary fields could be materialized before the retained snapshot caps. Version 1.8 slices text-node data before normalization, derives bounded element labels through text-node traversal, caps secondary fields, and omits oversized source URLs.
3. **Excluded primary-root and metadata bypass (CWE-200).** A hidden or otherwise excluded first `main`/`article` could become the traversal root, and hidden body metadata could be selected. Version 1.8 selects only an eligible primary root and applies the same exclusion boundary to body metadata while preserving head metadata support.

The review also added defense in depth: extension pages now enforce an explicit local-only CSP, and packaging rejects symbolic links and non-regular entries. The permission set remains `activeTab`, `scripting`, and `storage`; there are no host permissions, background worker, always-on content script, remote code, or runtime network APIs.

## Verification

- Exploit-focused analyzer and extractor tests: passed.
- Complete deterministic unit suite: 30/30 passed.
- Manifest, JavaScript, privacy, and workflow policy checks: passed.
- Deterministic clean build: passed.
- Installed-extension Chromium journey: passed.
- Release-submission audit and live privacy byte comparison: required again after the 1.8 disclosure is deployed.

Security reports should be sent privately to [support@samsarix.com](mailto:support@samsarix.com) without private page content, credentials, or personal data.
