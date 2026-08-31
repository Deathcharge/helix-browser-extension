# Changelog

All notable user-facing and security-relevant changes are recorded here. Versions before the first Chrome Web Store publication are bounded-pilot builds, not supported store releases.

## 1.8.1 — 2026-08-31

- Complete the pilot's single-record removal task with a per-brief **Remove** control, confirmation, cancellation, recoverable write-failure state, and backup restoration.
- Identify the displayed brief independently from the active tab so reopened records are not misattributed.
- Preserve unrelated records and notes when removing a brief, including records without a retained URL.
- Derive pilot-feedback version and store screenshot labels from the installed manifest instead of stale 1.7 text.
- Correct reviewer instructions to match the real control names and save order.

## 1.8.0 — 2026-08-10

- Encode page-controlled URL delimiters in Markdown brief and comparison exports.
- Skip hidden or otherwise excluded primary content roots and body metadata.
- Bound URLs, titles, descriptions, language, outline entries, source labels, and date/author fields before returning the extraction snapshot.
- Add an explicit local-only Manifest V3 content security policy.
- Reject symbolic links and non-regular entries from release packaging and submission verification.
- Add exploit-focused regression tests and update the privacy disclosure.

## 1.7.0 — 2026-08-01

- Add a structured, privacy-preserving pilot-feedback route.
- Publish the first pinned unsigned bounded-pilot artifact.

## 1.6.0 — 2026-08-01

- Add versioned bounded queue backup/import and whole-queue Markdown handoff.

## 1.5.0 — 2026-08-01

- Add the local research decision queue, bounded private notes, and decision filters.
