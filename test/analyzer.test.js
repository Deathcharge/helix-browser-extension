// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzePage, compareBriefs, createQueueBackup, mergeQueueHistory, migrateStoredResult, normalizeReview, parseQueueBackup, removeQueueBrief, sanitizeUrl, toComparisonMarkdown, toMarkdown, toQueueMarkdown, topKeywords } = require('../extension/analyzer.js');

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
  for (const score of Object.values(result.scores).filter(Number.isFinite)) assert.ok(score >= 0 && score <= 100);
  assert.equal(result.readabilityAvailable, true); assert.equal(result.readabilityBasis, 'declared-English');
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
test('Markdown export escapes page-derived control characters', () => {
  const result = analyzePage({
    ...sample,
    title: 'Bad ![image](https://evil.example/x)',
    author: '[click](https://evil.example)',
    sources: [{ url: 'https://actual.example/report?secret=x', label: '![track](https://evil.example/pixel)' }]
  });
  const markdown = toMarkdown(result);
  assert.doesNotMatch(markdown, /!\[image\]\(https:\/\/evil\.example/);
  assert.doesNotMatch(markdown, /\[click\]\(https:\/\/evil\.example/);
  assert.doesNotMatch(markdown, /!\[track\]\(https:\/\/evil\.example/);
  assert.match(markdown, /\(https:\/\/actual\.example\/report\)/);
  assert.doesNotMatch(markdown, /secret=/);
});
test('Markdown export encodes control characters inside URL destinations', () => {
  const maliciousPath = 'path)![track](https://attacker.example/pixel';
  const result = analyzePage({
    ...sample,
    url: `https://page.example/${maliciousPath}`,
    sources: [{ url: `https://source.example/${maliciousPath}`, label: 'Legitimate source' }]
  });
  const markdown = toMarkdown(result);
  assert.doesNotMatch(markdown, /\)!\[track\]\(https:\/\/attacker\.example/);
  assert.match(markdown, /path%29%21%5Btrack%5D%28https:\/\/attacker\.example\/pixel/);

  const comparison = toComparisonMarkdown(compareBriefs(
    result,
    analyzePage({ ...sample, url: `https://baseline.example/${maliciousPath}` })
  ));
  assert.doesNotMatch(comparison, /\)!\[track\]\(https:\/\/attacker\.example/);
  assert.match(comparison, /path%29%21%5Btrack%5D%28https:\/\/attacker\.example\/pixel/);
});
test('caps retained excerpt and marks bounded extraction', () => {
  const result = analyzePage({ ...sample, text: 'word '.repeat(100), truncated: true });
  assert.ok(result.excerpt.length <= 280); assert.equal(result.extraction.truncated, true);
});
test('migrates legacy history and removes private URL data', () => {
  const legacy = migrateStoredResult({ schemaVersion: 1, url: 'https://example.com/report?token=secret#private', title: ' Legacy ', wordCount: 50, scores: { readability: 80, structure: 70, evidence: 90 }, counts: { headings: 2 }, keywords: [{ term: 'test', count: 2 }], excerpt: 'preview' });
  assert.equal(legacy.url, 'https://example.com/report'); assert.equal(legacy.sourceSignalsAvailable, false); assert.equal(legacy.scores.provenance, null); assert.deepEqual(legacy.sources, []);
  const repeated = migrateStoredResult(legacy);
  assert.equal(repeated.sourceSignalsAvailable, false); assert.equal(repeated.scores.provenance, null);
});
test('compares two briefs with descriptive deltas and overlap', () => {
  const baseline = analyzePage(sample);
  const current = analyzePage({
    ...sample,
    url: 'https://current.example/article?private=yes', title: 'Current article', headings: 5, citations: 4,
    sources: [{ url: 'https://source.example/new', label: 'Shared' }, { url: 'https://another.example/report', label: 'Another' }],
    text: `${sample.text} additional analysis context appears here. `.repeat(2)
  });
  const comparison = compareBriefs(current, baseline);
  assert.equal(comparison.current.url, 'https://current.example/article');
  assert.ok(comparison.deltas.wordCount > 0);
  assert.equal(comparison.deltas.externalDomains, 1);
  assert.deepEqual(comparison.sharedSourceDomains, ['source.example']);
  assert.ok(comparison.sharedKeywords.includes('clear'));
  assert.match(comparison.methodology, /do not establish factuality/);
});
test('comparison Markdown escapes titles and only links sanitized URLs', () => {
  const baseline = analyzePage({ ...sample, title: 'Base [link](https://evil.example)', url: 'https://base.example/a?token=x' });
  const current = analyzePage({ ...sample, title: 'Current ![image](https://evil.example/x)', url: 'https://current.example/b#secret' });
  const markdown = toComparisonMarkdown(compareBriefs(current, baseline));
  assert.doesNotMatch(markdown, /!\[image\]\(https:\/\/evil\.example/);
  assert.doesNotMatch(markdown, /\[link\]\(https:\/\/evil\.example/);
  assert.match(markdown, /\(https:\/\/base\.example\/a\)/);
  assert.match(markdown, /\(https:\/\/current\.example\/b\)/);
  assert.doesNotMatch(markdown, /token=|#secret/);
});
test('comparison marks unavailable legacy source signals as not comparable', () => {
  const current = analyzePage(sample);
  const legacy = migrateStoredResult({ schemaVersion: 1, url: 'https://legacy.example', title: 'Legacy', wordCount: 50, scores: { readability: 50, structure: 50 }, counts: {}, keywords: [] });
  assert.equal(compareBriefs(current, legacy).deltas.provenance, null);
});
test('keeps non-English triage useful without applying an English readability score', () => {
  const result = analyzePage({ ...sample, language: 'ES_mx', text: 'La investigación pública reúne información útil y análisis cuidadoso. '.repeat(20) });
  assert.equal(result.language, 'es-mx');
  assert.equal(result.readabilityAvailable, false);
  assert.equal(result.readabilityBasis, 'unsupported-language');
  assert.equal(result.scores.readability, null);
  assert.equal(result.wordCount, 180);
  assert.ok(result.keywords.some(keyword => keyword.term === 'investigación'));
  assert.match(toMarkdown(result), /Readability: Not available for es\\-mx/);
});
test('withholds readability when the page language is undeclared', () => {
  const result = analyzePage({ ...sample, language: '' });
  assert.equal(result.readabilityAvailable, false);
  assert.equal(result.readabilityBasis, 'undeclared-language');
  assert.equal(result.scores.readability, null);
  assert.match(toMarkdown(result), /Not available \(page language undeclared\)/);
});
test('does not compare readability across supported and unsupported languages', () => {
  const english = analyzePage(sample);
  const spanish = analyzePage({ ...sample, language: 'es', title: 'Informe', text: 'La investigación pública reúne información útil y análisis cuidadoso. '.repeat(20) });
  const comparison = compareBriefs(spanish, english);
  assert.equal(comparison.deltas.readability, null);
  assert.match(toComparisonMarkdown(comparison), /Readability: Not comparable/);
});
test('removes misleading readability when migrating a declared non-English brief', () => {
  const migrated = migrateStoredResult({ ...analyzePage(sample), language: 'fr', scores: { readability: 88, structure: 50, provenance: 50 } });
  assert.equal(migrated.readabilityAvailable, false);
  assert.equal(migrated.scores.readability, null);
  assert.equal(migrateStoredResult(migrated).readabilityBasis, 'unsupported-language');
});
test('normalizes bounded local review metadata during migration', () => {
  const migrated = migrateStoredResult({
    ...analyzePage(sample),
    review: { decision: 'read-deeper', note: `  useful\r\n${'x'.repeat(600)}  `, updatedAt: '2026-07-20' }
  });
  assert.equal(migrated.review.decision, 'read-deeper');
  assert.equal(migrated.review.note.length, 500);
  assert.match(migrated.review.note, /^useful\n/);
  assert.equal(migrated.review.updatedAt, '2026-07-20T00:00:00.000Z');
  assert.deepEqual(normalizeReview({ decision: 'invented', note: '' }), { decision: '', note: '', updatedAt: null });
});
test('Markdown export includes an escaped private review when present', () => {
  const result = analyzePage(sample);
  result.review = { decision: 'reference', note: 'Useful [context](https://evil.example)', updatedAt: '2026-07-20' };
  const markdown = toMarkdown(result);
  assert.match(markdown, /## Private review/);
  assert.match(markdown, /Decision: Keep as reference/);
  assert.ok(markdown.includes('Useful \\[context\\]\\(https://evil\\.example\\)'));
  assert.doesNotMatch(markdown, /\[context\]\(https:\/\/evil\.example\)/);
  assert.doesNotMatch(toMarkdown(analyzePage(sample)), /## Private review/);
});
test('creates and parses a versioned bounded queue backup', () => {
  const first = analyzePage(sample);
  first.review = { decision: 'read-deeper', note: 'Check the source.', updatedAt: '2026-07-20' };
  const duplicate = { ...first, title: 'Duplicate should lose' };
  const backup = createQueueBackup([first, duplicate], '2026-08-01');
  assert.equal(backup.format, 'samsarix-page-lens-queue');
  assert.equal(backup.formatVersion, 1);
  assert.equal(backup.exportedAt, '2026-08-01T00:00:00.000Z');
  assert.equal(backup.briefs.length, 1);
  const parsed = parseQueueBackup({ ...backup, briefs: [...backup.briefs, { nope: true }] });
  assert.equal(parsed.briefs.length, 1); assert.equal(parsed.skipped, 1);
  assert.equal(parsed.briefs[0].review.note, 'Check the source.');
});
test('rejects untrusted or unbounded queue backups without partial results', () => {
  assert.throws(() => parseQueueBackup({ format: 'other', formatVersion: 1, briefs: [] }), /valid Samsarix/);
  assert.throws(() => parseQueueBackup({ format: 'samsarix-page-lens-queue', formatVersion: 1, briefs: Array(101).fill({}) }), /at most 100/);
  assert.throws(() => parseQueueBackup({ format: 'samsarix-page-lens-queue', formatVersion: 1, briefs: [{ title: 'bad' }] }), /no valid briefs/);
});
test('merges imported queue records first and exports portable Markdown', () => {
  const existing = analyzePage(sample);
  const imported = analyzePage({ ...sample, title: 'Imported update' });
  imported.review = { decision: 'reference', note: 'Portable note', updatedAt: '2026-08-01' };
  const second = analyzePage({ ...sample, url: 'https://second.example/report', title: 'Second report' });
  const merged = mergeQueueHistory([imported, second], [existing]);
  assert.equal(merged.length, 2); assert.equal(merged[0].title, 'Imported update');
  const markdown = toQueueMarkdown(merged);
  assert.match(markdown, /2 saved briefs/); assert.match(markdown, /Imported update/); assert.match(markdown, /Portable note/);
});
test('removes only the selected queue identity without mutating input or backup', () => {
  const target = analyzePage(sample);
  const other = analyzePage({ ...sample, url: 'https://other.example/report', title: 'Other report' });
  other.review = { decision: 'reference', note: 'Keep this note.', updatedAt: '2026-08-01T00:00:00.000Z' };
  const history = [target, other];
  const before = JSON.stringify(history);
  const backup = createQueueBackup(history);
  assert.deepEqual(removeQueueBrief(history, { ...target, url: `${target.url}?private=discarded` }), [other]);
  assert.equal(JSON.stringify(history), before);
  assert.equal(backup.briefs.length, 2);
  assert.deepEqual(removeQueueBrief([other], target), [other]);
  assert.deepEqual(removeQueueBrief([target], target), []);
});
test('queue removal distinguishes URL-less briefs using the backup identity contract', () => {
  const first = analyzePage({ ...sample, url: '', title: 'First brief' });
  const second = analyzePage({ ...sample, url: '', title: 'Second brief' });
  assert.deepEqual(removeQueueBrief([first, second], first), [second]);
  assert.throws(() => removeQueueBrief([first], null), /valid saved brief/);
});
