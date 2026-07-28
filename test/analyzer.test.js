const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzePage, topKeywords } = require('../helix_browser_extension/helix-browser-extension/analyzer.js');

const sample = {
  url: 'https://example.com/report', title: 'Example report', headings: 3, paragraphs: 7, links: 5, citations: 2,
  text: 'Research teams need clear evidence and readable explanations. '.repeat(20)
};
test('analyzes a representative page deterministically', () => {
  const result = analyzePage(sample);
  assert.equal(result.url, sample.url);
  assert.equal(result.wordCount, 160);
  assert.equal(result.readingMinutes, 1);
  for (const score of Object.values(result.scores)) assert.ok(score >= 0 && score <= 100);
  assert.deepEqual(result.counts, { sentences: 20, headings: 3, paragraphs: 7, links: 5, citations: 2 });
});
test('rejects pages without enough readable text', () => assert.throws(() => analyzePage({ text: 'Too short.' }), /at least 20 words/));
test('keywords exclude common words and use stable ordering', () => assert.deepEqual(topKeywords(['the', 'signal', 'signal', 'alpha', 'alpha']), [{ term: 'alpha', count: 2 }, { term: 'signal', count: 2 }]));
test('input text is capped in exported excerpt', () => assert.ok(analyzePage({ ...sample, text: 'word '.repeat(100) }).excerpt.length <= 280));
