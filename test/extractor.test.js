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
