// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SamsarixExtractor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function extractPage() {
    const MAX_NODES = 15000; const MAX_TEXT_CHARS = 250000; const MAX_SOURCES = 20; const MAX_OUTLINE = 12;
    const root = document.querySelector('main, article, [role="main"]') || document.body;
    const excluded = 'script, style, noscript, nav, footer, form, dialog, template, [hidden], [aria-hidden="true"]';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && node.matches(excluded)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const textParts = []; const outline = []; const sources = []; const seenHosts = new Set();
    const counts = { headings: 0, paragraphs: 0, links: 0, citations: 0 };
    const pageHost = location.hostname.toLowerCase();
    let textLength = 0; let visitedNodes = 0; let truncated = false;
    while (walker.nextNode()) {
      visitedNodes += 1;
      if (visitedNodes > MAX_NODES) { truncated = true; break; }
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) {
        const value = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (!value) continue;
        const remaining = MAX_TEXT_CHARS - textLength;
        if (remaining <= 0) { truncated = true; break; }
        const part = value.slice(0, remaining); textParts.push(part); textLength += part.length + 1;
        if (part.length < value.length) { truncated = true; break; }
        continue;
      }
      const tag = node.tagName;
      if (/^H[1-6]$/.test(tag)) { counts.headings += 1; if (outline.length < MAX_OUTLINE && /^H[1-3]$/.test(tag)) outline.push(node.textContent || ''); }
      if (tag === 'P') counts.paragraphs += 1;
      if (['CITE', 'BLOCKQUOTE', 'Q'].includes(tag) || node.getAttribute('role') === 'doc-biblioref' || (tag === 'A' && node.parentElement?.tagName === 'SUP')) counts.citations += 1;
      if (tag !== 'A' || !node.hasAttribute('href')) continue;
      counts.links += 1;
      if (sources.length >= MAX_SOURCES) continue;
      try {
        const url = new URL(node.href, location.href); const host = url.hostname.toLowerCase();
        if (!['http:', 'https:'].includes(url.protocol) || !host || host === pageHost || seenHosts.has(host)) continue;
        seenHosts.add(host); sources.push({ host, url: url.href, label: (node.innerText || node.textContent || '').trim() });
      } catch {}
    }
    const meta = (...selectors) => {
      for (const selector of selectors) {
        const element = document.querySelector(selector); const value = element?.content || element?.getAttribute?.('datetime') || element?.textContent;
        if (value?.trim()) return value.trim();
      }
      return '';
    };
    return {
      url: location.href, title: document.title, description: meta('meta[name="description"]', 'meta[property="og:description"]'), language: document.documentElement.lang || '',
      author: meta('meta[name="author"]', 'meta[property="article:author"]', '[rel="author"]', '[itemprop="author"]'),
      publishedAt: meta('meta[property="article:published_time"]', 'meta[name="date"]', 'time[itemprop="datePublished"]', '[itemprop="datePublished"]'),
      modifiedAt: meta('meta[property="article:modified_time"]', 'time[itemprop="dateModified"]', '[itemprop="dateModified"]'), text: textParts.join(' '),
      ...counts, outline, sources, visitedNodes, truncated
    };
  }
  return { extractPage };
});
