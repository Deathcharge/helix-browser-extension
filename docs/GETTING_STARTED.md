# Getting Started with Helix Browser Extension

## Installation

### From Source
```bash
git clone https://github.com/Deathcharge/helix-browser-extension.git
cd helix-browser-extension
pip install -e .
```

### From PyPI
```bash
pip install helix-browser-extension
```

## Quick Start

### Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the extension directory

### Basic Usage

```javascript
// Send message from content script
chrome.runtime.sendMessage({
  type: "REQUEST",
  action: "analyze",
  data: { url: window.location.href }
}, response => {
  console.log("Response:", response);
});
```

## Features

- Analyze web pages
- Extract content
- Store data locally
- Communicate with backend

## Configuration

Create `.env` file:
```
API_URL=https://api.example.com
API_KEY=your-api-key
```

## Testing

```bash
pytest tests/ -v
pytest tests/ --cov
```

## Next Steps

- Read the [API Reference](API_REFERENCE.md)
- Check out [examples](../examples/)
- Review [architecture](ARCHITECTURE.md)
