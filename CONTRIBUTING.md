# Contributing to Samsarix Page Lens

Thanks for improving the extension. Changes should preserve its local-first, explicit-user-action model.

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/samsarix-page-lens.git
cd samsarix-page-lens
npm ci
npm run check
```

Load `extension` from `chrome://extensions` for development, or run `npm run build` and smoke-test `dist/samsarix-page-lens` as the release artifact.

## Standards

- Do not add a permission without documenting its user benefit, privacy impact, and narrower alternatives.
- Keep analysis deterministic and explain score changes in both tests and user-facing methodology.
- Treat page content as untrusted; use text APIs instead of HTML injection and bound work by size.
- Add focused `node:test` coverage for behavior changes.
- Run `npm run lint`, `npm test`, and `npm run build` before opening a pull request.
- Update the README and `docs/PRODUCTIZATION.md` when behavior, limitations, or release gates change.
- Keep `SPDX-License-Identifier: MPL-2.0` and Samsarix LLC copyright notices on source files.

## Pull requests

Describe the user problem, implementation, verification performed, permission/privacy impact, and any work left for the owner. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).

By contributing, you agree to license your contribution under MPL-2.0. Questions can be sent to [contact@samsarix.com](mailto:contact@samsarix.com).
