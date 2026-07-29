// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
const $ = id => document.getElementById(id);
let currentTab = null;
let currentResult = null;

function extractVisiblePage() {
  const root = document.querySelector('main, article, [role="main"]') || document.body;
  const clone = root.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, nav, footer, form, dialog, [hidden], [aria-hidden="true"]').forEach(node => node.remove());
  const text = clone.innerText || clone.textContent || '';
  return {
    url: location.href,
    title: document.title,
    text: text.slice(0, 250000),
    headings: clone.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
    paragraphs: clone.querySelectorAll('p').length,
    links: clone.querySelectorAll('a[href]').length,
    citations: clone.querySelectorAll('cite, blockquote, q, [role="doc-biblioref"], sup a[href]').length
  };
}

function show(name) {
  ['loading', 'error', 'results'].forEach(id => $(id).classList.toggle('hidden', id !== name));
}
function setScore(name, value) {
  $(`${name}-score`).textContent = `${value}/100`;
  $(`${name}-bar`).style.width = `${value}%`;
}
function display(result) {
  currentResult = result;
  $('reading-time').textContent = `${result.readingMinutes} min`;
  $('word-count').textContent = result.wordCount.toLocaleString();
  $('analyzed-at').textContent = new Date(result.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  Object.entries(result.scores).forEach(([name, value]) => setScore(name, value));
  $('explanation').textContent = `${result.counts.headings} headings · ${result.counts.paragraphs} paragraphs · ${result.counts.links} links · ${result.counts.citations} citation signals`;
  $('keywords').replaceChildren(...result.keywords.map(({ term, count }) => {
    const tag = document.createElement('span'); tag.textContent = `${term} ${count}`; return tag;
  }));
  show('results');
}
function fail(error) {
  const restricted = /cannot access|chrome:\/\/|edge:\/\/|extensions gallery/i.test(error.message || '');
  $('error-message').textContent = restricted ? 'Chrome does not allow extensions to read this protected page. Open a normal web page and try again.' : (error.message || 'Unexpected error.');
  show('error');
}
async function analyze() {
  if (!currentTab?.id || !/^https?:/i.test(currentTab.url || '')) return fail(new Error('Open a normal HTTP or HTTPS page and try again.'));
  show('loading'); $('analyze-btn').disabled = true;
  try {
    const [{ result: snapshot }] = await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, func: extractVisiblePage });
    display(SamsarixAnalyzer.analyzePage(snapshot));
  } catch (error) { fail(error); }
  finally { $('analyze-btn').disabled = false; }
}
async function updateHistory() {
  const stored = await chrome.storage.local.get({ history: [] });
  const history = Array.isArray(stored.history)
    ? stored.history.filter(item => item && typeof item.title === 'string' && typeof item.url === 'string' && Number.isFinite(item.wordCount) && item.scores && item.counts && Array.isArray(item.keywords))
    : [];
  $('history-count').textContent = history.length ? `${history.length} saved ${history.length === 1 ? 'analysis' : 'analyses'}` : 'No saved analyses';
  $('clear-history-btn').classList.toggle('hidden', history.length === 0);
  $('history-list').replaceChildren(...history.slice(0, 5).map((item, index) => {
    const button = document.createElement('button');
    button.className = 'history-item'; button.type = 'button';
    button.setAttribute('aria-label', `Open saved analysis: ${item.title}`);
    const title = document.createElement('strong'); title.textContent = item.title;
    const meta = document.createElement('span');
    meta.textContent = `${item.wordCount.toLocaleString()} words · ${new Date(item.analyzedAt).toLocaleDateString()}`;
    button.append(title, meta);
    button.addEventListener('click', () => display(item));
    button.dataset.index = String(index);
    return button;
  }));
  $('history-section').classList.toggle('hidden', history.length === 0);
}
async function save() {
  if (!currentResult) return;
  const stored = await chrome.storage.local.get({ history: [] });
  const history = Array.isArray(stored.history) ? stored.history : [];
  const next = [currentResult, ...history.filter(item => item.url !== currentResult.url)].slice(0, 25);
  await chrome.storage.local.set({ history: next });
  $('save-btn').textContent = 'Saved'; setTimeout(() => { $('save-btn').textContent = 'Save locally'; }, 1200);
  updateHistory();
}
function summary(result) {
  return `${result.title}\n${result.url}\n${result.wordCount} words · ${result.readingMinutes} min read\nReadability ${result.scores.readability}/100 · Structure ${result.scores.structure}/100 · Evidence ${result.scores.evidence}/100\nGenerated locally by Samsarix Page Lens.`;
}
async function copy() {
  await navigator.clipboard.writeText(summary(currentResult));
  $('copy-btn').textContent = 'Copied'; setTimeout(() => { $('copy-btn').textContent = 'Copy summary'; }, 1200);
}
function exportJson() {
  const blob = new Blob([JSON.stringify(currentResult, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `samsarix-page-lens-${Date.now()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
}
async function initialize() {
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  $('page-title').textContent = currentTab?.title || 'Current page';
  $('page-url').textContent = currentTab?.url || '';
  $('analyze-btn').disabled = !/^https?:/i.test(currentTab?.url || '');
  await updateHistory();
}
$('analyze-btn').addEventListener('click', analyze);
$('retry-btn').addEventListener('click', analyze);
$('copy-btn').addEventListener('click', () => copy().catch(fail));
$('export-btn').addEventListener('click', exportJson);
$('save-btn').addEventListener('click', () => save().catch(fail));
$('clear-history-btn').addEventListener('click', async () => {
  if (!confirm('Clear all saved analyses?')) return;
  try { await chrome.storage.local.remove('history'); await updateHistory(); }
  catch (error) { fail(error); }
});
document.addEventListener('DOMContentLoaded', () => initialize().catch(fail));
