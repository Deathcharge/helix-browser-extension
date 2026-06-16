# 🌀 Helix Coordination Analyzer - Browser Extension

A Chrome extension for analyzing web pages with Helix Collective's coordination framework.

## Features

- **One-Click Analysis**: Analyze any webpage for coordination metrics
- **Relevance Scoring**: Measure how relevant a page is to your interests
- **Harmony Detection**: Detect content harmony and coherence
- **Discovery Value**: Identify novel and valuable content
- **Subscription Tiers**: Free, Hobby, Starter, Pro, Enterprise

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select this directory
5. Pin the extension to your toolbar

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Build Icons

Icons are required in `icons/` directory:

- `icon16.png` - 16x16
- `icon32.png` - 32x32
- `icon48.png` - 48x48
- `icon128.png` - 128x128

### Load Development Version

```bash
# Development build
npm install
# Load unpacked extension from helix-browser-extension/
```

## Usage

1. Click the 🌀 icon in your toolbar
2. The widget expands and analyzes the current page
3. View coordination metrics: Relevance, Harmony, Discovery
4. Results update in real-time

### Context Menu

Right-click options:

- "Analyze with Helix" - Analyze current page
- "Analyze Link with Helix" - Analyze a specific link

## API Connection

The extension connects to your Helix Collective backend:

- Production: `https://helix-unified-production.up.railway.app`
- Development: `http://localhost:8000`

Configure in extension popup settings.

## Subscription Tiers

| Tier       | Analyses/Day | Advanced Metrics | Export | API Access |
| ---------- | ------------ | ---------------- | ------ | ---------- |
| Free       | 5            | ❌               | ❌     | ❌         |
| Hobby      | 25           | ❌               | ✅     | ❌         |
| Starter    | 100          | ✅               | ✅     | ✅         |
| Pro        | Unlimited    | ✅               | ✅     | ✅         |
| Enterprise | Unlimited    | ✅               | ✅     | ✅ +Custom |

## Architecture

- **manifest.json** - Extension manifest (MV3)
- **background.js** - Service worker for auth, API calls
- **content.js** - Injected widget for page analysis
- **popup.html/js/css** - Extension popup UI

## Files

- `manifest.json` - Extension configuration
- `background.js` - Service worker (auth, API, subscriptions)
- `content.js` - Content script (page analysis widget)
- `popup.html`, `popup.js`, `popup.css` - Popup UI
- `content.css` - Widget styles
- `icons/` - Extension icons

## License

Proprietary - Helix Collective
