# Competitive research and product wedge

Research updated: 2026-08-01

## Decision

Samsarix Page Lens should be a **private source-triage extension**, not a generic AI chat sidebar, SEO suite, or word counter. Its promise is a fast, transparent brief that helps a reader decide whether and how to investigate a page further. The product remains useful on sensitive and internal pages because analysis is local and deterministic.

## Current landscape

Three adjacent categories are crowded:

1. **AI reading assistants** summarize pages and answer questions. Examples advertise context-aware summaries, chat, rewriting, structured extraction, and multi-language output. They generally send selected page context to a remote model after user action. Examples: [Browsely](https://browsely.ai/about), [Understand This Page](https://understandthispage.com/), and [Explainr AI](https://chromewebstore.google.com/detail/explainr-ai-summarize-ana/ckckfckapoppceghbdeekmjnlhickcpa).
2. **Readability and word-analysis tools** provide word/sentence counts, reading level, keyword density, and writing advice. Current listings advertise multiple readability formulas and broad localization. Examples: [Readability Checker](https://chromewebstore.google.com/detail/readability-checker-%E2%80%94-rea/fjpohmmgennglcgfdhjeeconejimcbkk) and [Quick Word Counter](https://chromewebstore.google.com/detail/quick-word-counter/imabehmlmiackbemigkelocelaidgdfb).
3. **SEO/GEO audit tools** score publisher-controlled pages for search or AI visibility and recommend changes. Examples include [GEOReport](https://georeport.ai/download) and [hey-eye](https://hey-eye.gr/).

Competing feature-for-feature would make this repository larger without producing a reason to choose it. Remote generative summaries would also weaken its strongest privacy distinction and introduce cost, hallucination, credential, and availability concerns.

## Competitive wedge

The differentiators are:

- no account, API key, remote model, or page-content upload;
- explicit invocation through Chrome’s privacy-preserving `activeTab` permission;
- bounded extraction and privacy-safe URL retention;
- transparent inputs and raw provenance signals rather than an unexplained credibility score;
- portable Markdown/JSON briefs that fit research and writing workflows;
- open source under MPL-2.0 with a testable no-network policy.

Chrome’s own guidance recommends `activeTab` instead of broad host access where possible and notes that extension storage is not encrypted. The architecture follows those constraints: [activeTab documentation](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [Chrome privacy guidance](https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy).

## Primary users and jobs

- A researcher screens many pages and needs visible source/provenance cues before deep reading.
- A writer checks whether an article’s organization and sourcing cues are legible to readers.
- An analyst exports comparable page briefs into a notes or review workflow.
- A privacy-conscious user needs local inspection of a sensitive or internal page.

## Deliberate non-goals

- factuality, credibility, bias, plagiarism, accessibility, or SEO certification;
- AI-generated summaries or chat in the local-first core;
- background browsing collection or cross-site monitoring;
- user accounts, subscriptions, telemetry, or cloud sync before real demand exists;
- integrations with private Samsarix infrastructure.

## Next validation questions

1. Do source-triage users save/export briefs repeatedly, or is the one-click inspection enough?
2. Which provenance cues matter by source type: news, academic, documentation, policy, or corporate pages?
3. Does a two-source comparison view save enough time to justify added complexity?
4. **Decision implemented in 1.4:** use Unicode-aware word/term analysis on all pages, omit the English readability score for declared non-English pages, and label English as an assumption when language is undeclared. Locale-specific formulas remain a demand-driven future option.

Claims above describe current public product pages and listings; they are competitive observations, not adoption or market-size evidence.
