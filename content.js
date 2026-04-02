/*
 * Samsara Helix Browser Extension - Content Script
 * Injects AI assistance widget into pages for real-time help
 *//

// Only run on valid pages
if (window.location.protocol.startsWith('http')) {
  // Check widget setting before injecting
  async function initWidget() {
    try {
      const settings = await chrome.storage.sync.get({ showWidget: true });
      if (settings.showWidget === false) return;
      createWidget();
    } catch {
      // Fallback: create widget if storage fails
      createWidget();
    }
  }

  // Listen for setting changes to show/hide widget dynamically
  chrome.storage.onChanged.addListener(changes => {
    if (changes.showWidget) {
      const widget = document.getElementById('helix-widget');
      if (changes.showWidget.newValue === false && widget) {
        widget.remove();
      } else if (changes.showWidget.newValue !== false && !widget) {
        createWidget();
      }
    }
  });

  // Create floating widget (minimized by default)
  function createWidget() {
    // Check if widget already exists
    if (document.getElementById('helix-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'helix-widget';
    widget.className = 'helix-widget helix-minimized';
    widget.innerHTML = `
      <button class="helix-widget-toggle" title="Helix Coordination Analyzer">
        <span class="helix-icon">🌀</span>
      </button>
      <div class="helix-widget-content">
        <div class="helix-widget-header">
          <span>Helix Analysis</span>
          <button class="helix-widget-close">✕</button>
        </div>
        <div class="helix-widget-body">
          <div class="helix-widget-loading">
            Analyzing...
          </div>
          <div class="helix-widget-results hidden">
            <div class="helix-metric">
              <span class="helix-metric-label">Relevance</span>
              <span class="helix-metric-value" id="helix-relevance">--</span>
            </div>
            <div class="helix-metric">
              <span class="helix-metric-label">Harmony</span>
              <span class="helix-metric-value" id="helix-harmony">--</span>
            </div>
            <div class="helix-metric">
              <span class="helix-metric-label">Discovery</span>
              <span class="helix-metric-value" id="helix-discovery">--</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    // Event listeners
    widget
      .querySelector('.helix-widget-toggle')
      .addEventListener('click', toggleWidget);
    widget
      .querySelector('.helix-widget-close')
      .addEventListener('click', minimizeWidget);

    return widget;
  }

  function toggleWidget() {
    const widget = document.getElementById('helix-widget');
    if (widget.classList.contains('helix-minimized')) {
      expandWidget();
    } else {
      minimizeWidget();
    }
  }

  function expandWidget() {
    const widget = document.getElementById('helix-widget');
    widget.classList.remove('helix-minimized');

    // Request analysis
    analyzeCurrentPage();
  }

  function minimizeWidget() {
    const widget = document.getElementById('helix-widget');
    widget.classList.add('helix-minimized');
  }

  async function analyzeCurrentPage() {
    const widget = document.getElementById('helix-widget');
    const loadingEl = widget.querySelector('.helix-widget-loading');
    const resultsEl = widget.querySelector('.helix-widget-results');

    loadingEl.classList.remove('hidden');
    resultsEl.classList.add('hidden');

    try {
      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'getAnalysis',
        url: window.location.href,
      });

      if (response.success && response.result) {
        const metrics = response.result.coordination_metrics || {};

        document.getElementById('helix-relevance').textContent =
          Math.round((metrics.relevance || 0) * 100) + '%';
        document.getElementById('helix-harmony').textContent =
          Math.round((metrics.harmony || 0) * 100) + '%';
        document.getElementById('helix-discovery').textContent =
          Math.round((metrics.discovery_value || 0) * 100) + '%';

        loadingEl.classList.add('hidden');
        resultsEl.classList.remove('hidden');

        // Update badge
        chrome.runtime.sendMessage({
          action: 'updateBadge',
          score: metrics.relevance || 0,
        });
      } else {
        loadingEl.textContent = 'Analysis unavailable';
      }
    } catch (error) {
      loadingEl.textContent = 'Error: ' + error.message;
    }
  }

  // Initialize widget when DOM is ready (respects user preference)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
}
