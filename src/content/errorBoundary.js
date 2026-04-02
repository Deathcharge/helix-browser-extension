/**
 * Helix Browser Extension - Error Boundary
 * Catches and handles errors gracefully in content scripts
 */

class ErrorBoundary {
  constructor() {
    this.errorCount = 0;
    this.maxErrors = 10;
    this.errorLog = [];
    this.initialized = false;
  }

  /**
   * Initialize error boundary
   */
  initialize() {
    if (this.initialized) return;

    // Catch unhandled errors
    window.addEventListener('error', this.handleError.bind(this));
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleRejection.bind(this));

    this.initialized = true;
    console.log('[ErrorBoundary] Initialized');
  }

  /**
   * Handle JavaScript errors
   */
  handleError(event) {
    const error = {
      type: 'error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack || event.error,
      timestamp: Date.now()
    };

    this.logError(error);
    this.showErrorUI(error);

    // Prevent default error handling
    event.preventDefault();
  }

  /**
   * Handle promise rejections
   */
  handleRejection(event) {
    const error = {
      type: 'rejection',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      timestamp: Date.now()
    };

    this.logError(error);
    this.showErrorUI(error);

    // Prevent default rejection handling
    event.preventDefault();
  }

  /**
   * Log error to internal log and report to background
   */
  logError(error) {
    this.errorCount++;
    this.errorLog.push(error);

    // Keep only last 50 errors
    if (this.errorLog.length > 50) {
      this.errorLog.shift();
    }

    // Report to background script
    this.reportToBackground(error);

    console.error('[ErrorBoundary] Error caught:', error);
  }

  /**
   * Report error to background script
   */
  async reportToBackground(error) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'ERROR_BOUNDARY_REPORT',
          error: {
            message: error.message,
            type: error.type,
            timestamp: error.timestamp,
            url: window.location.href
          }
        });
      }
    } catch (e) {
      // Silently fail if background script is not available
    }
  }

  /**
   * Show user-friendly error UI
   */
  showErrorUI(error) {
    // Don't show UI if too many errors
    if (this.errorCount > this.maxErrors) return;

    // Remove existing error UI
    const existing = document.getElementById('helix-error-boundary');
    if (existing) existing.remove();

    // Create error UI
    const errorUI = document.createElement('div');
    errorUI.id = 'helix-error-boundary';
    errorUI.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1a1a2e;
        border: 1px solid #e94560;
        border-radius: 8px;
        padding: 16px;
        max-width: 400px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      ">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="color: #e94560; font-size: 20px; margin-right: 8px;">⚠️</span>
          <strong style="color: #fff; font-size: 14px;">Helix Error</strong>
        </div>
        <p style="color: #ccc; font-size: 12px; margin: 0 0 12px 0; line-height: 1.4;">
          ${this.escapeHtml(error.message)}
        </p>
        <div style="display: flex; gap: 8px;">
          <button id="helix-error-dismiss" style="
            background: #16213e;
            color: #fff;
            border: 1px solid #e94560;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Dismiss</button>
          <button id="helix-error-report" style="
            background: #e94560;
            color: #fff;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Report Issue</button>
        </div>
      </div>
    `;

    document.body.appendChild(errorUI);

    // Add event listeners
    document.getElementById('helix-error-dismiss')?.addEventListener('click', () => {
      errorUI.remove();
    });

    document.getElementById('helix-error-report')?.addEventListener('click', () => {
      this.reportIssue(error);
      errorUI.remove();
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (errorUI.parentNode) {
        errorUI.remove();
      }
    }, 10000);
  }

  /**
   * Report issue to Helix
   */
  async reportIssue(error) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'REPORT_ISSUE',
          error: {
            message: error.message,
            type: error.type,
            timestamp: error.timestamp,
            url: window.location.href,
            userAgent: navigator.userAgent,
            errorLog: this.errorLog.slice(-5) // Last 5 errors
          }
        });
      }
    } catch (e) {
      console.error('[ErrorBoundary] Failed to report issue:', e);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get error statistics
   */
  getStats() {
    return {
      totalErrors: this.errorCount,
      recentErrors: this.errorLog.slice(-10),
      hasExceededLimit: this.errorCount > this.maxErrors
    };
  }

  /**
   * Reset error count
   */
  reset() {
    this.errorCount = 0;
    this.errorLog = [];
  }
}

// Export singleton
const errorBoundary = new ErrorBoundary();
export default errorBoundary;