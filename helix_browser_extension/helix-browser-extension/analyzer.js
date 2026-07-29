// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SamsarixAnalyzer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STOP_WORDS = new Set('a an and are as at be by for from has have he her hers him his i in is it its of on or our she that the their them they this to was we were will with you your'.split(' '));

  function clamp(value) { return Math.max(0, Math.min(100, Math.round(value))); }
  function words(text) { return (String(text).toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) || []); }
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
  function analyzePage(snapshot) {
    const text = String(snapshot.text || '').replace(/\s+/g, ' ').trim();
    const tokens = words(text);
    const sentenceList = sentences(text);
    if (tokens.length < 20) throw new Error('This page does not contain enough readable text (at least 20 words).');
    const sentenceCount = Math.max(1, sentenceList.length);
    const syllableCount = tokens.reduce((sum, word) => sum + syllables(word), 0);
    const flesch = 206.835 - 1.015 * (tokens.length / sentenceCount) - 84.6 * (syllableCount / tokens.length);
    const headings = Number(snapshot.headings) || 0;
    const paragraphs = Number(snapshot.paragraphs) || 0;
    const links = Number(snapshot.links) || 0;
    const citations = Number(snapshot.citations) || 0;
    const structure = clamp(25 + Math.min(headings, 8) * 6 + Math.min(paragraphs, 12) * 2.25);
    const evidence = clamp(15 + Math.min(links, 15) * 3 + Math.min(citations, 8) * 7);
    return {
      schemaVersion: 1,
      url: String(snapshot.url || ''),
      title: String(snapshot.title || 'Untitled page').slice(0, 300),
      analyzedAt: new Date().toISOString(),
      wordCount: tokens.length,
      readingMinutes: Math.max(1, Math.ceil(tokens.length / 225)),
      scores: { readability: clamp(flesch), structure, evidence },
      counts: { sentences: sentenceCount, headings, paragraphs, links, citations },
      keywords: topKeywords(tokens),
      excerpt: text.slice(0, 280),
      methodology: 'Transparent local heuristics; scores are indicators, not factuality or quality judgments.'
    };
  }
  return { analyzePage, topKeywords, syllables };
});
