// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
// The pinned Playwright build recognizes this test-only switch in CRBrowser.
// It exposes Chromium's extension-action target (type "other") as a Page.
process.env.PW_CHROMIUM_ATTACH_TO_OTHER = '1';
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const watchdog = setTimeout(() => { console.error('Native popup smoke exceeded 90 seconds.'); process.exit(1); }, 90000);
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'samsarix-native-popup-'));
  let context;
  try {
    const extensionPath = path.resolve('dist/samsarix-page-lens');
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true, viewport: null, acceptDownloads: true,
      args: ['--enable-unsafe-extension-debugging', `--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
    });
    context.setDefaultTimeout(10000);
    const manager = await context.newPage(); await manager.goto('chrome://extensions');
    const extensionId = await manager.locator('extensions-item').first().getAttribute('id');
    assert.ok(extensionId);
    await context.route('https://native.example.test/**', route => {
      const second = route.request().url().includes('/second');
      const title = second ? 'Second native source' : 'Native source triage';
      return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="en"><head><title>${title}</title><meta name="author" content="Fixture Author"></head><body><main><h1>${title}</h1><p>${'Clear sources help careful readers understand evidence before citing a claim. '.repeat(second ? 16 : 24)}</p><h2>Supporting material</h2><a href="https://primary.example/report?private=secret">Primary evidence</a></main></body></html>` });
    });
    const article = await context.newPage(); await article.goto('https://native.example.test/first?private=token');
    const browser = await context.browser().newBrowserCDPSession();
    const pageErrors = [];
    async function openPopup() {
      await article.bringToFront();
      const { targetInfos } = await browser.send('Target.getTargets', { filter: [{ type: 'tab' }] });
      const tab = targetInfos.find(target => target.url === article.url()); assert.ok(tab);
      const opening = context.waitForEvent('page'); opening.catch(() => {});
      await browser.send('Extensions.triggerAction', { id: extensionId, targetId: tab.targetId });
      const popup = await opening; popup.on('pageerror', error => pageErrors.push(error.message));
      await popup.waitForLoadState('domcontentloaded');
      assert.equal(popup.url(), `chrome-extension://${extensionId}/popup.html`);
      await popup.waitForFunction(() => !document.querySelector('#analyze-btn').disabled && document.querySelector('#page-url').textContent.startsWith('https://native.example.test/'));
      const view = await popup.evaluate(async () => ({ isPopup: chrome.extension.getViews({ type: 'popup' }).includes(window), tab: await chrome.tabs.getCurrent() }));
      assert.equal(view.isPopup, true, 'Chrome must classify this view as an action popup');
      assert.equal(view.tab, undefined, 'The action popup must not be a tab opened to popup.html');
      return popup;
    }
    async function assertNativeLayout(popup) {
      await popup.waitForFunction(() => innerWidth >= 410 && innerWidth <= 430);
      const dimensions = await popup.evaluate(() => ({ width: innerWidth, height: innerHeight, bodyWidth: document.body.getBoundingClientRect().width, horizontalOverflow: document.documentElement.scrollWidth > innerWidth }));
      assert.equal(dimensions.bodyWidth, 410); assert.equal(dimensions.horizontalOverflow, false);
      assert.ok(dimensions.height > 0 && dimensions.height <= 600, JSON.stringify(dimensions));
      console.log('Native popup layout:', JSON.stringify(dimensions));
    }
    let popup = await openPopup();
    await popup.getByRole('button', { name: 'Create page brief', exact: true }).click();
    await popup.locator('#results:not(.hidden)').waitFor();
    assert.equal(await popup.locator('#brief-title').textContent(), 'Native source triage');
    assert.equal(await popup.locator('#brief-url').textContent(), 'https://native.example.test/first');
    await assertNativeLayout(popup);
    await fs.mkdir(path.resolve('output/playwright'), { recursive: true });
    await popup.screenshot({ path: path.resolve('output/playwright/native-popup-analysis.png') });
    await popup.locator('#review-decision').selectOption('reference');
    await popup.locator('#review-note').fill('Check the primary evidence before citing.');
    await popup.getByRole('button', { name: 'Save locally', exact: true }).click();
    await popup.getByText('1 saved brief', { exact: true }).waitFor();
    await popup.close();
    popup = await openPopup();
    await popup.getByRole('button', { name: 'Open saved brief: Native source triage', exact: true }).click();
    assert.equal(await popup.locator('#review-note').inputValue(), 'Check the primary evidence before citing.');
    assert.equal(await popup.locator('#review-decision').inputValue(), 'reference');
    await assertNativeLayout(popup);
    console.log('Native popup: actual extraction, review save, close/reopen, and retention passed.');

    const backupEvent = popup.waitForEvent('download');
    await popup.getByRole('button', { name: 'Backup JSON', exact: true }).click();
    const backup = await backupEvent; const backupPath = await backup.path();
    const backupValue = JSON.parse(await fs.readFile(backupPath, 'utf8'));
    assert.equal(backupValue.briefs.length, 1);
    assert.equal(backupValue.briefs[0].review.note, 'Check the primary evidence before citing.');
    popup.once('dialog', dialog => dialog.dismiss());
    await popup.getByRole('button', { name: 'Remove saved brief: Native source triage', exact: true }).click();
    await popup.getByText('Removal canceled. The local queue was not changed.', { exact: true }).waitFor();
    popup.once('dialog', dialog => dialog.accept());
    await popup.getByRole('button', { name: 'Remove saved brief: Native source triage', exact: true }).click();
    await popup.getByText('No saved briefs', { exact: true }).waitFor();
    popup.once('dialog', dialog => dialog.accept());
    await popup.locator('#queue-import-file').setInputFiles(backupPath);
    await popup.getByRole('button', { name: 'Open saved brief: Native source triage', exact: true }).waitFor();
    console.log('Native popup: downloaded backup, removal cancellation/confirmation, and restoration passed.');
    await popup.close();
    await article.goto('https://native.example.test/second?private=another');
    popup = await openPopup();
    await popup.getByRole('button', { name: 'Create page brief', exact: true }).click();
    await popup.locator('#results:not(.hidden)').waitFor();
    await popup.getByRole('button', { name: 'Compare', exact: true }).click();
    await popup.locator('#comparison-output:not(.hidden)').waitFor();
    assert.match(await popup.locator('#comparison-title').textContent(), /Second native source compared with Native source triage/);
    const exportEvent = popup.waitForEvent('download');
    await popup.getByRole('button', { name: 'Comparison Markdown', exact: true }).click();
    const exported = await exportEvent;
    const markdown = await fs.readFile(await exported.path(), 'utf8');
    assert.match(markdown, /Second native source/); assert.match(markdown, /Native source triage/); assert.doesNotMatch(markdown, /private=|token|secret/);
    await assertNativeLayout(popup);
    assert.deepEqual(pageErrors, []);
    console.log(`Native popup smoke passed on Chromium ${context.browser().version()}: two-source comparison and sanitized export.`);
  } finally {
    try { if (context) await context.close(); await fs.rm(profile, { recursive: true, force: true }); }
    finally { clearTimeout(watchdog); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
