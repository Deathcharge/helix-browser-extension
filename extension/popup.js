// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
const $ = id => document.getElementById(id);
let currentTab = null; let currentResult = null;

function show(name) { ['loading', 'error', 'results'].forEach(id => $(id).classList.toggle('hidden', id !== name)); }
function setScore(name, value) { $(`${name}-score`).textContent = `${value}/100`; $(`${name}-bar`).style.width = `${value}%`; }
function formatDate(value) { return value ? new Date(value).toLocaleDateString() : 'Not detected'; }
function tag(text, className = '') { const element = document.createElement('span'); element.textContent = text; if (className) element.className = className; return element; }
function renderList(container, items, emptyText, factory) {
  container.replaceChildren(...(items.length ? items.map(factory) : [tag(emptyText, 'empty-note')]));
}
function display(result) {
  currentResult = result;
  const counts = result.counts && typeof result.counts === 'object' ? result.counts : {};
  $('reading-time').textContent = `${result.readingMinutes} min`;
  $('word-count').textContent = result.wordCount.toLocaleString();
  $('analyzed-at').textContent = new Date(result.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  ['readability', 'structure'].forEach(name => setScore(name, result.scores[name] ?? 0));
  if (result.sourceSignalsAvailable === false) { $('provenance-score').textContent = 'Not analyzed'; $('provenance-bar').style.width = '0'; }
  else setScore('provenance', result.scores.provenance ?? 0);
  $('explanation').textContent = `${Number(counts.headings) || 0} headings · ${Number(counts.paragraphs) || 0} paragraphs · ${Number(counts.externalDomains) || 0} external domains · ${Number(counts.citations) || 0} citation signals`;
  $('byline').textContent = result.author || 'No byline detected';
  $('dates').textContent = `Published ${formatDate(result.publishedAt)} · Updated ${formatDate(result.modifiedAt)}`;
  $('truncation-note').classList.toggle('hidden', !result.extraction?.truncated);
  $('migration-note').classList.toggle('hidden', result.sourceSignalsAvailable !== false);
  $('keywords').replaceChildren(...result.keywords.map(({ term, count }) => tag(`${term} ${count}`)));
  renderList($('signal-list'), result.provenanceSignals || [], 'No source signals detected', signal => {
    const item = document.createElement('li'); item.className = signal.present ? 'signal-present' : 'signal-missing';
    item.append(tag(signal.present ? '✓' : '○', 'signal-icon'), tag(signal.label), tag(signal.detail, 'signal-detail')); return item;
  });
  renderList($('source-list'), result.sources || [], 'No external source domains detected', source => {
    const item = document.createElement('li'); const link = document.createElement('a'); link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = source.host; item.append(link); return item;
  });
  renderList($('outline-list'), result.outline || [], 'No heading outline detected', heading => { const item = document.createElement('li'); item.textContent = heading; return item; });
  show('results');
}
function fail(error) {
  const restricted = /cannot access|chrome:\/\/|edge:\/\/|extensions gallery/i.test(error.message || '');
  $('error-message').textContent = restricted ? 'Chrome does not allow extensions to read this protected page. Open a normal web page and try again.' : (error.message || 'Unexpected error.'); show('error');
}
async function analyze() {
  if (!currentTab?.id || !/^https?:/i.test(currentTab.url || '')) return fail(new Error('Open a normal HTTP or HTTPS page and try again.'));
  show('loading'); $('analyze-btn').disabled = true;
  try {
    const [{ result: snapshot }] = await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, func: SamsarixExtractor.extractPage });
    display(SamsarixAnalyzer.analyzePage(snapshot));
  } catch (error) { fail(error); } finally { $('analyze-btn').disabled = false; }
}
async function getHistory() {
  const stored = await chrome.storage.local.get({ history: [] });
  const original = Array.isArray(stored.history) ? stored.history : [];
  const history = original.map(SamsarixAnalyzer.migrateStoredResult).filter(Boolean).slice(0, 25);
  if (JSON.stringify(history) !== JSON.stringify(original)) await chrome.storage.local.set({ history });
  return history;
}
async function updateHistory() {
  const history = await getHistory();
  $('history-count').textContent = history.length ? `${history.length} saved ${history.length === 1 ? 'brief' : 'briefs'}` : 'No saved briefs';
  $('clear-history-btn').classList.toggle('hidden', history.length === 0);
  $('history-list').replaceChildren(...history.slice(0, 5).map(item => {
    const button = document.createElement('button'); button.className = 'history-item'; button.type = 'button'; button.setAttribute('aria-label', `Open saved brief: ${item.title}`);
    const title = document.createElement('strong'); title.textContent = item.title; const meta = document.createElement('span'); meta.textContent = `${item.wordCount.toLocaleString()} words · ${new Date(item.analyzedAt).toLocaleDateString()}`;
    button.append(title, meta); button.addEventListener('click', () => display(item)); return button;
  }));
  $('history-section').classList.toggle('hidden', history.length === 0);
}
async function save() {
  if (!currentResult) return;
  const history = await getHistory(); const next = [currentResult, ...history.filter(item => item.url !== currentResult.url)].slice(0, 25);
  await chrome.storage.local.set({ history: next }); $('save-btn').textContent = 'Saved'; setTimeout(() => { $('save-btn').textContent = 'Save locally'; }, 1200); await updateHistory();
}
function summary(result) { const sourceScore = result.sourceSignalsAvailable === false ? 'not analyzed' : `${result.scores.provenance}/100`; return `${result.title}\n${result.url}\n${result.wordCount} words · ${result.readingMinutes} min read\nReadability ${result.scores.readability}/100 · Structure ${result.scores.structure}/100 · Source signals ${sourceScore}\nGenerated locally by Samsarix Page Lens. Scores do not establish factuality or credibility.`; }
async function copy() { await navigator.clipboard.writeText(summary(currentResult)); $('copy-btn').textContent = 'Copied'; setTimeout(() => { $('copy-btn').textContent = 'Copy summary'; }, 1200); }
function download(contents, type, extension) {
  const blob = new Blob([contents], { type }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `samsarix-page-lens-${Date.now()}.${extension}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
}
function exportJson() { download(JSON.stringify(currentResult, null, 2), 'application/json', 'json'); }
function exportMarkdown() { download(SamsarixAnalyzer.toMarkdown(currentResult), 'text/markdown', 'md'); }
async function initialize() {
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  $('page-title').textContent = currentTab?.title || 'Current page'; $('page-url').textContent = SamsarixAnalyzer.sanitizeUrl(currentTab?.url || ''); $('analyze-btn').disabled = !/^https?:/i.test(currentTab?.url || ''); await updateHistory();
}
$('analyze-btn').addEventListener('click', analyze); $('retry-btn').addEventListener('click', analyze); $('copy-btn').addEventListener('click', () => copy().catch(fail));
$('json-btn').addEventListener('click', () => { try { exportJson(); } catch (error) { fail(error); } }); $('markdown-btn').addEventListener('click', () => { try { exportMarkdown(); } catch (error) { fail(error); } }); $('save-btn').addEventListener('click', () => save().catch(fail));
$('clear-history-btn').addEventListener('click', async () => { if (!confirm('Clear all saved briefs?')) return; try { await chrome.storage.local.remove('history'); await updateHistory(); } catch (error) { fail(error); } });
document.addEventListener('DOMContentLoaded', () => initialize().catch(fail));
