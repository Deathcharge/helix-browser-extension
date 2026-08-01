// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SamsarixAnalyzer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STOP_WORDS = new Set('a an and are as at be by for from has have he her hers him his i in is it its of on or our she that the their them they this to was we were will with you your'.split(' '));
  function clamp(value) { return Math.max(0, Math.min(100, Math.round(value))); }
  function words(text) { return String(text).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}\x27’\-]*/gu) || []; }
  function sentences(text) { return (String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).filter(part => part.trim()); }
  function syllables(word) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (clean.length <= 3) return 1;
    const normalized = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/i, '').replace(/^y/, '');
    return Math.max(1, (normalized.match(/[aeiouy]{1,2}/g) || []).length);
  }
  function topKeywords(tokens, limit = 6) {
    const counts = new Map();
    tokens.filter(word => word.length > 3 && !STOP_WORDS.has(word)).forEach(word => counts.set(word, (counts.get(word) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([term, count]) => ({ term, count }));
  }
  function sanitizeUrl(value) {
    try {
      const url = new URL(String(value));
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      url.username = ''; url.password = ''; url.search = ''; url.hash = '';
      return url.toString();
    } catch { return ''; }
  }
  function validDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  function normalizeLanguage(value) { return String(value || '').trim().toLowerCase().replace(/_/g, '-').slice(0, 20); }
  function readabilityState(language) {
    if (!language) return { available: false, basis: 'undeclared-language' };
    if (language.split('-')[0] === 'en') return { available: true, basis: 'declared-English' };
    return { available: false, basis: 'unsupported-language' };
  }
  function normalizeSources(sources) {
    if (!Array.isArray(sources)) return [];
    const seen = new Set();
    return sources.map(source => {
      const url = sanitizeUrl(source?.url);
      let host = '';
      try { host = new URL(url).hostname.toLowerCase().slice(0, 253); } catch {}
      return { host, url, label: String(source?.label || '').replace(/\s+/g, ' ').trim().slice(0, 120) };
    })
      .filter(source => source.host && source.url && !seen.has(source.host) && seen.add(source.host)).slice(0, 20);
  }
  function escapeMarkdown(value) {
    return String(value ?? '').replace(/([\\`*_{}\[\]()<>#+\-.!|])/g, '\\$1').replace(/\r?\n/g, ' ');
  }
  function analyzePage(snapshot) {
    const text = String(snapshot.text || '').replace(/\s+/g, ' ').trim();
    const tokens = words(text);
    const sentenceList = sentences(text);
    if (tokens.length < 20) throw new Error('This page does not contain enough readable text (at least 20 words).');
    const language = normalizeLanguage(snapshot.language); const readability = readabilityState(language);
    const sentenceCount = Math.max(1, sentenceList.length);
    const syllableCount = readability.available ? tokens.reduce((sum, word) => sum + syllables(word), 0) : 0;
    const flesch = readability.available ? 206.835 - 1.015 * (tokens.length / sentenceCount) - 84.6 * (syllableCount / tokens.length) : null;
    const headings = Math.max(0, Number(snapshot.headings) || 0);
    const paragraphs = Math.max(0, Number(snapshot.paragraphs) || 0);
    const links = Math.max(0, Number(snapshot.links) || 0);
    const citations = Math.max(0, Number(snapshot.citations) || 0);
    const sources = normalizeSources(snapshot.sources);
    const author = String(snapshot.author || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    const publishedAt = validDate(snapshot.publishedAt);
    const modifiedAt = validDate(snapshot.modifiedAt);
    const structure = clamp(20 + Math.min(headings, 8) * 6 + Math.min(paragraphs, 12) * 2.5);
    const provenance = clamp(10 + (author ? 15 : 0) + (publishedAt ? 10 : 0) + (modifiedAt ? 5 : 0) + Math.min(sources.length, 10) * 4 + Math.min(citations, 6) * 5);
    const provenanceSignals = [
      { label: 'Named author or organization', present: Boolean(author), detail: author || 'Not detected' },
      { label: 'Publication date', present: Boolean(publishedAt), detail: publishedAt?.slice(0, 10) || 'Not detected' },
      { label: 'Update date', present: Boolean(modifiedAt), detail: modifiedAt?.slice(0, 10) || 'Not detected' },
      { label: 'External source domains', present: sources.length > 0, detail: `${sources.length} detected` },
      { label: 'Quote or citation markup', present: citations > 0, detail: `${citations} detected` }
    ];
    return {
      schemaVersion: 2,
      url: sanitizeUrl(snapshot.url), title: String(snapshot.title || 'Untitled page').replace(/\s+/g, ' ').trim().slice(0, 300),
      description: String(snapshot.description || '').replace(/\s+/g, ' ').trim().slice(0, 300), language,
      author, publishedAt, modifiedAt, analyzedAt: new Date().toISOString(), wordCount: tokens.length, readingMinutes: Math.max(1, Math.ceil(tokens.length / 225)),
      scores: { readability: readability.available ? clamp(flesch) : null, structure, provenance }, counts: { sentences: sentenceCount, headings, paragraphs, links, citations, externalDomains: sources.length },
      keywords: topKeywords(tokens), outline: (Array.isArray(snapshot.outline) ? snapshot.outline : []).map(item => String(item).replace(/\s+/g, ' ').trim().slice(0, 160)).filter(Boolean).slice(0, 12),
      sources, provenanceSignals, excerpt: text.slice(0, 280), extraction: { visitedNodes: Math.max(0, Number(snapshot.visitedNodes) || 0), truncated: Boolean(snapshot.truncated) },
      readabilityAvailable: readability.available, readabilityBasis: readability.basis,
      sourceSignalsAvailable: true,
      methodology: 'Transparent local heuristics. Readability uses an English formula only for pages that declare English; source signals do not establish truth, credibility, or quality.'
    };
  }
  function compareBriefs(currentValue, baselineValue) {
    const current = migrateStoredResult(currentValue); const baseline = migrateStoredResult(baselineValue);
    if (!current || !baseline) throw new Error('Both comparison briefs must be valid saved briefs.');
    const currentHosts = new Set(current.sources.map(source => source.host));
    const baselineHosts = new Set(baseline.sources.map(source => source.host));
    const currentTerms = new Set(current.keywords.map(keyword => keyword.term.toLowerCase()));
    const baselineTerms = new Set(baseline.keywords.map(keyword => keyword.term.toLowerCase()));
    return {
      schemaVersion: 1,
      comparedAt: new Date().toISOString(),
      baseline: { title: baseline.title, url: baseline.url, analyzedAt: baseline.analyzedAt },
      current: { title: current.title, url: current.url, analyzedAt: current.analyzedAt },
      deltas: {
        wordCount: current.wordCount - baseline.wordCount,
        readingMinutes: current.readingMinutes - baseline.readingMinutes,
        readability: current.readabilityAvailable === false || baseline.readabilityAvailable === false ? null : current.scores.readability - baseline.scores.readability,
        structure: current.scores.structure - baseline.scores.structure,
        provenance: current.sourceSignalsAvailable === false || baseline.sourceSignalsAvailable === false ? null : current.scores.provenance - baseline.scores.provenance,
        externalDomains: current.counts.externalDomains - baseline.counts.externalDomains,
        citations: current.counts.citations - baseline.counts.citations
      },
      sharedSourceDomains: [...currentHosts].filter(host => baselineHosts.has(host)).sort(),
      sharedKeywords: [...currentTerms].filter(term => baselineTerms.has(term)).sort(),
      methodology: 'Descriptive differences between two locally generated briefs. Deltas do not establish factuality, credibility, or quality.'
    };
  }
  function signed(value) { return value > 0 ? `+${value}` : String(value); }
  function toComparisonMarkdown(comparison) {
    if (!comparison?.baseline || !comparison?.current || !comparison?.deltas) throw new Error('Create a comparison before exporting it.');
    const domains = comparison.sharedSourceDomains?.length ? comparison.sharedSourceDomains.map(host => `- ${escapeMarkdown(host)}`).join('\n') : '- None';
    const keywords = comparison.sharedKeywords?.length ? comparison.sharedKeywords.map(term => `- ${escapeMarkdown(term)}`).join('\n') : '- None';
    const readability = comparison.deltas.readability == null ? 'Not comparable' : signed(comparison.deltas.readability);
    const provenance = comparison.deltas.provenance == null ? 'Not comparable' : signed(comparison.deltas.provenance);
    return `# Page brief comparison\n\nBaseline: [${escapeMarkdown(comparison.baseline.title)}](${sanitizeUrl(comparison.baseline.url)})\n\nCurrent: [${escapeMarkdown(comparison.current.title)}](${sanitizeUrl(comparison.current.url)})\n\n## Current minus baseline\n\n- Words: ${signed(comparison.deltas.wordCount)}\n- Reading time: ${signed(comparison.deltas.readingMinutes)} min\n- Readability: ${readability}\n- Structure: ${signed(comparison.deltas.structure)}\n- Source signals: ${provenance}\n- External domains: ${signed(comparison.deltas.externalDomains)}\n- Citation signals: ${signed(comparison.deltas.citations)}\n\n## Shared source domains\n\n${domains}\n\n## Shared frequent terms\n\n${keywords}\n\n> Descriptive local comparison only—not a factuality, credibility, or quality judgment.\n`;
  }
  function toMarkdown(result) {
    const sourceLines = result.sources?.length ? result.sources.map(source => `- [${escapeMarkdown(source.host)}](${sanitizeUrl(source.url)})${source.label ? ` — ${escapeMarkdown(source.label)}` : ''}`).join('\n') : '- None detected';
    const signalLines = result.provenanceSignals?.map(signal => `- ${signal.present ? '✓' : '○'} ${escapeMarkdown(signal.label)}: ${escapeMarkdown(signal.detail)}`).join('\n') || '';
    const readability = result.readabilityAvailable === false ? (result.readabilityBasis === 'undeclared-language' ? 'Not available (page language undeclared)' : `Not available for ${escapeMarkdown(result.language || 'this language')}`) : `${result.scores.readability}/100`;
    const sourceScore = result.sourceSignalsAvailable === false ? 'Not analyzed' : `${result.scores.provenance}/100`;
    return `# ${escapeMarkdown(result.title)}\n\n${result.url ? `Source: ${sanitizeUrl(result.url)}\n\n` : ''}Analyzed locally: ${escapeMarkdown(result.analyzedAt)}\n\n## Reading brief\n\n- ${result.wordCount} words · ${result.readingMinutes} min read\n- Readability: ${readability}\n- Structure: ${result.scores.structure}/100\n- Source signals: ${sourceScore}\n\n## Provenance signals\n\n${signalLines}\n\n## Frequent terms\n\n${result.keywords.map(item => `- ${escapeMarkdown(item.term)}: ${item.count}`).join('\n')}\n\n## External source domains\n\n${sourceLines}\n\n> Scores are transparent indicators, not factuality, credibility, or quality judgments.\n`;
  }
  function migrateStoredResult(item) {
    if (!item || typeof item !== 'object' || ![1, 2].includes(item.schemaVersion) || typeof item.title !== 'string' || !Number.isFinite(item.wordCount)) return null;
    const legacy = item.schemaVersion === 1;
    const language = normalizeLanguage(item.language); const readability = readabilityState(language);
    const readabilityAvailable = readability.available && item.readabilityAvailable !== false;
    const sourceSignalsAvailable = !legacy && item.sourceSignalsAvailable !== false;
    const sources = normalizeSources(item.sources);
    const signals = sourceSignalsAvailable ? (Array.isArray(item.provenanceSignals) ? item.provenanceSignals : []).slice(0, 5).map(signal => ({
      label: String(signal?.label || '').slice(0, 80), present: Boolean(signal?.present), detail: String(signal?.detail || '').slice(0, 160)
    })).filter(signal => signal.label) : [];
    return {
      schemaVersion: 2, url: sanitizeUrl(item.url), title: item.title.replace(/\s+/g, ' ').trim().slice(0, 300) || 'Untitled page',
      description: String(item.description || '').replace(/\s+/g, ' ').trim().slice(0, 300), language, author: String(item.author || '').replace(/\s+/g, ' ').trim().slice(0, 160),
      publishedAt: validDate(item.publishedAt), modifiedAt: validDate(item.modifiedAt), analyzedAt: validDate(item.analyzedAt) || new Date(0).toISOString(),
      wordCount: Math.min(10000000, Math.max(0, Number(item.wordCount) || 0)), readingMinutes: Math.min(100000, Math.max(1, Number(item.readingMinutes) || Math.ceil(item.wordCount / 225))),
      scores: {
        readability: readabilityAvailable ? clamp(Number(item.scores?.readability) || 0) : null,
        structure: clamp(Number(item.scores?.structure) || 0),
        provenance: sourceSignalsAvailable ? clamp(Number(item.scores?.provenance) || 0) : null
      },
      counts: {
        sentences: Math.max(0, Number(item.counts?.sentences) || 0), headings: Math.max(0, Number(item.counts?.headings) || 0),
        paragraphs: Math.max(0, Number(item.counts?.paragraphs) || 0), links: Math.max(0, Number(item.counts?.links) || 0),
        citations: Math.max(0, Number(item.counts?.citations) || 0), externalDomains: sourceSignalsAvailable ? sources.length : 0
      },
      keywords: (Array.isArray(item.keywords) ? item.keywords : []).slice(0, 6).map(keyword => ({ term: String(keyword?.term || '').slice(0, 80), count: Math.max(0, Number(keyword?.count) || 0) })).filter(keyword => keyword.term),
      outline: legacy ? [] : (Array.isArray(item.outline) ? item.outline : []).slice(0, 12).map(value => String(value).slice(0, 160)),
      sources: sourceSignalsAvailable ? sources : [],
      provenanceSignals: signals,
      sourceSignalsAvailable,
      excerpt: String(item.excerpt || '').slice(0, 280),
      extraction: { visitedNodes: Math.max(0, Number(item.extraction?.visitedNodes) || 0), truncated: Boolean(item.extraction?.truncated) },
      readabilityAvailable,
      readabilityBasis: readabilityAvailable ? readability.basis : (item.readabilityAvailable === false && readability.available ? 'unavailable' : readability.basis),
      methodology: legacy ? 'Legacy brief migrated with private URL components removed. Reanalyze the page to collect source signals.' : String(item.methodology || '').slice(0, 300)
    };
  }
  return { analyzePage, compareBriefs, escapeMarkdown, migrateStoredResult, sanitizeUrl, syllables, toComparisonMarkdown, toMarkdown, topKeywords };
});
