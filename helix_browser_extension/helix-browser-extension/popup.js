/**
 * Helix Browser Extension - Popup Script
 * Handles page analysis, authentication, and subscription features
 */

// DOM Elements - Main UI
const pageTitle = document.getElementById('page-title');
const pageUrl = document.getElementById('page-url');
const analyzeBtn = document.getElementById('analyze-btn');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');

// Metric elements
const relevanceScore = document.getElementById('relevance-score');
const harmonyScore = document.getElementById('harmony-score');
const discoveryScore = document.getElementById('discovery-score');
const relevanceBar = document.getElementById('relevance-bar');
const harmonyBar = document.getElementById('harmony-bar');
const discoveryBar = document.getElementById('discovery-bar');
const contentPreview = document.getElementById('content-preview');
const keywordsDiv = document.getElementById('keywords');

// Action buttons
const exportBtn = document.getElementById('export-btn');
const shareBtn = document.getElementById('share-btn');
const saveBtn = document.getElementById('save-btn');

// Auth & Subscription UI
const authStatus = document.getElementById('auth-status');
const authText = document.getElementById('auth-text');
const authBtn = document.getElementById('auth-btn');
const usageBar = document.getElementById('usage-bar');
const usageText = document.getElementById('usage-text');
const usageFill = document.getElementById('usage-fill');
const upgradeBtn = document.getElementById('upgrade-btn');
const subscriptionBadge = document.getElementById('subscription-badge');

// Settings panel elements
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings');
const apiEndpointSelect = document.getElementById('api-endpoint');
const coordinationSlider = document.getElementById('coordination-level');
const coordinationValue = document.getElementById('coordination-value');
const autoAnalyzeCheckbox = document.getElementById('auto-analyze');

// Auth modal elements
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const closeAuthBtn = document.getElementById('close-auth');
const settingsAuthBtn = document.getElementById('settings-auth-btn');
const settingsLogoutBtn = document.getElementById('settings-logout-btn');

// Settings account info
const accountEmail = document.getElementById('account-email');
const accountTier = document.getElementById('account-tier');
const upgradeBanner = document.getElementById('upgrade-banner');
const settingsUsageCount = document.getElementById('settings-usage-count');
const settingsHistoryLimit = document.getElementById('settings-history-limit');
const settingsExportStatus = document.getElementById('settings-export-status');
const settingsMetricsStatus = document.getElementById(
  'settings-metrics-status'
);
const footerHomeLink = document.getElementById('footer-home-link');

// State
let currentTab = null;
let lastResult = null;
let currentSubscription = null;
let currentUsage = null;

// Default settings — only localhost as hardcoded fallback for new installs.
// Users set their production URL (e.g., helixspiral.work) in settings.
const DEFAULT_API_BASE = 'https://api.helixspiral.work';

const DEFAULT_SETTINGS = {
  apiEndpoint: DEFAULT_API_BASE,
  coordinationLevel: 5.0,
  autoAnalyze: true,
};

// Initialize
async function initialize() {
  // Load settings
  await loadSettings();

  // Get current tab
  const tab = await getCurrentTab();
  updateTabInfo(tab);

  // Load subscription and usage
  await updateSubscriptionUI();
  await updateUsageUI();

  // Auto-analyze if enabled
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  if (settings.autoAnalyze && currentTab?.url?.startsWith('http')) {
    analyzePage();
  }
}

// Load settings from storage
async function loadSettings() {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  apiEndpointSelect.value = result.apiEndpoint;
  coordinationSlider.value = result.coordinationLevel;
  coordinationValue.textContent = result.coordinationLevel.toFixed(1);
  autoAnalyzeCheckbox.checked = result.autoAnalyze;
  const showWidgetCheckbox = document.getElementById('show-widget');
  if (showWidgetCheckbox) {
    showWidgetCheckbox.checked = result.showWidget !== false;
  }

  // Update dynamic links that depend on the API endpoint
  updateDynamicLinks(result.apiEndpoint);

  return result;
}

// Save settings to storage
async function saveSettings() {
  const showWidgetCheckbox = document.getElementById('show-widget');
  const settings = {
    apiEndpoint: apiEndpointSelect.value.replace(/\/+$/, ''),
    coordinationLevel: parseFloat(coordinationSlider.value),
    autoAnalyze: autoAnalyzeCheckbox.checked,
    showWidget: showWidgetCheckbox ? showWidgetCheckbox.checked : true,
  };
  await chrome.storage.sync.set(settings);
  updateDynamicLinks(settings.apiEndpoint);
  return settings;
}

// Derive the web origin from the API endpoint (for signup/forgot-password links)
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

async function exchangeOAuthSession(apiEndpoint, exchangeId) {
  const response = await fetch(`${apiEndpoint}/api/auth/oauth/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ exchange_id: exchangeId }),
  });

  if (!response.ok) {
    const errorPayload = await response
      .json()
      .catch(() => ({ detail: 'OAuth session exchange failed' }));
    throw new Error(errorPayload.detail || 'OAuth session exchange failed');
  }

  return response.json();
}

function extractOAuthSession(data) {
  const nested = data && typeof data.data === 'object' ? data.data : null;
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
  const user = data?.user || nested?.user || null;
  const userId =
    user?.id ||
    user?.user_id ||
    user?.sub ||
    data?.user_id ||
    data?.sub ||
    nested?.user_id ||
    nested?.sub ||
    null;
  const email =
    user?.email ||
    user?.username ||
    user?.name ||
    data?.email ||
    nested?.email ||
    'Signed in';

  return { authToken, refreshToken, userId, email };
}

// Update hrefs/links that depend on the configured API endpoint
function updateDynamicLinks(apiEndpoint) {
  const origin = getWebOrigin(apiEndpoint);
  const signupLink = document.getElementById('signup-link');
  const forgotLink = document.getElementById('forgot-password-link');
  if (signupLink) signupLink.href = `${origin}/signup?ref=extension`;
  if (forgotLink) forgotLink.href = `${origin}/forgot-password`;

  const banner = document.getElementById('upgrade-banner');
  if (banner) banner.href = `${origin}/marketplace/pricing`;
  if (footerHomeLink) footerHomeLink.href = `${origin}/?ref=extension`;
}

// Get current tab info
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Update UI with tab info
function updateTabInfo(tab) {
  if (tab) {
    pageTitle.textContent = tab.title || 'Untitled Page';
    pageUrl.textContent = tab.url || '';
    currentTab = tab;
  }
}

// Update subscription UI
async function updateSubscriptionUI() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getSubscription',
    });
    if (response.success) {
      currentSubscription = response.subscription;
      updateSubscriptionDisplay();
    }
  } catch (error) {
    console.error('Failed to get subscription:', error);
  }
}

// Update subscription display
function updateSubscriptionDisplay() {
  if (!currentSubscription) return;

  const tier = currentSubscription.tier || 'free';
  const isAuthenticated = Boolean(currentSubscription.authenticated);
  const isPaid = isAuthenticated && tier !== 'free';

  // Update header badge
  if (isPaid) {
    subscriptionBadge.textContent = tier.charAt(0).toUpperCase();
    subscriptionBadge.classList.remove('hidden');
    subscriptionBadge.classList.add(`tier-${tier}`);
  } else {
    subscriptionBadge.classList.add('hidden');
  }

  // Update auth status bar
  if (isAuthenticated) {
    authStatus.classList.add('authenticated');
    authText.textContent = `Signed in • ${
      tier.charAt(0).toUpperCase() + tier.slice(1)
    }`;
    authBtn.textContent = 'Sign Out';
  } else {
    authStatus.classList.remove('authenticated');
    authText.textContent = 'Not signed in';
    authBtn.textContent = 'Sign In';
  }

  // Update settings panel
  accountTier.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
  accountTier.className = `tier-badge tier-${tier}`;

  if (isPaid) {
    upgradeBanner.classList.add('hidden');
  } else {
    upgradeBanner.classList.remove('hidden');
  }

  if (isAuthenticated) {
    settingsLogoutBtn.classList.remove('hidden');
    settingsAuthBtn.classList.add('hidden');
  } else {
    settingsLogoutBtn.classList.add('hidden');
    settingsAuthBtn.classList.remove('hidden');
  }

  // Update feature indicators
  const features = currentSubscription.features || {};
  settingsHistoryLimit.textContent =
    features.maxHistoryDays === -1
      ? 'Unlimited'
      : `${features.maxHistoryDays} days`;
  settingsExportStatus.textContent = features.exportEnabled ? '✅' : '❌';
  settingsMetricsStatus.textContent = features.advancedMetrics ? '✅' : '❌';
}

// Update usage UI
async function updateUsageUI() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getUsage' });
    if (response.success) {
      currentUsage = response.stats;
      updateUsageDisplay();
    }
  } catch (error) {
    console.error('Failed to get usage:', error);
  }
}

// Update usage display
function updateUsageDisplay() {
  if (!currentUsage) return;

  usageBar.classList.remove('hidden');

  const { analysesToday, maxAnalyses, unlimited, remaining, tier } =
    currentUsage;

  // Update usage text
  if (unlimited) {
    usageText.textContent = `${analysesToday} analyses today (Unlimited)`;
    usageFill.style.width = '100%';
    usageFill.classList.add('unlimited');
    upgradeBtn.classList.add('hidden');
  } else {
    usageText.textContent = `${analysesToday}/${maxAnalyses} analyses today`;
    const percent = (analysesToday / maxAnalyses) * 100;
    usageFill.style.width = `${percent}%`;
    usageFill.classList.remove('unlimited');

    // Show upgrade button if running low
    if (remaining <= 2) {
      upgradeBtn.classList.remove('hidden');
    } else {
      upgradeBtn.classList.add('hidden');
    }

    // Change color based on usage
    if (percent >= 80) {
      usageFill.classList.add('warning');
    } else if (percent >= 50) {
      usageFill.classList.add('caution');
    }
  }

  // Update settings panel
  settingsUsageCount.textContent = unlimited
    ? `${analysesToday}/∞`
    : `${analysesToday}/${maxAnalyses}`;
}

// Show/hide states
function showLoading() {
  analyzeBtn.style.display = 'none';
  resultsDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');
  loadingDiv.classList.remove('hidden');
}

function showResults() {
  analyzeBtn.style.display = 'flex';
  loadingDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');
  resultsDiv.classList.remove('hidden');
}

function showError(message) {
  analyzeBtn.style.display = 'flex';
  loadingDiv.classList.add('hidden');
  resultsDiv.classList.add('hidden');
  errorDiv.classList.remove('hidden');
  errorMessage.textContent = message;
}

function resetState() {
  analyzeBtn.style.display = 'flex';
  loadingDiv.classList.add('hidden');
  resultsDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');
}

// Format score for display
function formatScore(value) {
  if (value === undefined || value === null) return '--';
  return (value * 100).toFixed(0);
}

// Update metric display
function updateMetric(scoreEl, barEl, value) {
  const percent = (value || 0) * 100;
  scoreEl.textContent = formatScore(value);
  barEl.style.width = `${percent}%`;

  // Color based on score
  if (percent >= 70) {
    barEl.style.background = 'var(--success, #10B981)';
  } else if (percent >= 40) {
    barEl.style.background = 'var(--primary, #8B5CF6)';
  } else {
    barEl.style.background = 'var(--warning, #F59E0B)';
  }
}

// Display analysis results
function displayResults(result) {
  lastResult = result;

  const metrics = result.coordination_metrics || {};

  // Update metrics
  updateMetric(relevanceScore, relevanceBar, metrics.relevance);
  updateMetric(harmonyScore, harmonyBar, metrics.harmony);
  updateMetric(discoveryScore, discoveryBar, metrics.discovery_value);

  // Content preview
  if (result.content_preview) {
    contentPreview.textContent =
      result.content_preview.substring(0, 200) + '...';
  } else {
    contentPreview.textContent = 'No preview available';
  }

  // Keywords
  keywordsDiv.innerHTML = '';
  const analysis = result.analysis || {};
  const keywords = analysis.coordination_keywords_found || [];
  keywords.slice(0, 8).forEach(kw => {
    const span = document.createElement('span');
    span.className = 'keyword';
    span.textContent = kw;
    keywordsDiv.appendChild(span);
  });

  showResults();

  // Update badge
  chrome.runtime.sendMessage({
    action: 'updateBadge',
    score: metrics.harmony || 0,
  });
}

// Analyze page
async function analyzePage() {
  if (!currentTab || !currentTab.url) {
    showError('No active page to analyze');
    return;
  }

  // Skip non-http(s) pages
  if (!currentTab.url.startsWith('http')) {
    showError('Cannot analyze this type of page');
    return;
  }

  showLoading();

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getAnalysis',
      url: currentTab.url,
    });

    if (response.success) {
      displayResults(response.result);
      // Update usage after analysis
      await updateUsageUI();
    } else {
      throw new Error(response.error || 'Analysis failed');
    }
  } catch (error) {
    console.error('Analysis error:', error);
    showError(error.message || 'Failed to analyze page');
  }
}

// Handle authentication
async function handleAuth() {
  if (currentSubscription?.authenticated) {
    // Sign out
    try {
      await chrome.runtime.sendMessage({ action: 'logout' });
      currentSubscription = null;
      accountEmail.textContent = 'Not signed in';
      updateSubscriptionDisplay();
      updateUsageUI();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  } else {
    // Show auth modal
    authModal.classList.remove('hidden');
  }
}

// Handle auth form submission
async function handleAuthSubmit(e) {
  e.preventDefault();

  const email = authEmail.value;
  const password = authPassword.value;

  if (!email || !password) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'authenticate',
      email,
      password,
    });

    if (response.success) {
      authModal.classList.add('hidden');
      authEmail.value = '';
      authPassword.value = '';

      // Update account info in settings
      accountEmail.textContent = email;

      // Refresh subscription and usage
      await updateSubscriptionUI();
      await updateUsageUI();
    } else {
      alert(response.error || 'Authentication failed');
    }
  } catch (error) {
    console.error('Auth error:', error);
    alert('Authentication failed. Please try again.');
  }
}

// Check feature access
async function checkFeature(feature) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkFeature',
      feature,
    });
    return response.success && response.access;
  } catch (error) {
    console.error('Feature check failed:', error);
    return false;
  }
}

// Export result
async function exportResult() {
  if (!lastResult) return;

  // Check if export is enabled for user's tier
  const canExport = await checkFeature('exportEnabled');
  if (!canExport) {
    const origin = getWebOrigin(
      (await chrome.storage.sync.get(DEFAULT_SETTINGS)).apiEndpoint
    );
    alert(
      'Export is only available on Hobby and higher tiers. Upgrade to unlock!'
    );
    chrome.tabs.create({ url: `${origin}/marketplace/pricing` });
    return;
  }

  try {
    const settings = await loadSettings();
    const tokens = await chrome.storage.session.get({ authToken: null });
    const headers = { 'Content-Type': 'application/json' };
    if (tokens.authToken) {
      headers['Authorization'] = `Bearer ${tokens.authToken}`;
    }

    const response = await fetch(
      `${settings.apiEndpoint}/api/export/discovery`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          results: [lastResult],
          format: 'json',
          title: `Analysis: ${lastResult.title || lastResult.url}`,
        }),
      }
    );

    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `helix-analysis-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed: ' + error.message);
  }
}

// Share result (copy link)
async function shareResult() {
  if (!lastResult) return;

  const origin = getWebOrigin(
    (await chrome.storage.sync.get(DEFAULT_SETTINGS)).apiEndpoint
  );
  const shareText = `🌀 Helix Coordination Analysis

📄 ${lastResult.title || lastResult.url}
📊 Relevance: ${formatScore(lastResult.coordination_metrics?.relevance)}%
💫 Harmony: ${formatScore(lastResult.coordination_metrics?.harmony)}%
⚡ Discovery Value: ${formatScore(
    lastResult.coordination_metrics?.discovery_value
  )}%

Analyzed with Helix Collective - ${origin}`;

  navigator.clipboard.writeText(shareText).then(() => {
    shareBtn.textContent = '✓ Copied!';
    setTimeout(() => {
      shareBtn.textContent = '🔗 Share';
    }, 2000);
  });
}

// Save to Helix account
async function saveToHelix() {
  if (!lastResult) return;

  // Check if user is authenticated
  if (!currentSubscription || currentSubscription.status !== 'active') {
    alert('Sign in to Helix to save your analysis history!');
    authModal.classList.remove('hidden');
    return;
  }

  const settings = await loadSettings();
  const tokens = await chrome.storage.session.get({ authToken: null });
  if (!tokens.authToken) {
    alert('Sign in to Helix to save your analysis history!');
    authModal.classList.remove('hidden');
    return;
  }

  try {
    const response = await fetch(`${settings.apiEndpoint}/api/discovery/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.authToken}`,
      },
      body: JSON.stringify({
        url: lastResult.url,
        title: lastResult.title || '',
        metrics: lastResult.coordination_metrics || {},
        content_preview: lastResult.content_preview || '',
        keywords: lastResult.keywords || [],
        analyzed_at: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      saveBtn.textContent = '✓ Saved!';
      setTimeout(() => {
        saveBtn.textContent = '💾 Save';
      }, 2000);
    } else {
      const data = await response.json().catch(() => ({}));
      console.warn('Save failed:', data);
      alert('Could not save analysis: ' + (data.detail || 'Unknown error'));
    }
  } catch (error) {
    console.warn('Save to Helix failed:', error);
    alert('Save failed: ' + error.message);
  }
}

// Open upgrade page
async function openUpgrade() {
  const origin = getWebOrigin(
    (await chrome.storage.sync.get(DEFAULT_SETTINGS)).apiEndpoint
  );
  chrome.tabs.create({ url: `${origin}/marketplace/pricing` });
}

// OAuth sign-in — opens a browser tab for the OAuth flow, then captures the token
async function handleOAuth(provider) {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const origin = getWebOrigin(settings.apiEndpoint);
  const redirectUrl = chrome.identity.getRedirectURL();

  try {
    const authorizeResponse = await fetch(
      `${
        settings.apiEndpoint
      }/api/auth/oauth/authorize/${provider}?extension_callback=${encodeURIComponent(
        redirectUrl
      )}`
    );

    if (!authorizeResponse.ok) {
      const errorPayload = await authorizeResponse
        .json()
        .catch(() => ({ detail: 'Could not start OAuth sign-in' }));
      throw new Error(errorPayload.detail || 'Could not start OAuth sign-in');
    }

    const authorizeData = await authorizeResponse.json();
    const oauthUrl = authorizeData.authorization_url;

    if (!oauthUrl) {
      throw new Error(`Missing OAuth authorization URL for ${provider}`);
    }

    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: oauthUrl,
      interactive: true,
    });

    const url = new URL(responseUrl);
    const exchangeId = url.searchParams.get('exchange_id');
    const token =
      url.searchParams.get('token') || url.hash?.match(/token=([^&]+)/)?.[1];

    if (exchangeId) {
      const exchangeData = await exchangeOAuthSession(
        settings.apiEndpoint,
        exchangeId
      );
      const authSession = extractOAuthSession(exchangeData);

      if (!authSession.authToken) {
        throw new Error('OAuth exchange completed but no token was returned');
      }

      await chrome.storage.session.set({
        authToken: authSession.authToken,
        refreshToken: authSession.refreshToken,
        userId: authSession.userId,
      });

      accountEmail.textContent = authSession.email;
      authModal.classList.add('hidden');
      await chrome.runtime.sendMessage({ action: 'syncSubscription' });
      await chrome.runtime.sendMessage({ action: 'syncUserState' });
      await updateSubscriptionUI();
      await updateUsageUI();
      return;
    }

    if (token) {
      const authSession = extractOAuthSession({
        token,
        refresh_token:
          url.searchParams.get('refresh_token') ||
          url.searchParams.get('refresh') ||
          null,
        user_id:
          url.searchParams.get('user_id') ||
          url.searchParams.get('sub') ||
          null,
        user: {
          email: url.searchParams.get('email') || undefined,
        },
      });

      await chrome.storage.session.set({
        authToken: authSession.authToken,
        refreshToken: authSession.refreshToken,
        userId: authSession.userId,
      });

      authModal.classList.add('hidden');
      if (authSession.email && authSession.email !== 'Signed in') {
        accountEmail.textContent = authSession.email;
      }
      await chrome.runtime.sendMessage({ action: 'syncSubscription' });
      await chrome.runtime.sendMessage({ action: 'syncUserState' });
      await updateSubscriptionUI();
      await updateUsageUI();
    } else {
      console.warn('OAuth flow completed but no token received');
      alert('Sign-in completed but no token was returned. Please try again.');
    }
  } catch (error) {
    console.warn('OAuth flow failed:', error);
    // If identity API is unavailable (e.g., Firefox), fall back to tab-based flow
    chrome.tabs.create({
      url: `${origin}/login?source=extension&provider=${provider}`,
    });
  }
}

// Event Listeners
analyzeBtn.addEventListener('click', analyzePage);
retryBtn.addEventListener('click', analyzePage);
exportBtn.addEventListener('click', exportResult);
shareBtn.addEventListener('click', shareResult);
saveBtn.addEventListener('click', saveToHelix);
authBtn.addEventListener('click', handleAuth);
upgradeBtn.addEventListener('click', openUpgrade);

// Settings panel
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
  saveSettings();
});

// Auth modal
settingsAuthBtn.addEventListener('click', () => {
  authModal.classList.remove('hidden');
});

settingsLogoutBtn.addEventListener('click', async () => {
  await handleAuth();
  settingsPanel.classList.add('hidden');
});

closeAuthBtn.addEventListener('click', () => {
  authModal.classList.add('hidden');
});

// OAuth buttons
document
  .getElementById('oauth-google')
  ?.addEventListener('click', () => handleOAuth('google'));
document
  .getElementById('oauth-github')
  ?.addEventListener('click', () => handleOAuth('github'));
document
  .getElementById('oauth-discord')
  ?.addEventListener('click', () => handleOAuth('discord'));

authForm.addEventListener('submit', handleAuthSubmit);

// Settings controls
coordinationSlider.addEventListener('input', () => {
  coordinationValue.textContent = parseFloat(coordinationSlider.value).toFixed(
    1
  );
});

apiEndpointSelect.addEventListener('change', () => {
  saveSettings();
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initialize);
