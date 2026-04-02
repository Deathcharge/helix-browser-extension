/*
 * Samsara Helix Browser Extension - Background Service Worker
 * Handles extension lifecycle, authentication, and integration with Samsara Helix ecosystem
 *//

// Default settings
const DEFAULT_SETTINGS = {
  apiEndpoint: 'https://api.samsarahelix.com',
  coordinationLevel: 5.0,
  autoAnalyze: true,
  authToken: null,
  refreshToken: null,
  userId: null,
  subscription: null,
  lastSync: null,
};

// Subscription tier features
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

// Extension installed/updated
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('🌀 Helix extension installed');

    // Set default settings
    chrome.storage.sync.set(DEFAULT_SETTINGS);

    // Open welcome page
    chrome.tabs.create({
      url: 'https://helixspiral.work/help?ref=extension',
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
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
});

// Authenticate user
async function authenticateUser(email, password) {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

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

  // Store auth tokens
  await chrome.storage.sync.set({
    authToken: data.token,
    refreshToken: data.refresh_token,
    userId: data.user.id,
  });

  // Fetch subscription status
  await syncSubscriptionStatus();

  return data;
}

// Logout user
async function logoutUser() {
  await chrome.storage.sync.set({
    authToken: null,
    refreshToken: null,
    userId: null,
    subscription: null,
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

  return settings.subscription;
}

// Sync subscription status from server
async function syncSubscriptionStatus() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  if (!settings.authToken) {
    // Return free tier for unauthenticated users
    const freeSubscription = {
      tier: 'free',
      status: 'active',
      features: TIER_FEATURES.free,
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
      // Token expired, try to refresh
      const refreshed = await refreshAuthToken();
      if (!refreshed) {
        throw new Error('Session expired. Please log in again.');
      }
      // Retry with new token
      return await syncSubscriptionStatus();
    }

    if (!response.ok) {
      throw new Error('Failed to fetch subscription');
    }

    const subscription = await response.json();

    // Enrich with feature flags
    const tier = subscription.tier || 'free';
    const enrichedSubscription = {
      ...subscription,
      features: TIER_FEATURES[tier] || TIER_FEATURES.free,
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
      settings.subscription || {
        tier: 'free',
        status: 'active',
        features: TIER_FEATURES.free,
      }
    );
  }
}

// Refresh auth token
async function refreshAuthToken() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  if (!settings.refreshToken) {
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

    await chrome.storage.sync.set({
      authToken: data.token,
      refreshToken: data.refresh_token,
    });

    return true;
  } catch (error) {
    console.error('🌀 Token refresh failed:', error);
    return false;
  }
}

// Check feature access based on subscription tier
async function checkFeatureAccess(feature) {
  const subscription = await getSubscriptionStatus();
  const tier = subscription.tier || 'free';
  const features = TIER_FEATURES[tier] || TIER_FEATURES.free;

  return features[feature] || false;
}

// Get usage stats
async function getUsageStats() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const subscription = await getSubscriptionStatus();

  // Get today's analysis count from local storage
  const today = new Date().toISOString().split('T')[0];
  const usage = await chrome.storage.local.get({ [`analyses_${today}`]: 0 });
  const analysesToday = usage[`analyses_${today}`] || 0;

  const maxAnalyses = subscription.features?.maxAnalysesPerDay || 5;

  return {
    analysesToday,
    maxAnalyses,
    unlimited: maxAnalyses === -1,
    remaining:
      maxAnalyses === -1 ? -1 : Math.max(0, maxAnalyses - analysesToday),
    tier: subscription.tier,
    status: subscription.status,
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
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

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
    // Open upgrade page
    chrome.tabs.create({
      url: 'https://helixspiral.work/marketplace/pricing',
    });
  }
});

// Periodic subscription sync (every 30 minutes)
chrome.alarms.create('subscriptionSync', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'subscriptionSync') {
    syncSubscriptionStatus().catch(console.error);
  }
});

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
