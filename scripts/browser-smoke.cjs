// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { extractPage } = require('../extension/extractor.js');
const assert = require('node:assert/strict');
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
    // Only the disposable test profile enables CDP extension-action automation.
    args: ['--enable-unsafe-extension-debugging', `--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
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
    await popup.waitForFunction(() => document.querySelector('#queue-json-btn')?.disabled === true, null, { timeout: 10000 });
    const pilotFeedbackHref = await popup.locator('#pilot-feedback').getAttribute('href');
    const feedbackUrl = new URL(pilotFeedbackHref);
    const version = await popup.evaluate(() => chrome.runtime.getManifest().version);
    assert.equal(feedbackUrl.pathname, 'support@samsarix.com');
    assert.equal(feedbackUrl.searchParams.get('subject'), `Page Lens ${version} pilot feedback`);
    assert.match(feedbackUrl.searchParams.get('body'), /do not include private page URLs/);
    if (/example\.test|page-url/i.test(pilotFeedbackHref.replace('page%20URLs', ''))) throw new Error('Pilot feedback route unexpectedly contains page-specific data');
    await popup.getByRole('button', { name: 'Import backup' }).waitFor();
    await popup.waitForFunction(() => document.querySelector('#queue-json-btn')?.disabled === true, null, { timeout: 10000 });
    await article.bringToFront();
    const beforeGrant = await popup.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: SamsarixExtractor.extractPage });
        return 'unexpected access';
      } catch (error) { return error.message; }
    });
    assert.match(beforeGrant, /cannot access|permission/i, 'Page access must be denied before invoking the extension');
    // Official CDP action grants real activeTab access; no API/permission stubs.
    // https://chromedevtools.github.io/devtools-protocol/tot/Extensions/#method-triggerAction
    const browserClient = await context.browser().newBrowserCDPSession();
    const { targetInfos } = await browserClient.send('Target.getTargets', { filter: [{ type: 'tab' }] });
    const articleTarget = targetInfos.find(target => target.url === article.url());
    assert.ok(articleTarget, 'The real article tab must be discoverable');
    await browserClient.send('Extensions.triggerAction', { id: extensionId, targetId: articleTarget.targetId });
    // Playwright cannot expose the native action bubble as a Page. Exercise its
    // unchanged popup document in a tab, using the active article's real grant.
    await article.bringToFront(); await popup.evaluate(() => initialize());
    await popup.getByRole('button', { name: 'Create page brief', exact: true }).click();
    await popup.locator('#results:not(.hidden)').waitFor();
    assert.equal(await popup.locator('#brief-title').textContent(), 'Research Signals');
    assert.equal(await popup.locator('#brief-url').textContent(), 'https://example.test/article');
    assert.equal(await popup.locator('#byline').textContent(), 'Samsarix Research');
    assert.equal(await popup.evaluate(async () => (await chrome.storage.local.get({ history: [] })).history.length), 0, 'Analysis alone must not save a brief');
    await context.route('https://other-origin.test/article', route => route.fulfill({ contentType: 'text/html', body: '<h1>A different origin</h1>' }));
    await article.goto('https://other-origin.test/article');
    await popup.getByRole('button', { name: 'Create page brief', exact: true }).click();
    await popup.locator('#error:not(.hidden)').waitFor();
    assert.match(await popup.locator('#error-message').textContent(), /does not allow extensions/);
    await browserClient.detach();
    checkpoint('Browser smoke: access denied before invocation, real action grant + Create page brief passed, and cross-origin navigation revoked access.');
    const migrated = await popup.evaluate(async () => {
      await chrome.storage.local.set({ history: [{ schemaVersion: 1, url: 'https://legacy.example/report?token=private#fragment', title: 'Legacy brief', wordCount: 50, readingMinutes: 1, analyzedAt: '2026-01-01', scores: { readability: 70, structure: 60, evidence: 90 }, counts: { headings: 2, paragraphs: 3, links: 1, citations: 0 }, keywords: [{ term: 'legacy', count: 2 }], excerpt: 'Legacy preview' }] });
      await updateHistory();
      return (await chrome.storage.local.get({ history: [] })).history[0];
    });
    if (migrated.url !== 'https://legacy.example/report' || migrated.sourceSignalsAvailable !== false) throw new Error('Legacy history was not privacy-migrated');
    checkpoint('Browser smoke: legacy migration passed.');
    const overlapping = await popup.evaluate(async snapshot => {
      const original = (await chrome.storage.local.get({ history: [] })).history;
      const first = SamsarixAnalyzer.analyzePage({ ...snapshot, url: 'https://first.example/report', title: 'First pending save' });
      const second = SamsarixAnalyzer.analyzePage({ ...snapshot, url: 'https://second.example/report', title: 'Second pending save' });
      display(first); const firstSave = save();
      display(second); const secondSave = save();
      await Promise.all([firstSave, secondSave]);
      const titles = (await chrome.storage.local.get({ history: [] })).history.map(item => item.title);
      await chrome.storage.local.set({ history: original }); await updateHistory();
      return titles;
    }, snapshot);
    assert.ok(overlapping.includes('First pending save'), 'Overlapping save lost the brief selected when the first Save action began');
    assert.ok(overlapping.includes('Second pending save'), 'Overlapping save lost the second brief');
    checkpoint('Browser smoke: overlapping save preserves each click-time brief.');
    const otherPopup = await context.newPage(); await otherPopup.goto(`chrome-extension://${extensionId}/popup.html`);
    await otherPopup.getByText('1 saved brief', { exact: true }).waitFor();
    await popup.evaluate(() => {
      window.queueTestLock = navigator.locks.request('samsarix-page-lens-history-v2', async () => {
        window.queueTestLockHeld = true;
        await new Promise(resolve => { window.releaseQueueTestLock = resolve; });
      });
    });
    await popup.waitForFunction(() => window.queueTestLockHeld === true);
    try {
      await otherPopup.evaluate(snapshot => {
        display(SamsarixAnalyzer.analyzePage({ ...snapshot, url: 'https://other-window.example/report', title: 'Other window save' }));
        window.pendingQueueSave = save();
      }, snapshot);
      await popup.waitForFunction(async () => (await navigator.locks.query()).pending.some(lock => lock.name === 'samsarix-page-lens-history-v2'));
      assert.equal(await otherPopup.evaluate(async () => (await chrome.storage.local.get({ history: [] })).history.length), 1, 'Another page wrote while the shared queue lock was held');
      await otherPopup.getByRole('button', { name: 'Open saved brief: Legacy brief', exact: true }).click();
    } finally {
      await popup.evaluate(async () => { window.releaseQueueTestLock(); await window.queueTestLock; });
    }
    await otherPopup.evaluate(() => window.pendingQueueSave);
    assert.equal(await otherPopup.locator('#save-btn').textContent(), 'Save locally', 'Finishing a pending save must not label a different displayed brief as saved');
    assert.equal(await otherPopup.evaluate(async () => (await getHistory())[0].title), 'Other window save');
    await otherPopup.getByRole('button', { name: 'Open saved brief: Legacy brief', exact: true }).waitFor();
    const crossWindow = await Promise.all([
      popup.evaluate(snapshot => queueStore.save(SamsarixAnalyzer.analyzePage({ ...snapshot, url: 'https://another-window.example/report', title: 'Another window save' })), snapshot),
      otherPopup.evaluate(async () => queueStore.remove((await getHistory()).find(item => item.title === 'Other window save')))
    ]);
    assert.equal(crossWindow[1].removed, true);
    const afterCrossWindow = await popup.evaluate(async () => (await getHistory()).map(item => item.title));
    assert.deepEqual(afterCrossWindow.sort(), ['Another window save', 'Legacy brief']);
    await popup.evaluate(async () => {
      const legacy = (await getHistory()).find(item => item.title === 'Legacy brief');
      await queueStore.clear(); await queueStore.save(legacy); await updateHistory();
    });
    await otherPopup.close();
    checkpoint('Browser smoke: two extension pages share one queue lock; concurrent save/removal preserves both changes.');
    await popup.getByRole('button', { name: /Open saved brief: Legacy brief/ }).click();
    assert.equal(await popup.locator('#brief-title').textContent(), 'Legacy brief');
    assert.equal(await popup.locator('#brief-url').textContent(), 'https://legacy.example/report');
    await popup.locator('#migration-note').waitFor();
    const result = await popup.evaluate(snapshot => { const analyzed = SamsarixAnalyzer.analyzePage(snapshot); display(analyzed); return analyzed; }, snapshot);
    assert.equal(await popup.locator('#brief-title').textContent(), 'Research Signals');
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
    const readHistory = () => popup.evaluate(async () => (await chrome.storage.local.get({ history: [] })).history);
    const beforeRemoval = await readHistory();
    popup.once('dialog', dialog => dialog.dismiss());
    await popup.getByRole('button', { name: 'Remove saved brief: Research Signals', exact: true }).click();
    await popup.getByText('Removal canceled. The local queue was not changed.').waitFor();
    assert.deepEqual(await readHistory(), beforeRemoval);
    assert.equal(await popup.locator('#brief-title').textContent(), 'Research Signals');
    await popup.evaluate(() => {
      window.originalStorageSet = chrome.storage.local.set;
      chrome.storage.local.set = async () => { throw new Error('Simulated storage write failure'); };
    });
    try {
      popup.once('dialog', dialog => dialog.accept());
      await popup.getByRole('button', { name: 'Remove saved brief: Research Signals', exact: true }).click();
      await popup.getByText('Could not remove this brief. Try Remove again; no removal was confirmed.').waitFor();
      assert.deepEqual(await readHistory(), beforeRemoval);
      assert.equal(await popup.locator('#results').isVisible(), true);
    } finally {
      await popup.evaluate(() => { chrome.storage.local.set = window.originalStorageSet; delete window.originalStorageSet; });
    }
    popup.once('dialog', dialog => dialog.accept());
    await popup.getByRole('button', { name: 'Remove saved brief: Research Signals', exact: true }).focus();
    await popup.keyboard.press('Enter');
    await popup.getByText('Brief removed from this device. Downloaded backups are unchanged; import a backup to restore it.').waitFor();
    assert.deepEqual(await readHistory(), beforeRemoval.filter(item => item.title !== 'Research Signals'));
    assert.equal(await popup.locator('#results').isVisible(), false);
    assert.equal(await popup.locator('#comparison-output').isVisible(), false);
    assert.equal(await popup.locator('#review-note').inputValue(), '');
    assert.equal(await popup.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Remove saved brief: Legacy brief');
    const restoreFile = { name: 'restore.queue.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(queueBackup)) };
    popup.once('dialog', dialog => dialog.accept());
    await popup.locator('#queue-import-file').setInputFiles(restoreFile);
    await popup.getByText('Imported 2 briefs. Queue now has 2.').waitFor();
    assert.deepEqual(await readHistory(), beforeRemoval);
    await popup.getByRole('button', { name: 'Open saved brief: Research Signals', exact: true }).click();
    assert.equal(await popup.locator('#review-note').inputValue(), 'Verify the primary source before citing.');
    checkpoint('Browser smoke: canceled/failed removal, keyboard deletion, and backup restoration passed.');
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
    fs.mkdirSync(path.resolve('output/playwright'), { recursive: true });
    await popup.locator('#history-section').screenshot({ path: path.resolve('output/playwright/portable-queue-panel.png'), animations: 'disabled' });
    checkpoint('Browser smoke: queue backup, import, and recovery filtering passed.');
    await popup.locator('#review-note').fill('Unsaved note on the remaining brief.');
    await popup.locator('#history-filter').selectOption('reference');
    popup.once('dialog', dialog => dialog.accept());
    await popup.getByRole('button', { name: 'Remove saved brief: Imported reference', exact: true }).click();
    await popup.getByText('No saved briefs match this filter.').waitFor();
    assert.equal((await readHistory()).length, 2);
    assert.equal(await popup.locator('#brief-title').textContent(), 'Research Signals');
    assert.equal(await popup.locator('#review-note').inputValue(), 'Unsaved note on the remaining brief.');
    await popup.locator('#history-filter').selectOption('all');
    for (const title of ['Research Signals', 'Legacy brief']) {
      popup.once('dialog', dialog => dialog.accept());
      await popup.getByRole('button', { name: `Remove saved brief: ${title}`, exact: true }).click();
      await popup.getByRole('button', { name: `Remove saved brief: ${title}`, exact: true }).waitFor({ state: 'detached' });
    }
    assert.deepEqual(await readHistory(), []);
    await popup.getByText('No saved briefs yet. Import a Page Lens backup to restore a queue.').waitFor();
    assert.equal(await popup.locator('#queue-json-btn').isDisabled(), true);
    assert.equal(await popup.locator('#queue-import-btn').isEnabled(), true);
    assert.equal(await popup.evaluate(() => document.activeElement?.id), 'history-heading');
    checkpoint('Browser smoke: filtered removal preserved other notes and last-record empty state passed.');
    await context.route('https://example.test/informe', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe público</title><meta name="author" content="Equipo de Investigación"></head><body><main><h1>Informe público</h1><p>${'La investigación pública reúne información útil y análisis cuidadoso. '.repeat(24)}</p><h2>Fuentes</h2><a href="https://fuente.example/estudio">Estudio principal</a></main></body></html>`
    }));
    const spanishPage = await context.newPage(); await spanishPage.goto('https://example.test/informe'); const spanishSnapshot = await spanishPage.evaluate(extractPage);
    const spanishState = await popup.evaluate(snapshot => { const analyzed = SamsarixAnalyzer.analyzePage(snapshot); display(analyzed); return { analyzed, scoreText: $('readability-score').textContent, noteText: $('readability-note').textContent }; }, spanishSnapshot);
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
