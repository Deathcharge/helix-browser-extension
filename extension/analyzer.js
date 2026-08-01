// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SamsarixAnalyzer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STOP_WORDS = new Set('a an and are as at be by for from has have he her hers him his i in is it its of on or our she that the their them they this to was we were will with you your'.split(' '));
  function clamp(value) { return Math.max(0, Math.min(100, Math.round(value))); }
  function words(text) { return String(text).toLowerCase().match(/[a-z0-9][a-z0-9\x27-]*/g) || []; }
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
  function analyzePage(snapshot) {
    const text = String(snapshot.text || '').replace(/\s+/g, ' ').trim();
    const tokens = words(text);
    const sentenceList = sentences(text);
    if (tokens.length < 20) throw new Error('This page does not contain enough readable text (at least 20 words).');
    const sentenceCount = Math.max(1, sentenceList.length);
    const syllableCount = tokens.reduce((sum, word) => sum + syllables(word), 0);
    const flesch = 206.835 - 1.015 * (tokens.length / sentenceCount) - 84.6 * (syllableCount / tokens.length);
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
      description: String(snapshot.description || '').replace(/\s+/g, ' ').trim().slice(0, 300), language: String(snapshot.language || '').slice(0, 20),
      author, publishedAt, modifiedAt, analyzedAt: new Date().toISOString(), wordCount: tokens.length, readingMinutes: Math.max(1, Math.ceil(tokens.length / 225)),
      scores: { readability: clamp(flesch), structure, provenance }, counts: { sentences: sentenceCount, headings, paragraphs, links, citations, externalDomains: sources.length },
      keywords: topKeywords(tokens), outline: (Array.isArray(snapshot.outline) ? snapshot.outline : []).map(item => String(item).replace(/\s+/g, ' ').trim().slice(0, 160)).filter(Boolean).slice(0, 12),
      sources, provenanceSignals, excerpt: text.slice(0, 280), extraction: { visitedNodes: Math.max(0, Number(snapshot.visitedNodes) || 0), truncated: Boolean(snapshot.truncated) },
      sourceSignalsAvailable: true,
      methodology: 'Transparent local heuristics. Source signals describe visible provenance metadata and links; they do not establish truth, credibility, or quality.'
    };
  }
  function toMarkdown(result) {
    const sourceLines = result.sources?.length ? result.sources.map(source => `- [${source.host}](${source.url})${source.label ? ` — ${source.label}` : ''}`).join('\n') : '- None detected';
    const signalLines = result.provenanceSignals?.map(signal => `- ${signal.present ? '✓' : '○'} ${signal.label}: ${signal.detail}`).join('\n') || '';
    const sourceScore = result.sourceSignalsAvailable === false ? 'Not analyzed' : `${result.scores.provenance}/100`;
    return `# ${result.title}\n\n${result.url ? `Source: ${result.url}\n\n` : ''}Analyzed locally: ${result.analyzedAt}\n\n## Reading brief\n\n- ${result.wordCount} words · ${result.readingMinutes} min read\n- Readability: ${result.scores.readability}/100\n- Structure: ${result.scores.structure}/100\n- Source signals: ${sourceScore}\n\n## Provenance signals\n\n${signalLines}\n\n## Frequent terms\n\n${result.keywords.map(item => `- ${item.term}: ${item.count}`).join('\n')}\n\n## External source domains\n\n${sourceLines}\n\n> Scores are transparent indicators, not factuality, credibility, or quality judgments.\n`;
  }
  function migrateStoredResult(item) {
    if (!item || typeof item !== 'object' || ![1, 2].includes(item.schemaVersion) || typeof item.title !== 'string' || !Number.isFinite(item.wordCount)) return null;
    const legacy = item.schemaVersion === 1;
    const sources = normalizeSources(item.sources);
    const signals = legacy ? [] : (Array.isArray(item.provenanceSignals) ? item.provenanceSignals : []).slice(0, 5).map(signal => ({
      label: String(signal?.label || '').slice(0, 80), present: Boolean(signal?.present), detail: String(signal?.detail || '').slice(0, 160)
    })).filter(signal => signal.label);
    return {
      schemaVersion: 2, url: sanitizeUrl(item.url), title: item.title.replace(/\s+/g, ' ').trim().slice(0, 300) || 'Untitled page',
      description: String(item.description || '').replace(/\s+/g, ' ').trim().slice(0, 300), language: String(item.language || '').slice(0, 20), author: String(item.author || '').replace(/\s+/g, ' ').trim().slice(0, 160),
      publishedAt: validDate(item.publishedAt), modifiedAt: validDate(item.modifiedAt), analyzedAt: validDate(item.analyzedAt) || new Date(0).toISOString(),
      wordCount: Math.min(10000000, Math.max(0, Number(item.wordCount) || 0)), readingMinutes: Math.min(100000, Math.max(1, Number(item.readingMinutes) || Math.ceil(item.wordCount / 225))),
      scores: {
        readability: clamp(Number(item.scores?.readability) || 0),
        structure: clamp(Number(item.scores?.structure) || 0),
        provenance: legacy ? null : clamp(Number(item.scores?.provenance) || 0)
      },
      counts: {
        sentences: Math.max(0, Number(item.counts?.sentences) || 0), headings: Math.max(0, Number(item.counts?.headings) || 0),
        paragraphs: Math.max(0, Number(item.counts?.paragraphs) || 0), links: Math.max(0, Number(item.counts?.links) || 0),
        citations: Math.max(0, Number(item.counts?.citations) || 0), externalDomains: legacy ? 0 : sources.length
      },
      keywords: (Array.isArray(item.keywords) ? item.keywords : []).slice(0, 6).map(keyword => ({ term: String(keyword?.term || '').slice(0, 80), count: Math.max(0, Number(keyword?.count) || 0) })).filter(keyword => keyword.term),
      outline: legacy ? [] : (Array.isArray(item.outline) ? item.outline : []).slice(0, 12).map(value => String(value).slice(0, 160)),
      sources: legacy ? [] : sources,
      provenanceSignals: signals,
      sourceSignalsAvailable: !legacy,
      excerpt: String(item.excerpt || '').slice(0, 280),
      extraction: { visitedNodes: Math.max(0, Number(item.extraction?.visitedNodes) || 0), truncated: Boolean(item.extraction?.truncated) },
      methodology: legacy ? 'Legacy brief migrated with private URL components removed. Reanalyze the page to collect source signals.' : String(item.methodology || '').slice(0, 300)
    };
  }
  return { analyzePage, migrateStoredResult, sanitizeUrl, syllables, toMarkdown, topKeywords };
});
