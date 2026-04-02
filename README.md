# Samsara Helix Browser Extension

**AI-powered browser extension for intelligent web assistance and autonomous task execution**

Samsara Helix Browser Extension brings the power of the Samsara Helix ecosystem directly to your browser. Get AI assistance while browsing, automate repetitive tasks, and coordinate with the broader Helix ecosystem—all from your browser.

## 🌐 Features

### AI-Powered Assistance
- **Context-Aware Responses** - AI understands the current page
- **Smart Suggestions** - Get recommendations based on page content
- **Multi-Model Support** - Use different AI models for different tasks
- **Streaming Responses** - Real-time AI output

### Browser Automation
- **Content Script Integration** - Interact with page elements
- **DOM Manipulation** - Modify page content programmatically
- **Event Handling** - Respond to user interactions
- **Background Processing** - Run tasks without blocking

### Popup Interface
- **Quick Access** - One-click access to AI features
- **Conversation History** - Maintain context across sessions
- **Settings Management** - Configure extension behavior
- **Status Monitoring** - Real-time status updates

### Integration
- **Samsara Helix Ecosystem** - Connect to Spirals, Narrative Engine, agents
- **Custom APIs** - Integrate with your own services
- **Webhook Support** - Send data to external systems
- **OAuth Integration** - Secure authentication

## 📦 Installation

### From Source (Development)

1. Clone the repository:
```bash
git clone https://github.com/Deathcharge/helix-browser-extension.git
cd helix-browser-extension
```

2. Load in Chrome/Chromium:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `helix-browser-extension` directory

### From Chrome Web Store (Coming Soon)

Once published, install directly from the Chrome Web Store.

## 🚀 Quick Start

### Basic Usage

1. Click the Samsara Helix extension icon in your browser toolbar
2. Type your question or request
3. Get AI-powered responses based on the current page context
4. Use suggestions or modify the response

### Configuration

1. Click the extension icon
2. Go to Settings
3. Configure:
   - AI Model preference
   - API keys
   - Integration settings
   - Privacy options

## 🏗️ Architecture

```
helix-browser-extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker (background tasks)
├── content.js            # Content script (page interaction)
├── content.css           # Content styling
├── popup.html            # Popup UI
├── popup.js              # Popup logic
├── popup.css             # Popup styling
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── src/                  # Additional source files
│   ├── background/       # Background service worker modules
│   │   ├── offlineQueue.js
│   │   └── stateManager.js
│   └── content/          # Content script modules
│       └── errorBoundary.js
├── README.md
├── LICENSE
└── LICENSING.md
```

## 🔧 Core Components

### Manifest (manifest.json)
- Extension metadata and permissions
- Manifest V3 compatible
- Minimal permissions for security

### Background Service Worker (background.js)
- Handles long-running tasks
- Manages API communication
- Stores extension state
- Processes messages from content scripts

### Content Script (content.js)
- Injects into web pages
- Captures page context
- Handles user interactions
- Communicates with background worker

### Popup Interface (popup.html/js/css)
- User-facing UI
- Chat interface
- Settings panel
- Status display

### Supporting Modules
- **offlineQueue.js** - Queue requests when offline
- **stateManager.js** - Manage extension state
- **errorBoundary.js** - Error handling for content scripts

## 🔗 Integration with Samsara Helix Ecosystem

### With Spirals (Workflow Automation)
```javascript
// Execute workflows from browser
chrome.runtime.sendMessage({
  type: 'execute_spiral',
  spiral: 'process_page_data',
  data: pageData
}, response => {
  console.log('Workflow result:', response);
});
```

### With Narrative Engine
```javascript
// Generate content based on page context
chrome.runtime.sendMessage({
  type: 'generate_narrative',
  prompt: 'Summarize this page',
  context: pageContext
}, response => {
  displayResult(response);
});
```

### With Orchestration Hub
```javascript
// Coordinate agents for complex tasks
chrome.runtime.sendMessage({
  type: 'coordinate_agents',
  task: 'analyze_page_and_generate_summary',
  context: pageContext
}, response => {
  displayResult(response);
});
```

## 🛡️ Security & Privacy

- **Minimal Permissions** - Only requests necessary permissions
- **Local Storage** - Most data stored locally, not sent to servers
- **Encrypted Communication** - TLS for all API calls
- **No Tracking** - No user tracking or analytics
- **Open Source** - Code is transparent and auditable
- **User Control** - Users control what data is shared

## 📊 Statistics

- **Total Files**: 20+
- **Size**: 136KB
- **Languages**: JavaScript, HTML, CSS
- **Manifest Version**: 3
- **Browser Support**: Chrome, Chromium, Edge, Brave

## 🎯 Use Cases

### Content Creation
- Generate summaries of articles
- Extract key information
- Suggest improvements
- Translate content

### Research & Analysis
- Analyze web pages
- Extract structured data
- Compare information
- Generate insights

### Productivity
- Automate repetitive tasks
- Fill forms automatically
- Organize information
- Generate reports

### Development
- Debug JavaScript
- Inspect API responses
- Test web applications
- Monitor performance

## 🔄 Message Protocol

### From Content Script to Background
```javascript
chrome.runtime.sendMessage({
  type: 'action_type',
  data: { /* action data */ }
}, response => {
  // Handle response
});
```

### From Background to Content Script
```javascript
chrome.tabs.sendMessage(tabId, {
  type: 'action_type',
  data: { /* action data */ }
}, response => {
  // Handle response
});
```

## 🧪 Testing

### Manual Testing
1. Load extension in Chrome
2. Visit various websites
3. Test popup functionality
4. Verify content script injection
5. Check background worker operations

### Automated Testing
```bash
# Coming soon: Test suite
npm test
```

## 📚 Documentation

- [Installation Guide](./docs/installation.md)
- [Configuration Guide](./docs/configuration.md)
- [API Reference](./docs/api.md)
- [Integration Guide](./docs/integration.md)
- [Security Guide](./docs/security.md)

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

Dual licensed under:
- **Apache License 2.0** - For open-source use (free)
- **Proprietary Commercial License** - For businesses ($99-999/year)

See [LICENSING.md](./LICENSING.md) for details.

## 🙋 Support

- **Issues**: Report bugs on GitHub
- **Discussions**: Community discussions on GitHub
- **Commercial**: licensing@samsarahelix.com

## 🎓 Learn More

- [Helix Orchestration](https://github.com/Deathcharge/helix-orchestration)
- [Helix Ethics](https://github.com/Deathcharge/helix-ethics)
- [Helix Spirals](https://github.com/Deathcharge/helix-spirals)
- [Helix Narrative Engine](https://github.com/Deathcharge/helix-narrative-engine)
- [Helix Creative Spirals](https://github.com/Deathcharge/helix-creative-spirals)
- [Helix VSCode Extension](https://github.com/Deathcharge/helix-vscode-extension)

## 🌟 Ecosystem Overview

Samsara Helix Browser Extension is part of the comprehensive Samsara Helix ecosystem:

| Component | Purpose | Status |
|-----------|---------|--------|
| **Helix Orchestration** | Multi-agent coordination | ✅ Published |
| **Helix Ethics** | Ethical AI governance | ✅ Published |
| **Helix Spirals** | Workflow automation | ✅ Published |
| **Helix Narrative Engine** | Creative content generation | ✅ Published |
| **Helix Creative Spirals** | Social media automation | ✅ Published |
| **Helix VSCode Extension** | Developer tools | ✅ Published |
| **Helix Browser Extension** | Browser assistance | ✅ Ready |

---

**Built with ❤️ as part of the Samsara Helix Collective**

*Tat Tvam Asi 🕉️ - Thou Art That*
