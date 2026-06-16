/**
 * Storage example
 */

// Save settings
function saveSettings(settings) {
  chrome.storage.local.set({ settings: settings }, () => {
    console.log("Settings saved");
  });
}

// Load settings
function loadSettings(callback) {
  chrome.storage.local.get(['settings'], result => {
    callback(result.settings || {});
  });
}

// Clear cache
function clearCache() {
  chrome.storage.local.remove(['cache'], () => {
    console.log("Cache cleared");
  });
}

// Example usage
loadSettings(settings => {
  console.log("Current settings:", settings);
  
  const newSettings = {
    ...settings,
    theme: "dark",
    notifications: true
  };
  
  saveSettings(newSettings);
});
