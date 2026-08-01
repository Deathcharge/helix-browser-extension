// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzePage, migrateStoredResult, sanitizeUrl, toMarkdown, topKeywords } = require('../extension/analyzer.js');

const sample = {
  url: 'https://example.com/report?token=secret#private', title: 'Example report', description: 'A useful report', language: 'en', author: 'Research Team',
  publishedAt: '2026-01-15', modifiedAt: '2026-02-01', headings: 3, paragraphs: 7, links: 5, citations: 2, visitedNodes: 42,
  sources: [{ host: 'source.example', url: 'https://source.example/paper?campaign=x', label: 'Primary paper' }], outline: ['Overview', 'Findings'],
  text: 'Research teams need clear evidence and readable explanations. '.repeat(20)
};
test('creates a provenance-aware source brief', () => {
  const result = analyzePage(sample);
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.url, 'https://example.com/report');
  assert.equal(result.wordCount, 160);
  assert.equal(result.counts.externalDomains, 1);
  assert.equal(result.author, 'Research Team');
  assert.equal(result.sources[0].url, 'https://source.example/paper');
  assert.deepEqual(result.outline, ['Overview', 'Findings']);
  for (const score of Object.values(result.scores)) assert.ok(score >= 0 && score <= 100);
  assert.equal(result.provenanceSignals.filter(signal => signal.present).length, 5);
});
test('rejects pages without enough readable text', () => assert.throws(() => analyzePage({ text: 'Too short.' }), /at least 20 words/));
test('sanitizes URL credentials, queries, and fragments', () => {
  assert.equal(sanitizeUrl('https://user:pass@example.com/path?q=secret#token'), 'https://example.com/path');
  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeUrl('not a url'), '');
});
test('derives source hosts from sanitized URLs instead of page-provided labels', () => {
  const result = analyzePage({ ...sample, sources: [{ host: 'spoofed.example', url: 'https://actual.example/report?token=x', label: 'Report' }] });
  assert.equal(result.sources[0].host, 'actual.example'); assert.equal(result.sources[0].url, 'https://actual.example/report');
});
test('normalizes invalid metadata without throwing', () => {
  const result = analyzePage({ ...sample, author: null, publishedAt: 'invalid', modifiedAt: {}, sources: [{ host: '', url: 'bad' }], outline: null });
  assert.equal(result.author, ''); assert.equal(result.publishedAt, null); assert.equal(result.sources.length, 0); assert.deepEqual(result.outline, []);
});
test('keywords exclude common words and use stable ordering', () => assert.deepEqual(topKeywords(['the', 'signal', 'signal', 'alpha', 'alpha']), [{ term: 'alpha', count: 2 }, { term: 'signal', count: 2 }]));
test('Markdown export contains limitations and sanitized sources', () => {
  const markdown = toMarkdown(analyzePage(sample));
  assert.match(markdown, /Source signals:/); assert.match(markdown, /source\.example/); assert.doesNotMatch(markdown, /campaign=/); assert.match(markdown, /not factuality/);
});
test('caps retained excerpt and marks bounded extraction', () => {
  const result = analyzePage({ ...sample, text: 'word '.repeat(100), truncated: true });
  assert.ok(result.excerpt.length <= 280); assert.equal(result.extraction.truncated, true);
});
test('migrates legacy history and removes private URL data', () => {
  const legacy = migrateStoredResult({ schemaVersion: 1, url: 'https://example.com/report?token=secret#private', title: ' Legacy ', wordCount: 50, scores: { readability: 80, structure: 70, evidence: 90 }, counts: { headings: 2 }, keywords: [{ term: 'test', count: 2 }], excerpt: 'preview' });
  assert.equal(legacy.url, 'https://example.com/report'); assert.equal(legacy.sourceSignalsAvailable, false); assert.equal(legacy.scores.provenance, null); assert.deepEqual(legacy.sources, []);
});
