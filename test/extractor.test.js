// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { extractPage } = require('../extension/extractor.js');

function extract(html, url = 'https://page.example/article') {
  const dom = new JSDOM(html, { url });
  const previous = { document: global.document, location: global.location, NodeFilter: global.NodeFilter, Node: global.Node };
  Object.assign(global, { document: dom.window.document, location: dom.window.location, NodeFilter: dom.window.NodeFilter, Node: dom.window.Node });
  try { return extractPage(); }
  finally { Object.assign(global, previous); dom.window.close(); }
}

test('extractor enforces the exact node boundary', { concurrency: false }, () => {
  const atLimit = extract(`<main>${'<span></span>'.repeat(15000)}</main>`);
  assert.equal(atLimit.visitedNodes, 15000);
  assert.equal(atLimit.truncated, false);

  const overLimit = extract(`<main>${'<span></span>'.repeat(15001)}</main>`);
  assert.equal(overLimit.visitedNodes, 15001);
  assert.equal(overLimit.truncated, true);
});

test('extractor enforces the exact text boundary', { concurrency: false }, () => {
  const atLimit = extract(`<main>${'a'.repeat(250000)}</main>`);
  assert.equal(atLimit.text.length, 250000);
  assert.equal(atLimit.truncated, false);

  const overLimit = extract(`<main>${'a'.repeat(250001)}</main>`);
  assert.equal(overLimit.text.length, 250000);
  assert.equal(overLimit.truncated, true);
});

test('extractor excludes private subtrees and caps unique source domains', { concurrency: false }, () => {
  const links = Array.from({ length: 25 }, (_, index) => `<a href="https://source-${index}.example/report">Source ${index}</a>`).join('');
  const result = extract(`<main><p>Visible article text</p><form>private form text</form><script>private script text</script><section hidden>private hidden text</section><section aria-hidden="true">private aria text</section>${links}<a href="https://source-0.example/duplicate">Duplicate</a></main>`);
  assert.equal(result.sources.length, 20);
  assert.equal(new Set(result.sources.map(source => source.host)).size, 20);
  assert.equal(result.sources[0].host, 'source-0.example');
  assert.equal(result.sources[19].host, 'source-19.example');
  assert.doesNotMatch(result.text, /private/);
  assert.match(result.text, /Visible article text/);
});

test('extractor skips excluded primary roots and body metadata', { concurrency: false }, () => {
  const result = extract(`
    <main hidden><p>hidden primary secret</p></main>
    <form><article><p>form article secret</p></article><span rel="author">hidden author</span></form>
    <main><p>Visible primary article text</p></main>
  `);
  assert.match(result.text, /Visible primary article text/);
  assert.doesNotMatch(result.text, /secret/);
  assert.equal(result.author, '');

  const headMetadata = extract('<head><meta name="author" content="Public Author"></head><body><main><p>Visible article text</p></main></body>');
  assert.equal(headMetadata.author, 'Public Author');
});

test('extractor bounds secondary fields before returning the snapshot', { concurrency: false }, () => {
  const longSource = `https://source.example/${'x'.repeat(5000)}`;
  const result = extract(`
    <head><title>${'t'.repeat(500)}</title><meta name="description" content="${'d'.repeat(500)}"></head>
    <body><main>
      <h1>${'h'.repeat(500)}</h1>
      <p>Visible article text with enough content for extraction.</p>
      <a href="https://source.example/report">${'l'.repeat(500)}</a>
      <a href="${longSource}">Oversized source</a>
    </main></body>
  `);
  assert.equal(result.title.length, 300);
  assert.equal(result.description.length, 300);
  assert.equal(result.outline[0].length, 160);
  assert.equal(result.sources[0].label.length, 120);
  assert.equal(result.sources.length, 1);
  assert.equal(result.truncated, true);
});
