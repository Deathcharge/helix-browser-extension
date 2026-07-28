# Contributing to Helix Page Lens

Thanks for improving the extension. Changes should preserve its local-first, explicit-user-action model.

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/helix-browser-extension.git
cd helix-browser-extension
npm ci
npm run check
```

Load `helix_browser_extension/helix-browser-extension` from `chrome://extensions` for development, or run `npm run build` and smoke-test `dist/helix-page-lens` as the release artifact.

## Standards

- Do not add a permission without documenting its user benefit, privacy impact, and narrower alternatives.
- Keep analysis deterministic and explain score changes in both tests and user-facing methodology.
- Treat page content as untrusted; use text APIs instead of HTML injection and bound work by size.
- Add focused `node:test` coverage for behavior changes.
- Run `npm run lint`, `npm test`, and `npm run build` before opening a pull request.
- Update the README and `docs/PRODUCTIZATION.md` when behavior, limitations, or release gates change.

## Pull requests

Describe the user problem, implementation, verification performed, permission/privacy impact, and any work left for the owner. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
