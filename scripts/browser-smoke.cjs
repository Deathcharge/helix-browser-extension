// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { extractPage } = require('../extension/extractor.js');

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
      body: `<!doctype html><html lang="en"><head><title>Research Signals</title><meta name="author" content="Samsarix Research"><meta property="article:published_time" content="2026-07-01"><meta name="description" content="A representative source brief fixture"></head><body><main><h1>Research Signals</h1><p>${'Clear evidence supports careful research and readable explanations. '.repeat(24)}</p><h2>Sources</h2><p><a href="https://primary.example/paper?tracking=secret">Primary source</a></p><blockquote>Quoted evidence</blockquote><form><input value="private form value"></form></main></body></html>`
    }));
    const article = await context.newPage(); await article.goto('https://example.test/article?private=token');
    const snapshot = await article.evaluate(extractPage);
    if (snapshot.text.includes('private form value')) throw new Error('Extractor included form content');
    if (snapshot.author !== 'Samsarix Research' || snapshot.sources.length !== 1) throw new Error('Extractor missed provenance metadata');
    const popup = await context.newPage(); await popup.goto(`chrome-extension://${extensionId}/popup.html`); await popup.getByText('Samsarix Page Lens').waitFor();
    const result = await popup.evaluate(snapshot => { const analyzed = SamsarixAnalyzer.analyzePage(snapshot); display(analyzed); return analyzed; }, snapshot);
    if (result.url.includes('?') || result.sources[0].url.includes('?')) throw new Error('Result retained private URL parameters');
    await popup.getByText('Provenance checklist').waitFor(); await popup.locator('#byline').getByText('Samsarix Research').waitFor();
    await popup.evaluate(() => save()); await popup.getByText('Recent saved briefs').waitFor(); await popup.getByRole('button', { name: /Open saved brief/ }).click(); await popup.getByText('Source signals').first().waitFor();
    fs.mkdirSync(path.resolve('output/playwright'), { recursive: true });
    await popup.screenshot({ path: path.resolve('output/playwright/samsarix-page-lens-1.2.png'), fullPage: true });
    console.log(`Browser smoke passed for extension ${extensionId}.`);
  } finally {
    await Promise.race([context.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
  process.exit(0);
})().catch(error => { console.error(error); process.exit(1); });
