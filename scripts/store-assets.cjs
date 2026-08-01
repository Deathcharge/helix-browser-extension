// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const sourceDir = path.resolve('output/playwright');
const outputDir = path.resolve('store-assets');
const source = name => {
  const file = path.join(sourceDir, name);
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}; run npm run test:browser first.`);
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
};

const assets = [
  {
    file: '01-private-source-triage.png', eyebrow: 'PORTABLE LOCAL QUEUE',
    title: 'Keep your research queue portable—not trapped.',
    body: 'Back up and restore the bounded local queue as versioned JSON, or hand it off as readable Markdown. No account or cloud sync required.',
    badges: ['VERSIONED BACKUP', 'LOCAL IMPORT', 'MARKDOWN HANDOFF'], image: source('portable-queue-panel.png'), mode: 'queue'
  },
  {
    file: '02-local-comparison.png', eyebrow: 'SAVED-BASELINE COMPARISON',
    title: 'Compare two source briefs without sending either page away.',
    body: 'Inspect descriptive deltas and shared signals, then copy or export a privacy-safe Markdown comparison.',
    badges: ['LOCAL DELTAS', 'SHARED SIGNALS', 'MARKDOWN EXPORT'], image: source('comparison-panel.png'), mode: 'panel'
  },
  {
    file: '03-language-honest.png', eyebrow: 'LANGUAGE-HONEST ANALYSIS',
    title: 'Useful multilingual triage. No fabricated English score.',
    body: 'Unicode-aware words and terms remain available. Readability appears only when the page explicitly declares English.',
    badges: ['UNICODE TERMS', 'VISIBLE LIMITS', 'LOCAL ONLY'], image: source('page-lens-multilingual.png'), mode: 'device'
  }
];

function html(asset) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} html,body{margin:0;width:1280px;height:800px;overflow:hidden} body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#f7f5ff;background:#0b0e1c}
    .canvas{position:relative;display:grid;grid-template-columns:1.18fr .82fr;gap:62px;width:100%;height:100%;padding:72px 74px;background:radial-gradient(circle at 88% 4%,#34266d 0,#17152d 27%,#0b0e1c 62%)}
    .canvas:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(90deg,#000,transparent 78%)}
    .copy{position:relative;z-index:1;align-self:center}.brand{display:flex;align-items:center;gap:12px;margin-bottom:52px;font-size:20px;font-weight:780}.mark{display:grid;place-items:center;width:34px;height:34px;border:1px solid #7c69d7;border-radius:50%;color:#9d8cff}.eyebrow{margin-bottom:17px;color:#85dfba;font-size:14px;font-weight:800;letter-spacing:.16em}.title{max-width:680px;margin:0 0 24px;font-size:51px;line-height:1.04;letter-spacing:-.04em}.body{max-width:620px;margin:0;color:#c0c3d5;font-size:21px;line-height:1.5}.badges{display:flex;flex-wrap:wrap;gap:10px;margin-top:34px}.badge{padding:8px 12px;border:1px solid #40486a;border-radius:99px;background:#151a31;color:#dcd9ed;font-size:11px;font-weight:750;letter-spacing:.08em}
    .visual{position:relative;z-index:1;display:grid;place-items:center}.device{width:430px;height:670px;padding:9px;overflow:hidden;border:1px solid #4b5073;border-radius:24px;background:#090b14;box-shadow:0 35px 90px rgba(0,0,0,.48),0 0 70px rgba(105,81,211,.18)}.device img{display:block;width:410px;height:auto;border-radius:15px}.panel,.queue{width:510px;padding:22px;border:1px solid #4b5073;border-radius:24px;background:linear-gradient(145deg,#1d1b39,#0e1121);box-shadow:0 35px 90px rgba(0,0,0,.48)}.panel img,.queue img{display:block;width:100%;height:auto;border-radius:12px}.queue{max-height:610px;overflow:hidden}.local{position:absolute;right:0;bottom:-24px;color:#777e9e;font-size:11px;letter-spacing:.1em}
  </style></head><body><main class="canvas"><section class="copy"><div class="brand"><span class="mark">◎</span><span>Samsarix Page Lens</span></div><div class="eyebrow">${asset.eyebrow}</div><h1 class="title">${asset.title}</h1><p class="body">${asset.body}</p><div class="badges">${asset.badges.map(value => `<span class="badge">${value}</span>`).join('')}</div></section><section class="visual"><div class="${asset.mode}"><img src="${asset.image}" alt="Verified Samsarix Page Lens interface"></div><span class="local">VERIFIED 1.6 INTERFACE</span></section></main></body></html>`;
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chromium', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    for (const asset of assets) {
      await page.setContent(html(asset), { waitUntil: 'load' });
      await page.screenshot({ path: path.join(outputDir, asset.file), type: 'png' });
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(pathToFileURL(path.resolve('site/privacy/index.html')).href);
    if (await page.title() !== 'Samsarix Page Lens — Privacy') throw new Error('Privacy site title is incorrect');
    if (!/no account system, analytics, advertising/i.test(await page.locator('body').innerText())) throw new Error('Privacy site is missing the no-telemetry disclosure');
    fs.mkdirSync(path.resolve('output/playwright'), { recursive: true });
    await page.screenshot({ path: path.resolve('output/playwright/privacy-site.png'), fullPage: true });
  } finally { await browser.close(); }
  console.log(`Built ${assets.length} Chrome Web Store screenshots in store-assets/.`);
})().catch(error => { console.error(error); process.exit(1); });
