/**
 * Helix Browser Extension - Background Service Worker
 * Handles extension lifecycle, authentication, and subscription status
 */

// Default API base — configurable via extension settings popup.
// Users set their production URL (e.g., helixspiral.work) in settings.
// Production should work out of the box; localhost remains allowed for development.
const DEFAULT_API_BASE = 'https://api.helixspiral.work';

// Allowed API endpoint patterns — whitelist to prevent SSRF-like attacks
// through user-configurable apiEndpoint field. Patterns support:
// - Exact origins (e.g., https://api.helixspiral.work)
// - localhost with any port for development
const ALLOWED_API_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/([a-z0-9-]+\.)*helixspiral\.work$/,
  /^https:\/\/([a-z0-9-]+\.)*helix-ai\.dev$/,
];

/**
 * Validates that the sender is a trusted source (this extension's context).
 * Returns true if the sender is:
 * - The extension popup
 * - A content script from this extension
 * - An internal extension page
 */
function isValidSender(sender) {
  // Sender must exist
  if (!sender) {
    console.warn('🌀 Message rejected: no sender');
    return false;
  }

  // Must be from this extension (same extension ID)
  if (sender.id !== chrome.runtime.id) {
    console.warn('🌀 Message rejected: wrong extension ID', sender.id);
    return false;
  }

  // If from a tab, verify it's either:
  // - A content script injected by this extension (sender.tab exists)
  // - The extension popup (sender.url starts with chrome-extension://<our-id>)
  if (sender.url) {
    const expectedPrefix = `chrome-extension://${chrome.runtime.id}`;
    const isExtensionPage = sender.url.startsWith(expectedPrefix);
    const isContentScript = sender.tab !== undefined;

    if (!isExtensionPage && !isContentScript) {
      console.warn('🌀 Message rejected: untrusted URL', sender.url);
      return false;
    }
  }

  return true;
}

/**
 * Validates that the API endpoint is on the whitelist.
 * Prevents SSRF-like attacks via user-configurable endpoints.
 */
function isAllowedEndpoint(endpoint) {
  if (!endpoint || typeof endpoint !== 'string') {
    return false;
  }

  try {
    const url = new URL(endpoint);
    const origin = url.origin;

    return ALLOWED_API_PATTERNS.some(pattern => pattern.test(origin));
  } catch {
    return false;
  }
}

function getWebOrigin(apiEndpoint) {
  try {
    const url = new URL(apiEndpoint);

    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return `${url.protocol}//${url.hostname}:3000`;
    }

    if (url.hostname.startsWith('api.')) {
      return `${url.protocol}//${url.hostname.slice(4)}`;
    }

    return url.origin;
  } catch {
    return 'https://helixspiral.work';
  }
}

const DEFAULT_SETTINGS = {
  apiEndpoint: DEFAULT_API_BASE,
  coordinationLevel: 5.0,
  autoAnalyze: true,
  subscription: null,
  userState: null,
  lastSync: null,
  lastUserSync: null,
  lastSyncToken: null,
};

// Auth tokens stored in chrome.storage.local so they persist across browser restarts.
// local storage is not synced to other devices, keeping tokens device-scoped.
const SESSION_KEYS = {
  authToken: null,
  refreshToken: null,
  userId: null,
};

// Read settings (sync) merged with auth tokens (local)
async function getSettingsWithTokens() {
  const [settings, tokens] = await Promise.all([
    chrome.storage.sync.get(DEFAULT_SETTINGS),
    chrome.storage.local.get(SESSION_KEYS),
  ]);
  return { ...settings, ...tokens };
}

// Subscription tier features (fallback only; server-synced capabilities are canonical)
const TIER_FEATURES = {
  free: {
    maxAnalysesPerDay: 5,
    advancedMetrics: false,
    exportEnabled: false,
    apiAccess: false,
    maxHistoryDays: 7,
  },
  hobby: {
    maxAnalysesPerDay: 25,
    advancedMetrics: false,
    exportEnabled: true,
    apiAccess: false,
    maxHistoryDays: 30,
  },
  starter: {
    maxAnalysesPerDay: 100,
    advancedMetrics: true,
    exportEnabled: true,
    apiAccess: true,
    maxHistoryDays: 90,
  },
  pro: {
    maxAnalysesPerDay: -1, // unlimited
    advancedMetrics: true,
    exportEnabled: true,
    apiAccess: true,
    maxHistoryDays: -1, // unlimited
  },
  enterprise: {
    maxAnalysesPerDay: -1,
    advancedMetrics: true,
    exportEnabled: true,
    apiAccess: true,
    maxHistoryDays: -1,
    customFeatures: true,
  },
};

function getFallbackFeaturesForTier(tier = 'free') {
  return { ...(TIER_FEATURES[tier] || TIER_FEATURES.free) };
}

function normalizeSyncedBrowserFeatures(capabilities, tier = 'free') {
  const fallback = getFallbackFeaturesForTier(tier);
  const synced = capabilities?.browser_extension;

  if (!synced || typeof synced !== 'object') {
    return fallback;
  }

  return {
    maxAnalysesPerDay:
      typeof synced.max_analyses_per_day === 'number'
        ? synced.max_analyses_per_day
        : fallback.maxAnalysesPerDay,
    advancedMetrics:
      typeof synced.advanced_metrics === 'boolean'
        ? synced.advanced_metrics
        : fallback.advancedMetrics,
    exportEnabled:
      typeof synced.export_enabled === 'boolean'
        ? synced.export_enabled
        : fallback.exportEnabled,
    apiAccess:
      typeof synced.api_access === 'boolean'
        ? synced.api_access
        : fallback.apiAccess,
    maxHistoryDays:
      typeof synced.max_history_days === 'number'
        ? synced.max_history_days
        : fallback.maxHistoryDays,
  };
}

function mergeSubscriptionWithSyncedUserState(subscription, userState) {
  if (!userState?.capabilities) {
    return subscription;
  }

  const tier = userState.tier || subscription?.tier || 'free';

  return {
    ...(subscription || {}),
    tier,
    status: subscription?.status || 'active',
    features: normalizeSyncedBrowserFeatures(userState.capabilities, tier),
  };
}

// Extension installed/updated
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('🌀 Helix extension installed');

    // Set default settings (sync) and auth defaults (session)
    chrome.storage.sync.set(DEFAULT_SETTINGS);
    chrome.storage.local.set(SESSION_KEYS);

    // Open welcome page (derive from configured API endpoint)
    chrome.storage.sync.get({ apiEndpoint: DEFAULT_API_BASE }, cfg => {
      const origin = getWebOrigin(cfg.apiEndpoint);
      chrome.tabs.create({
        url: `${origin}/help?ref=extension`,
      });
    });
  } else if (details.reason === 'update') {
    console.log(
      '🌀 Helix extension updated to version',
      chrome.runtime.getManifest().version
    );
    // Migrate settings if needed
    migrateSettings();
  }
});

// Migrate settings on update
async function migrateSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  // Ensure new fields exist
  const updates = {};
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (settings[key] === undefined) {
      updates[key] = value;
    }
  }
  if (Object.keys(updates).length > 0) {
    await chrome.storage.sync.set(updates);
    console.log('🌀 Migrated settings:', Object.keys(updates));
  }

  // Migrate tokens from sync → local storage (security upgrade)
  const oldTokens = await chrome.storage.sync.get({
    authToken: null,
    refreshToken: null,
    userId: null,
  });
  if (oldTokens.authToken || oldTokens.refreshToken || oldTokens.userId) {
    await chrome.storage.local.set({
      authToken: oldTokens.authToken,
      refreshToken: oldTokens.refreshToken,
      userId: oldTokens.userId,
    });
    await chrome.storage.sync.remove(['authToken', 'refreshToken', 'userId']);
    console.log('🌀 Migrated auth tokens from sync to local storage');
  }
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender is from this extension
  if (!isValidSender(sender)) {
    sendResponse({ success: false, error: 'Unauthorized sender' });
    return false;
  }

  // Handle analysis request
  if (message.action === 'getAnalysis') {
    handleAnalysisRequest(message.url)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  // Handle authentication
  if (message.action === 'authenticate') {
    authenticateUser(message.email, message.password)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Handle logout
  if (message.action === 'logout') {
    logoutUser()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Get subscription status
  if (message.action === 'getSubscription') {
    getSubscriptionStatus()
      .then(subscription => sendResponse({ success: true, subscription }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Check feature availability
  if (message.action === 'checkFeature') {
    checkFeatureAccess(message.feature)
      .then(access => sendResponse({ success: true, access }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Get usage stats
  if (message.action === 'getUsage') {
    getUsageStats()
      .then(stats => sendResponse({ success: true, stats }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Update badge with coordination score
  if (message.action === 'updateBadge') {
    const score = Math.round((message.score || 0) * 100);
    chrome.action.setBadgeText({ text: score > 0 ? score.toString() : '' });
    chrome.action.setBadgeBackgroundColor({
      color: score >= 70 ? '#10B981' : score >= 40 ? '#8B5CF6' : '#F59E0B',
    });
    sendResponse({ success: true });
  }

  // Sync subscription status
  if (message.action === 'syncSubscription') {
    syncSubscriptionStatus()
      .then(subscription => sendResponse({ success: true, subscription }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Full user state sync (profile, tier, capabilities, settings, integrations)
  if (message.action === 'syncUserState') {
    const since = message.since || null;
    syncUserState(since)
      .then(userState => sendResponse({ success: true, userState }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Authenticate user
function extractAuthTokens(data) {
  const nested = data && typeof data.data === 'object' ? data.data : null;
  const user = data?.user || nested?.user || null;

  const authToken =
    data?.access_token ||
    data?.token ||
    nested?.access_token ||
    nested?.token ||
    null;
  const refreshToken =
    data?.refresh_token ||
    data?.refreshToken ||
    data?.refresh ||
    nested?.refresh_token ||
    nested?.refreshToken ||
    nested?.refresh ||
    null;
  const userId =
    user?.id ||
    user?.user_id ||
    user?.sub ||
    data?.user_id ||
    data?.sub ||
    nested?.user_id ||
    nested?.sub ||
    null;

  return { authToken, refreshToken, userId };
}

async function persistAuthTokens(tokens, fallback = {}) {
  await chrome.storage.local.set({
    authToken: tokens.authToken,
    refreshToken: tokens.refreshToken || fallback.refreshToken || null,
    userId: tokens.userId || fallback.userId || null,
  });
}

async function authenticateUser(email, password) {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  // Validate endpoint is allowed
  if (!isAllowedEndpoint(settings.apiEndpoint)) {
    throw new Error(
      'Invalid API endpoint. Please use a valid Helix server URL (localhost, *.helixspiral.work, or *.helix-ai.dev).'
    );
  }

  const response = await fetch(`${settings.apiEndpoint}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Authentication failed');
  }

  const data = await response.json();
  const tokens = extractAuthTokens(data);

  if (!tokens.authToken) {
    throw new Error('Authentication response did not include an access token');
  }

  // Store auth tokens in session storage (not synced, cleared on browser close)
  await persistAuthTokens(tokens);

  // Sync subscription snapshot, then hydrate canonical capabilities from /api/user/sync
  await syncSubscriptionStatus();
  await syncUserState();

  return data;
}

// Logout user
async function logoutUser() {
  await chrome.storage.local.set({
    authToken: null,
    refreshToken: null,
    userId: null,
  });
  await chrome.storage.sync.set({
    subscription: null,
    userState: null,
    lastUserSync: null,
    lastSyncToken: null,
  });

  // Clear badge
  chrome.action.setBadgeText({ text: '' });

  console.log('🌀 User logged out');
}

// Get subscription status from storage
async function getSubscriptionStatus() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  // If no subscription data or stale (> 1 hour), sync from server
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  if (
    !settings.subscription ||
    !settings.lastSync ||
    settings.lastSync < oneHourAgo
  ) {
    return await syncSubscriptionStatus();
  }

  return (
    mergeSubscriptionWithSyncedUserState(
      settings.subscription,
      settings.userState
    ) || settings.subscription
  );
}

// Sync subscription status from server
async function syncSubscriptionStatus(retried = false) {
  const settings = await getSettingsWithTokens();

  // Validate endpoint is allowed
  if (!isAllowedEndpoint(settings.apiEndpoint)) {
    console.warn('🌀 Subscription sync skipped: invalid API endpoint');
    return {
      tier: 'free',
      status: settings.authToken ? 'active' : 'signed_out',
      authenticated: Boolean(settings.authToken),
      features: getFallbackFeaturesForTier('free'),
    };
  }

  if (!settings.authToken) {
    // Signed-out users should not appear authenticated in the popup.
    const freeSubscription = {
      tier: 'free',
      status: 'signed_out',
      authenticated: false,
      features: getFallbackFeaturesForTier('free'),
    };
    await chrome.storage.sync.set({
      subscription: freeSubscription,
      lastSync: Date.now(),
    });
    return freeSubscription;
  }

  try {
    const response = await fetch(
      `${settings.apiEndpoint}/api/billing/subscription`,
      {
        headers: {
          Authorization: `Bearer ${settings.authToken}`,
        },
      }
    );

    if (response.status === 401) {
      if (retried) {
        throw new Error('Session expired. Please log in again.');
      }
      // Token expired, try to refresh
      const refreshed = await refreshAuthToken();
      if (!refreshed) {
        throw new Error('Session expired. Please log in again.');
      }
      // Retry with new token (only once)
      return await syncSubscriptionStatus(true);
    }

    if (!response.ok) {
      throw new Error('Failed to fetch subscription');
    }

    const payload = await response.json();
    const subscription =
      payload && typeof payload.subscription === 'object'
        ? payload.subscription
        : payload && typeof payload === 'object'
          ? payload
          : null;

    // Use server-synced capabilities when available, otherwise fall back to local defaults.
    const tier = subscription?.tier || 'free';
    const enrichedSubscription = mergeSubscriptionWithSyncedUserState(
      {
        ...(subscription || {}),
        authenticated: true,
        status: subscription?.status || 'active',
        features: getFallbackFeaturesForTier(tier),
      },
      settings.userState
    ) || {
      ...(subscription || {}),
      authenticated: true,
      status: subscription?.status || 'active',
      features: getFallbackFeaturesForTier(tier),
    };

    await chrome.storage.sync.set({
      subscription: enrichedSubscription,
      lastSync: Date.now(),
    });

    console.log('🌀 Subscription synced:', tier);
    return enrichedSubscription;
  } catch (error) {
    console.error('🌀 Failed to sync subscription:', error);
    // Return cached subscription or free tier
    return (
      mergeSubscriptionWithSyncedUserState(
        settings.subscription,
        settings.userState
      ) || {
        tier: 'free',
        status: settings.authToken ? 'active' : 'signed_out',
        authenticated: Boolean(settings.authToken),
        features: getFallbackFeaturesForTier('free'),
      }
    );
  }
}

/**
 * Full user state sync — fetches profile, tier, settings, capabilities, and integrations
 * in a single request. More efficient than multiple API calls.
 * @param {string} [since] - Optional ISO timestamp for incremental sync
 * @param {boolean} [retried] - Internal flag to prevent infinite retry loops
 * @returns {Promise<Object>} Full user sync state
 */
async function syncUserState(since = null, retried = false) {
  const settings = await getSettingsWithTokens();

  // Validate endpoint is allowed
  if (!isAllowedEndpoint(settings.apiEndpoint)) {
    console.warn('🌀 User sync skipped: invalid API endpoint');
    return null;
  }

  if (!settings.authToken) {
    // Unauthenticated — return null
    return null;
  }

  try {
    const url = new URL(`${settings.apiEndpoint}/api/user/sync`);
    if (since) {
      url.searchParams.set('since', since);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${settings.authToken}`,
      },
    });

    if (response.status === 401) {
      if (retried) {
        console.warn('🌀 User sync failed: session expired');
        return null;
      }
      // Token expired, try to refresh
      const refreshed = await refreshAuthToken();
      if (!refreshed) {
        return null;
      }
      // Retry with new token (only once)
      return await syncUserState(since, true);
    }

    if (!response.ok) {
      throw new Error(`User sync failed: ${response.status}`);
    }

    const userState = await response.json();
    const hasFullPayload =
      userState.profile && Object.keys(userState.profile).length > 0;
    const storedUserState = hasFullPayload
      ? {
          user_id: userState.user_id,
          profile: userState.profile,
          tier: userState.tier,
          capabilities: userState.capabilities,
          settings: userState.settings,
          notifications: userState.notifications,
          integrations: userState.integrations,
          github_installations: userState.github_installations || [],
        }
      : settings.userState;

    // Store the full user state in extension storage without letting incremental sync erase it.
    await chrome.storage.sync.set({
      userState: storedUserState,
      lastUserSync: Date.now(),
      lastSyncToken: userState.sync_token,
    });

    if (userState.user_id) {
      await chrome.storage.local.set({ userId: userState.user_id });
    }

    // Also update subscription for popup UI and legacy callers.
    const subscription = mergeSubscriptionWithSyncedUserState(
      {
        ...(settings.subscription || {}),
        tier: userState.tier,
        status: settings.subscription?.status || 'active',
        features: getFallbackFeaturesForTier(userState.tier),
      },
      storedUserState || {
        tier: userState.tier,
        capabilities: userState.capabilities,
      }
    ) || {
      tier: userState.tier,
      status: 'active',
      features: getFallbackFeaturesForTier(userState.tier),
    };
    await chrome.storage.sync.set({
      subscription,
      lastSync: Date.now(),
    });

    console.log('🌀 User state synced:', userState.tier);
    return storedUserState || userState;
  } catch (error) {
    console.error('🌀 Failed to sync user state:', error);
    return null;
  }
}

// Refresh auth token
async function refreshAuthToken() {
  const settings = await getSettingsWithTokens();

  if (!settings.refreshToken) {
    return false;
  }

  // Validate endpoint is allowed
  if (!isAllowedEndpoint(settings.apiEndpoint)) {
    console.warn('🌀 Token refresh skipped: invalid API endpoint');
    return false;
  }

  try {
    const response = await fetch(`${settings.apiEndpoint}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: settings.refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const tokens = extractAuthTokens(data);

    if (!tokens.authToken) {
      return false;
    }

    await persistAuthTokens(tokens, {
      refreshToken: settings.refreshToken,
      userId: settings.userId,
    });

    return true;
  } catch (error) {
    console.error('🌀 Token refresh failed:', error);
    return false;
  }
}

// Check feature access based on subscription tier
async function checkFeatureAccess(feature) {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const subscription = await getSubscriptionStatus();
  const mergedSubscription =
    mergeSubscriptionWithSyncedUserState(subscription, settings.userState) ||
    subscription;
  const features =
    mergedSubscription?.features ||
    getFallbackFeaturesForTier(mergedSubscription?.tier || 'free');
  const value = features?.[feature];

  if (typeof value === 'number') {
    return value !== 0;
  }

  return Boolean(value);
}

// Get usage stats
async function getUsageStats() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const subscription = await getSubscriptionStatus();
  const mergedSubscription = mergeSubscriptionWithSyncedUserState(
    subscription,
    settings.userState
  ) ||
    subscription || {
      tier: 'free',
      status: 'active',
      features: getFallbackFeaturesForTier('free'),
    };

  // Get today's analysis count from local storage
  const today = new Date().toISOString().split('T')[0];
  const usage = await chrome.storage.local.get({ [`analyses_${today}`]: 0 });
  const analysesToday = usage[`analyses_${today}`] || 0;

  const maxAnalyses = mergedSubscription.features?.maxAnalysesPerDay || 5;

  return {
    analysesToday,
    maxAnalyses,
    unlimited: maxAnalyses === -1,
    remaining:
      maxAnalyses === -1 ? -1 : Math.max(0, maxAnalyses - analysesToday),
    tier: mergedSubscription.tier,
    status: mergedSubscription.status,
  };
}

// Increment usage counter
async function incrementUsage() {
  const today = new Date().toISOString().split('T')[0];
  const usage = await chrome.storage.local.get({ [`analyses_${today}`]: 0 });
  const newCount = (usage[`analyses_${today}`] || 0) + 1;

  await chrome.storage.local.set({ [`analyses_${today}`]: newCount });
  return newCount;
}

// Handle analysis request with auth and usage tracking
async function handleAnalysisRequest(url) {
  const settings = await getSettingsWithTokens();

  // Validate endpoint is allowed
  if (!isAllowedEndpoint(settings.apiEndpoint)) {
    throw new Error(
      'Invalid API endpoint. Please use a valid Helix server URL.'
    );
  }

  // Check usage limits
  const usage = await getUsageStats();
  if (!usage.unlimited && usage.remaining <= 0) {
    throw new Error(
      `Daily analysis limit reached (${usage.maxAnalyses}/day). Upgrade to ${
        usage.tier === 'free' ? 'Hobby' : 'Starter'
      } for more analyses.`
    );
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  if (settings.authToken) {
    headers['Authorization'] = `Bearer ${settings.authToken}`;
  }

  const response = await fetch(
    `${settings.apiEndpoint}/api/discovery/analyze`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url: url,
        performance_score: settings.coordinationLevel,
        analysis_depth: 'standard',
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error('Analysis failed');
  }

  // Increment usage counter
  await incrementUsage();

  return await response.json();
}

// Context menu for quick analysis
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'helix-analyze-page',
    title: '🌀 Analyze with Helix',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'helix-analyze-link',
    title: '🌀 Analyze Link with Helix',
    contexts: ['link'],
  });

  // Add upgrade menu item for free users
  chrome.contextMenus.create({
    id: 'helix-upgrade',
    title: '⭐ Upgrade Helix',
    contexts: ['action'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'helix-analyze-page') {
    // Open popup for current page
    chrome.action.openPopup();
  } else if (info.menuItemId === 'helix-analyze-link') {
    // Analyze the linked URL
    const url = info.linkUrl;

    // Check if user can perform analysis
    const usage = await getUsageStats();
    if (!usage.unlimited && usage.remaining <= 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Daily Limit Reached',
        message: `You've used all ${usage.maxAnalyses} analyses today. Upgrade for more!`,
      });
      return;
    }

    handleAnalysisRequest(url)
      .then(result => {
        // Show notification with results
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Helix Analysis Complete',
          message: `Relevance: ${Math.round(
            (result.coordination_metrics?.relevance || 0) * 100
          )}% | Harmony: ${Math.round(
            (result.coordination_metrics?.harmony || 0) * 100
          )}%`,
        });
      })
      .catch(error => {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Analysis Failed',
          message: error.message,
        });
      });
  } else if (info.menuItemId === 'helix-upgrade') {
    // Open upgrade page (derive from configured API endpoint)
    chrome.storage.sync.get({ apiEndpoint: 'http://localhost:8000' }, cfg => {
      const origin = getWebOrigin(cfg.apiEndpoint);
      chrome.tabs.create({
        url: `${origin}/marketplace/pricing`,
      });
    });
  }
});

// Periodic subscription sync (every 30 minutes)
chrome.alarms.create('subscriptionSync', { periodInMinutes: 30 });

// Validate stored token on service worker startup
chrome.alarms.create('tokenValidation', {
  delayInMinutes: 0.1,
  periodInMinutes: 60,
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'subscriptionSync') {
    syncSubscriptionStatus().catch(console.error);
  }
  if (alarm.name === 'tokenValidation') {
    validateStoredToken().catch(console.error);
  }
});

// Validate the stored auth token against the backend
async function validateStoredToken() {
  const settings = await getSettingsWithTokens();
  if (!settings.authToken) return; // No token — nothing to validate

  // Validate endpoint is allowed
  if (!isAllowedEndpoint(settings.apiEndpoint)) {
    console.warn('🌀 Token validation skipped: invalid API endpoint');
    return;
  }

  try {
    const response = await fetch(`${settings.apiEndpoint}/api/auth/me`, {
      headers: { Authorization: `Bearer ${settings.authToken}` },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401) {
      // Token expired — try refresh
      const refreshed = await refreshAuthToken();
      if (!refreshed) {
        console.log(
          '🌀 Stored token expired and refresh failed, clearing session'
        );
        await logoutUser();
      }
    }
  } catch (error) {
    // Network error — don't clear the token, backend might just be down
    console.warn('🌀 Token validation failed (network):', error.message);
  }
}

// Listen for storage changes to update badge
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.subscription) {
    const subscription = changes.subscription.newValue;
    if (subscription && subscription.tier !== 'free') {
      // Show tier badge for paid users
      const tierBadge = subscription.tier.charAt(0).toUpperCase();
      chrome.action.setBadgeText({ text: tierBadge });
      chrome.action.setBadgeBackgroundColor({
        color: subscription.tier === 'enterprise' ? '#F59E0B' : '#8B5CF6',
      });
    }
  }
});

console.log('🌀 Helix Background Service Worker initialized');
