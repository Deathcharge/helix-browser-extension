# Chrome Web Store screenshots

These 1280×800 PNGs are reproducible marketing compositions built from the installed-extension states exercised by `scripts/browser-smoke.cjs`.

Regenerate them from a clean checkout with:

```bash
npm ci
npx playwright install chromium
npm run build:store-assets
```

The generator uses no remote fonts or imagery. The embedded product UI comes from the packaged 1.4 browser journey; surrounding copy is maintained in `scripts/store-assets.cjs`. Before submission, the store owner must review every image against the exact uploaded ZIP and current Chrome Web Store image/content policies.
