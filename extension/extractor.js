// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SamsarixExtractor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function extractPage() {
    const MAX_NODES = 15000; const MAX_TEXT_CHARS = 250000; const MAX_SOURCES = 20; const MAX_OUTLINE = 12;
    const MAX_URL_CHARS = 4096; const MAX_TITLE_CHARS = 300; const MAX_META_CHARS = 300;
    const MAX_AUTHOR_CHARS = 160; const MAX_DATE_CHARS = 128; const MAX_LANGUAGE_CHARS = 20;
    const MAX_OUTLINE_CHARS = 160; const MAX_SOURCE_LABEL_CHARS = 120;
    const excluded = 'script, style, noscript, nav, footer, form, dialog, template, [hidden], [aria-hidden="true"]';
    const isExcluded = element => Boolean(element?.closest?.(excluded));
    const primaryRoots = [...document.querySelectorAll('main, article, [role="main"]')];
    const root = primaryRoots.find(element => !isExcluded(element)) || (!isExcluded(document.body) ? document.body : null);
    const walker = root ? document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && node.matches(excluded)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }) : null;
    const textParts = []; const outline = []; const sources = []; const seenHosts = new Set();
    const counts = { headings: 0, paragraphs: 0, links: 0, citations: 0 };
    const pageHost = location.hostname.toLowerCase();
    let textLength = 0; let visitedNodes = 0; let truncated = false;
    const boundedValue = (value, limit) => {
      const raw = String(value || '');
      if (raw.length > limit) truncated = true;
      return raw.slice(0, limit).replace(/\s+/g, ' ').trim();
    };
    const boundedUrl = value => {
      const raw = String(value || '');
      if (raw.length > MAX_URL_CHARS) { truncated = true; return ''; }
      return raw;
    };
    const boundedElementText = (element, limit) => {
      const textWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const parts = []; let length = 0;
      while (textWalker.nextNode()) {
        const textNode = textWalker.currentNode;
        if (isExcluded(textNode.parentElement)) continue;
        const separator = parts.length ? 1 : 0;
        const remaining = limit - length - separator;
        if (remaining <= 0) { truncated = true; break; }
        const raw = String(textNode.nodeValue || '');
        if (raw.length > remaining) truncated = true;
        const part = raw.slice(0, remaining).replace(/\s+/g, ' ').trim();
        if (part) { parts.push(part); length += separator + part.length; }
        if (raw.length > remaining) break;
      }
      return parts.join(' ');
    };
    while (walker?.nextNode()) {
      visitedNodes += 1;
      if (visitedNodes > MAX_NODES) { truncated = true; break; }
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) {
        const separator = textParts.length ? 1 : 0;
        const remaining = MAX_TEXT_CHARS - textLength - separator;
        if (remaining <= 0) { truncated = true; break; }
        const raw = String(node.nodeValue || '');
        const part = raw.slice(0, remaining).replace(/\s+/g, ' ').trim();
        if (part) { textParts.push(part); textLength += separator + part.length; }
        if (raw.length > remaining) { truncated = true; break; }
        continue;
      }
      const tag = node.tagName;
      if (/^H[1-6]$/.test(tag)) { counts.headings += 1; if (outline.length < MAX_OUTLINE && /^H[1-3]$/.test(tag)) outline.push(boundedElementText(node, MAX_OUTLINE_CHARS)); }
      if (tag === 'P') counts.paragraphs += 1;
      if (['CITE', 'BLOCKQUOTE', 'Q'].includes(tag) || node.getAttribute('role') === 'doc-biblioref' || (tag === 'A' && node.parentElement?.tagName === 'SUP')) counts.citations += 1;
      if (tag !== 'A' || !node.hasAttribute('href')) continue;
      counts.links += 1;
      if (sources.length >= MAX_SOURCES) continue;
      try {
        const href = boundedUrl(node.getAttribute('href'));
        if (!href) continue;
        const url = new URL(href, location.href); const host = url.hostname.toLowerCase();
        if (!boundedUrl(url.href)) continue;
        if (!['http:', 'https:'].includes(url.protocol) || !host || host === pageHost || seenHosts.has(host)) continue;
        seenHosts.add(host); sources.push({ host, url: url.href, label: boundedElementText(node, MAX_SOURCE_LABEL_CHARS) });
      } catch {}
    }
    const meta = (limit, ...selectors) => {
      for (const selector of selectors) {
        for (const element of document.querySelectorAll(selector)) {
          const headMeta = element.tagName === 'META' && Boolean(element.closest('head'));
          if (!headMeta && isExcluded(element)) continue;
          const value = element.content || element.getAttribute?.('datetime') || boundedElementText(element, limit);
          const bounded = boundedValue(value, limit);
          if (bounded) return bounded;
        }
      }
      return '';
    };
    return {
      url: boundedUrl(location.href), title: boundedValue(document.title, MAX_TITLE_CHARS),
      description: meta(MAX_META_CHARS, 'meta[name="description"]', 'meta[property="og:description"]'),
      language: boundedValue(document.documentElement.lang || '', MAX_LANGUAGE_CHARS),
      author: meta(MAX_AUTHOR_CHARS, 'meta[name="author"]', 'meta[property="article:author"]', '[rel="author"]', '[itemprop="author"]'),
      publishedAt: meta(MAX_DATE_CHARS, 'meta[property="article:published_time"]', 'meta[name="date"]', 'time[itemprop="datePublished"]', '[itemprop="datePublished"]'),
      modifiedAt: meta(MAX_DATE_CHARS, 'meta[property="article:modified_time"]', 'time[itemprop="dateModified"]', '[itemprop="dateModified"]'), text: textParts.join(' '),
      ...counts, outline, sources, visitedNodes, truncated
    };
  }
  return { extractPage };
});
