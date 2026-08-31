# Chrome Web Store screenshots

The three 1280×800 PNGs are reproducible marketing compositions built from the installed-extension states exercised by `scripts/browser-smoke.cjs --store-assets`, including the 1.6 portable-queue recovery panel. `promo-small-440x280.png` is the required small promotional tile. The regular `npm run test:browser` journey verifies the same product behavior without spending CI time regenerating marketing evidence.

Regenerate them from a clean checkout with:

```bash
npm ci
npx playwright install chromium
npm run build:store-assets
```

The generator uses no remote fonts or imagery. The embedded product UI comes from the packaged 1.8.3 browser journey; surrounding copy is maintained in `scripts/store-assets.cjs`. Before submission, the store owner must review every image against the exact uploaded ZIP and current Chrome Web Store image/content policies.
