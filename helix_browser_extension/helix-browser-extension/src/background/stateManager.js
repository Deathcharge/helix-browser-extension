/**
 * Helix Browser Extension - State Manager
 * Centralized state management with persistence and notifications
 */

class StateManager {
  constructor() {
    this.state = {
      auth: {
        token: null,
        user: null,
        isAuthenticated: false,
      },
      settings: {
        apiEndpoint: 'http://localhost:8000',
        enableNotifications: true,
        enableAnalysis: true,
        theme: 'dark',
      },
      usage: {
        requestsToday: 0,
        requestsThisMonth: 0,
        lastRequest: null,
      },
      ui: {
        isLoading: false,
        error: null,
        lastActivity: null,
      },
    };

    this.listeners = new Map();
    this.initialized = false;
  }

  /**
   * Initialize state from chrome.storage
   * Auth tokens use chrome.storage.session (cleared on browser restart)
   * Settings/usage use chrome.storage.local (persists across sessions)
   */
  async initialize() {
    try {
      const [stored, sessionStored] = await Promise.all([
        chrome.storage.local.get(['helixState']),
        chrome.storage.session.get(['helixAuth']),
      ]);
      if (stored.helixState) {
        this.state = this.deepMerge(this.state, stored.helixState);
      }
      // Restore auth from session storage (overrides any stale local auth)
      if (sessionStored.helixAuth) {
        this.state.auth = this.deepMerge(
          this.state.auth,
          sessionStored.helixAuth
        );
      } else {
        // No session auth — clear any stale auth from local state
        this.state.auth = { token: null, user: null, isAuthenticated: false };
      }
      this.initialized = true;
      console.log('[StateManager] Initialized');
    } catch (error) {
      console.error('[StateManager] Initialization failed:', error);
    }
  }

  /**
   * Get state or nested property
   */
  get(path = null) {
    if (!path) return { ...this.state };

    return path.split('.').reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : undefined;
    }, this.state);
  }

  /**
   * Set state property
   */
  async set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();

    let target = this.state;
    for (const key of keys) {
      if (!target[key]) target[key] = {};
      target = target[key];
    }

    const oldValue = target[lastKey];
    target[lastKey] = value;

    // Persist to storage
    await this.persist();

    // Notify listeners
    this.notify(path, value, oldValue);

    return value;
  }

  /**
   * Update multiple state properties
   */
  async update(updates) {
    const oldValues = {};
    for (const [path, value] of Object.entries(updates)) {
      const keys = path.split('.');
      const lastKey = keys.pop();

      let target = this.state;
      for (const key of keys) {
        if (!target[key]) target[key] = {};
        target = target[key];
      }

      oldValues[path] = target[lastKey];
      target[lastKey] = value;
    }

    // Persist once for all updates (single storage write)
    await this.persist();

    // Notify listeners for each changed path
    for (const [path, value] of Object.entries(updates)) {
      this.notify(path, value, oldValues[path]);
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);

    // Return unsubscribe function
    return () => {
      const pathListeners = this.listeners.get(path);
      if (pathListeners) {
        pathListeners.delete(callback);
      }
    };
  }

  /**
   * Notify listeners of state change
   */
  notify(path, newValue, oldValue) {
    // Notify exact path listeners
    const pathListeners = this.listeners.get(path);
    if (pathListeners) {
      pathListeners.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error('[StateManager] Listener error:', error);
        }
      });
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error('[StateManager] Wildcard listener error:', error);
        }
      });
    }
  }

  /**
   * Persist state to chrome.storage
   * Auth tokens go to session storage (cleared on browser restart)
   * Everything else goes to local storage (persists)
   */
  async persist() {
    try {
      // Store auth in session storage (non-persistent, more secure)
      const authData = { ...this.state.auth };
      // Store non-auth state in local storage (persistent)
      const localState = {
        ...this.state,
        auth: { token: null, user: null, isAuthenticated: false },
      };
      await Promise.all([
        chrome.storage.local.set({ helixState: localState }),
        chrome.storage.session.set({ helixAuth: authData }),
      ]);
    } catch (error) {
      console.error('[StateManager] Persist failed:', error);
    }
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Reset state to defaults
   */
  async reset() {
    this.state = {
      auth: { token: null, user: null, isAuthenticated: false },
      settings: {
        apiEndpoint: 'http://localhost:8000',
        enableNotifications: true,
        enableAnalysis: true,
        theme: 'dark',
      },
      usage: { requestsToday: 0, requestsThisMonth: 0, lastRequest: null },
      ui: { isLoading: false, error: null, lastActivity: null },
    };
    await this.persist();
    this.notify('*', this.state, null);
  }
}

// Export singleton
const stateManager = new StateManager();
export default stateManager;
