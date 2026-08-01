// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { extractPage } = require('../extension/extractor.js');
const captureStoreAssets = process.argv.includes('--store-assets');
const progressFile = path.resolve('output/browser-smoke-progress.txt');
function checkpoint(message) { fs.mkdirSync(path.dirname(progressFile), { recursive: true }); fs.appendFileSync(progressFile, `${new Date().toISOString()} ${message}\n`); console.log(message); }

async function screenshotPopup(page, file) {
  const height = await page.evaluate(() => Math.min(10000, Math.ceil(document.documentElement.scrollHeight)));
  await page.setViewportSize({ width: 410, height });
  await page.screenshot({ path: file, animations: 'disabled', fullPage: false, timeout: 30000 });
}

(async () => {
  fs.rmSync(progressFile, { force: true });
  const extensionPath = path.resolve('dist/samsarix-page-lens');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'samsarix-page-lens-'));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, acceptDownloads: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
  });
  let completed = false;
  try {
    const extensions = await context.newPage();
    await extensions.goto('chrome://extensions');
    await extensions.locator('extensions-item').first().waitFor({ timeout: 10000 });
    const extensionId = await extensions.locator('extensions-item').first().getAttribute('id');
    if (!extensionId) throw new Error('Loaded extension did not expose an ID');
    await context.route('https://example.test/article?private=token', route => route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html lang="en"><head><title>Research Signals</title><meta name="author" content="Samsarix Research"><meta property="article:published_time" content="2026-07-01"><meta name="description" content="A representative source brief fixture"></head><body><main><h1>Research Signals</h1><p>${'Good sources help readers check clear claims and learn more. '.repeat(24)}</p><h2>Sources</h2><p><a href="https://primary.example/paper?tracking=secret">Primary source</a></p><blockquote>Quoted evidence</blockquote><form><input value="private form value"></form></main></body></html>`
    }));
    const article = await context.newPage(); await article.goto('https://example.test/article?private=token');
    const snapshot = await article.evaluate(extractPage);
    if (snapshot.text.includes('private form value')) throw new Error('Extractor included form content');
    if (snapshot.author !== 'Samsarix Research' || snapshot.sources.length !== 1) throw new Error('Extractor missed provenance metadata');
    const popup = await context.newPage(); await popup.goto(`chrome-extension://${extensionId}/popup.html`); await popup.getByText('Samsarix Page Lens').waitFor();
    await popup.getByRole('button', { name: 'Import backup' }).waitFor();
    if (!await popup.getByRole('button', { name: 'Backup JSON' }).isDisabled()) throw new Error('Empty queue allowed an empty backup export');
    const migrated = await popup.evaluate(async () => {
      await chrome.storage.local.set({ history: [{ schemaVersion: 1, url: 'https://legacy.example/report?token=private#fragment', title: 'Legacy brief', wordCount: 50, readingMinutes: 1, analyzedAt: '2026-01-01', scores: { readability: 70, structure: 60, evidence: 90 }, counts: { headings: 2, paragraphs: 3, links: 1, citations: 0 }, keywords: [{ term: 'legacy', count: 2 }], excerpt: 'Legacy preview' }] });
      await updateHistory();
      return (await chrome.storage.local.get({ history: [] })).history[0];
    });
    if (migrated.url !== 'https://legacy.example/report' || migrated.sourceSignalsAvailable !== false) throw new Error('Legacy history was not privacy-migrated');
    checkpoint('Browser smoke: legacy migration passed.');
    await popup.getByRole('button', { name: /Open saved brief: Legacy brief/ }).click();
    await popup.locator('#migration-note').waitFor();
    const result = await popup.evaluate(snapshot => { const analyzed = SamsarixAnalyzer.analyzePage(snapshot); display(analyzed); $('page-title').textContent = analyzed.title; $('page-url').textContent = analyzed.url; return analyzed; }, snapshot);
    if (result.url.includes('?') || result.sources[0].url.includes('?')) throw new Error('Result retained private URL parameters');
    await popup.getByText('Provenance checklist', { exact: true }).waitFor(); await popup.locator('#byline').getByText('Samsarix Research').waitFor();
    await popup.locator('#review-decision').selectOption('read-deeper'); await popup.locator('#review-note').fill('Verify the primary source before citing.');
    await popup.evaluate(() => save()); await popup.getByText('Research queue').waitFor();
    const storedReview = await popup.evaluate(async () => (await chrome.storage.local.get({ history: [] })).history[0].review);
    if (storedReview.decision !== 'read-deeper' || storedReview.note !== 'Verify the primary source before citing.') throw new Error('Private review was not saved with the brief');
    if (captureStoreAssets) {
      fs.mkdirSync(path.resolve('output/playwright'), { recursive: true });
      await popup.locator('.review-section').screenshot({ path: path.resolve('output/playwright/private-review-panel.png'), animations: 'disabled' });
    }
    await popup.locator('#history-filter').selectOption('read-deeper');
    await popup.getByRole('button', { name: /Open saved brief: Research Signals/ }).waitFor();
    await popup.locator('#history-filter').selectOption('skip'); await popup.getByText('No saved briefs match this filter.').waitFor(); await popup.locator('#history-filter').selectOption('all');
    checkpoint('Browser smoke: private review and queue filtering passed.');
    await popup.getByRole('heading', { name: 'Compare with a saved brief' }).waitFor();
    if (await popup.locator('#compare-select option:checked').textContent() !== 'Legacy brief') throw new Error('Saved comparison baseline was not selectable');
    await popup.getByRole('button', { name: 'Compare', exact: true }).click();
    await popup.locator('#comparison-output').waitFor();
    const comparison = await popup.evaluate(() => currentComparison);
    if (comparison.baseline.title !== 'Legacy brief' || comparison.current.title !== 'Research Signals') throw new Error('Local brief comparison used the wrong pages');
    if (!Number.isFinite(comparison.deltas.wordCount)) throw new Error('Local brief comparison did not calculate deltas');
    checkpoint('Browser smoke: local comparison passed.');
    const [comparisonDownload] = await Promise.all([popup.waitForEvent('download'), popup.getByRole('button', { name: 'Comparison Markdown' }).click()]);
    if (!comparisonDownload.suggestedFilename().endsWith('.comparison.md')) throw new Error('Comparison Markdown export used an unexpected filename');
    await comparisonDownload.delete();
    checkpoint('Browser smoke: comparison export passed.');
    if (captureStoreAssets) {
      await screenshotPopup(popup, path.resolve('output/playwright/page-lens-comparison.png'));
      await popup.locator('#comparison-output').screenshot({ path: path.resolve('output/playwright/comparison-panel.png') });
    }
    await popup.getByRole('button', { name: 'Open saved brief: Research Signals' }).click(); await popup.getByText('Source signals').first().waitFor();
    if (await popup.locator('#review-decision').inputValue() !== 'read-deeper' || await popup.locator('#review-note').inputValue() !== 'Verify the primary source before citing.') throw new Error('Saved review did not reopen');
    const reviewTimestamp = await popup.evaluate(() => currentResult.review.updatedAt);
    await popup.evaluate(() => applyReviewInputs());
    if (await popup.evaluate(() => currentResult.review.updatedAt) !== reviewTimestamp) throw new Error('Unchanged review input rewrote its edit timestamp');
    checkpoint('Browser smoke: saved review reopened.');
    const [queueDownload] = await Promise.all([popup.waitForEvent('download'), popup.getByRole('button', { name: 'Backup JSON' }).click()]);
    if (!queueDownload.suggestedFilename().endsWith('.queue.json')) throw new Error('Queue backup used an unexpected filename');
    const queueBackup = JSON.parse(fs.readFileSync(await queueDownload.path(), 'utf8'));
    if (queueBackup.format !== 'samsarix-page-lens-queue' || queueBackup.briefs.length !== 2) throw new Error('Queue backup did not contain the saved research queue');
    await queueDownload.delete();
    const importedBrief = { ...queueBackup.briefs[0], url: 'https://imported.example/report?private=removed', title: 'Imported reference', review: { decision: 'reference', note: 'Restored from a local backup.', updatedAt: '2026-08-01' } };
    const importFile = { name: 'page-lens.queue.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...queueBackup, briefs: [importedBrief, { invalid: true }] })) };
    popup.once('dialog', dialog => dialog.dismiss());
    await popup.locator('#queue-import-file').setInputFiles(importFile);
    await popup.getByText('Import canceled. The local queue was not changed.').waitFor();
    if ((await popup.evaluate(async () => (await chrome.storage.local.get({ history: [] })).history)).length !== 2) throw new Error('Canceled queue import changed local history');
    popup.once('dialog', dialog => dialog.accept());
    await popup.locator('#queue-import-file').setInputFiles(importFile);
    await popup.getByText(/Imported 1 brief · skipped 1/).waitFor();
    const importedHistory = await popup.evaluate(async () => (await chrome.storage.local.get({ history: [] })).history);
    if (importedHistory[0].url !== 'https://imported.example/report' || importedHistory[0].review.decision !== 'reference') throw new Error('Queue import did not normalize and prioritize the imported brief');
    await popup.locator('#history-filter').selectOption('reference'); await popup.getByRole('button', { name: /Open saved brief: Imported reference/ }).waitFor(); await popup.locator('#history-filter').selectOption('all');
    if (captureStoreAssets) await popup.locator('#history-section').screenshot({ path: path.resolve('output/playwright/portable-queue-panel.png'), animations: 'disabled' });
    checkpoint('Browser smoke: queue backup, import, and recovery filtering passed.');
    await context.route('https://example.test/informe', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe público</title><meta name="author" content="Equipo de Investigación"></head><body><main><h1>Informe público</h1><p>${'La investigación pública reúne información útil y análisis cuidadoso. '.repeat(24)}</p><h2>Fuentes</h2><a href="https://fuente.example/estudio">Estudio principal</a></main></body></html>`
    }));
    const spanishPage = await context.newPage(); await spanishPage.goto('https://example.test/informe'); const spanishSnapshot = await spanishPage.evaluate(extractPage);
    const spanishState = await popup.evaluate(snapshot => { const analyzed = SamsarixAnalyzer.analyzePage(snapshot); display(analyzed); $('page-title').textContent = analyzed.title; $('page-url').textContent = analyzed.url; return { analyzed, scoreText: $('readability-score').textContent, noteText: $('readability-note').textContent }; }, spanishSnapshot);
    if (spanishState.analyzed.language !== 'es' || spanishState.analyzed.readabilityAvailable !== false || spanishState.analyzed.scores.readability !== null) throw new Error('Declared non-English readability was not suppressed');
    if (spanishState.scoreText !== 'Not available') throw new Error('Popup did not render the unavailable readability state');
    if (!/page declares es/i.test(spanishState.noteText)) throw new Error('Popup did not explain the declared-language limitation');
    checkpoint('Browser smoke: language-honest rendering passed.');
    if (captureStoreAssets) {
      const multilingualEvidence = await context.newPage();
      await multilingualEvidence.goto(`chrome-extension://${extensionId}/popup.html`);
      await multilingualEvidence.evaluate(analyzed => { display(analyzed); $('page-title').textContent = analyzed.title; $('page-url').textContent = analyzed.url; }, spanishState.analyzed);
      await screenshotPopup(multilingualEvidence, path.resolve('output/playwright/page-lens-multilingual.png'));
    await multilingualEvidence.close();
    }
    checkpoint(`Browser smoke passed for extension ${extensionId}.`);
    completed = true;
  } finally {
    let closed = false;
    try {
      checkpoint('Browser smoke: cleanup started.');
      await Promise.race([Promise.all(context.pages().map(page => page.close({ runBeforeUnload: false }).catch(() => {}))), new Promise(resolve => setTimeout(resolve, 10000))]);
      checkpoint('Browser smoke: pages closed or timed out.');
      closed = await Promise.race([context.close().then(() => true), new Promise(resolve => setTimeout(() => resolve(false), 10000))]);
      checkpoint(`Browser smoke: context close ${closed ? 'passed' : 'timed out'}.`);
      if (!closed) {
        const browser = context.browser();
        if (browser) closed = await Promise.race([browser.close().then(() => true).catch(() => false), new Promise(resolve => setTimeout(() => resolve(false), 10000))]);
        checkpoint(`Browser smoke: browser close ${closed ? 'passed' : 'timed out'}.`);
      }
    } finally {
      if (closed) {
        const removed = await Promise.race([fs.promises.rm(profile, { recursive: true, force: true }).then(() => true).catch(() => false), new Promise(resolve => setTimeout(() => resolve(false), 5000))]);
        checkpoint(`Browser smoke: profile cleanup ${removed ? 'passed' : 'deferred to OS temp cleanup'}.`);
        if (!removed && completed) process.exit(0);
      } else if (completed) { checkpoint('Browser smoke: forcing successful exit after cleanup timeout.'); process.exit(0); }
    }
  }
})().catch(error => { console.error(error); process.exit(1); });
