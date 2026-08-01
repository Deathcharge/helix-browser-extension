// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { extractPage } = require('../extension/extractor.js');

async function screenshotPopup(page, file) {
  await page.setViewportSize({ width: 410, height: 800 });
  const session = await page.context().newCDPSession(page);
  try {
    const { cssContentSize } = await session.send('Page.getLayoutMetrics');
    const screenshot = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 410, height: cssContentSize.height, scale: 1 } });
    fs.writeFileSync(file, Buffer.from(screenshot.data, 'base64'));
  } finally { await session.detach(); }
}

(async () => {
  const extensionPath = path.resolve('dist/samsarix-page-lens');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'samsarix-page-lens-'));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
  });
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
    const migrated = await popup.evaluate(async () => {
      await chrome.storage.local.set({ history: [{ schemaVersion: 1, url: 'https://legacy.example/report?token=private#fragment', title: 'Legacy brief', wordCount: 50, readingMinutes: 1, analyzedAt: '2026-01-01', scores: { readability: 70, structure: 60, evidence: 90 }, counts: { headings: 2, paragraphs: 3, links: 1, citations: 0 }, keywords: [{ term: 'legacy', count: 2 }], excerpt: 'Legacy preview' }] });
      await updateHistory();
      return (await chrome.storage.local.get({ history: [] })).history[0];
    });
    if (migrated.url !== 'https://legacy.example/report' || migrated.sourceSignalsAvailable !== false) throw new Error('Legacy history was not privacy-migrated');
    await popup.getByRole('button', { name: /Open saved brief: Legacy brief/ }).click();
    await popup.locator('#migration-note').waitFor();
    const result = await popup.evaluate(snapshot => { const analyzed = SamsarixAnalyzer.analyzePage(snapshot); display(analyzed); $('page-title').textContent = analyzed.title; $('page-url').textContent = analyzed.url; return analyzed; }, snapshot);
    if (result.url.includes('?') || result.sources[0].url.includes('?')) throw new Error('Result retained private URL parameters');
    await popup.getByText('Provenance checklist', { exact: true }).waitFor(); await popup.locator('#byline').getByText('Samsarix Research').waitFor();
    await popup.evaluate(() => save()); await popup.getByText('Recent saved briefs').waitFor();
    await popup.getByRole('heading', { name: 'Compare with a saved brief' }).waitFor();
    if (await popup.locator('#compare-select option:checked').textContent() !== 'Legacy brief') throw new Error('Saved comparison baseline was not selectable');
    await popup.getByRole('button', { name: 'Compare', exact: true }).click();
    await popup.locator('#comparison-output').waitFor();
    const comparison = await popup.evaluate(() => currentComparison);
    if (comparison.baseline.title !== 'Legacy brief' || comparison.current.title !== 'Research Signals') throw new Error('Local brief comparison used the wrong pages');
    if (!Number.isFinite(comparison.deltas.wordCount)) throw new Error('Local brief comparison did not calculate deltas');
    const [comparisonDownload] = await Promise.all([popup.waitForEvent('download'), popup.getByRole('button', { name: 'Comparison Markdown' }).click()]);
    if (!comparisonDownload.suggestedFilename().endsWith('.comparison.md')) throw new Error('Comparison Markdown export used an unexpected filename');
    fs.mkdirSync(path.resolve('output/playwright'), { recursive: true });
    await screenshotPopup(popup, path.resolve('output/playwright/page-lens-comparison.png'));
    await popup.locator('#comparison-output').screenshot({ path: path.resolve('output/playwright/comparison-panel.png') });
    await popup.getByRole('button', { name: 'Open saved brief: Research Signals' }).click(); await popup.getByText('Source signals').first().waitFor();
    await context.route('https://example.test/informe', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe público</title><meta name="author" content="Equipo de Investigación"></head><body><main><h1>Informe público</h1><p>${'La investigación pública reúne información útil y análisis cuidadoso. '.repeat(24)}</p><h2>Fuentes</h2><a href="https://fuente.example/estudio">Estudio principal</a></main></body></html>`
    }));
    const spanishPage = await context.newPage(); await spanishPage.goto('https://example.test/informe'); const spanishSnapshot = await spanishPage.evaluate(extractPage);
    const spanishResult = await popup.evaluate(snapshot => { const analyzed = SamsarixAnalyzer.analyzePage(snapshot); display(analyzed); $('page-title').textContent = analyzed.title; $('page-url').textContent = analyzed.url; return analyzed; }, spanishSnapshot);
    if (spanishResult.language !== 'es' || spanishResult.readabilityAvailable !== false || spanishResult.scores.readability !== null) throw new Error('Declared non-English readability was not suppressed');
    if (await popup.locator('#readability-score').textContent() !== 'Not available') throw new Error('Popup did not render the unavailable readability state');
    if (!/page declares es/i.test(await popup.locator('#readability-note').textContent())) throw new Error('Popup did not explain the declared-language limitation');
    await screenshotPopup(popup, path.resolve('output/playwright/page-lens-multilingual.png'));
    console.log(`Browser smoke passed for extension ${extensionId}.`);
  } finally {
    let closed = false;
    try {
      closed = await Promise.race([context.close().then(() => true), new Promise(resolve => setTimeout(() => resolve(false), 10000))]);
      if (!closed) {
        const browser = context.browser();
        if (browser) await browser.close().catch(() => {});
        closed = true;
      }
    } finally {
      if (closed) try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    }
  }
})().catch(error => { console.error(error); process.exit(1); });
