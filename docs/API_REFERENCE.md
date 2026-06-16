# Helix Browser Extension API Reference

## Message API

### Sending Messages

```javascript
chrome.runtime.sendMessage({
  type: "REQUEST",
  action: "analyze",
  data: { url: "https://example.com" }
}, response => {
  console.log(response);
});
```

### Response Format

```javascript
{
  type: "RESPONSE",
  status: "success",
  data: { /* response data */ }
}
```

## Storage API

### Get Data

```javascript
chrome.storage.local.get(['key'], result => {
  console.log(result.key);
});
```

### Set Data

```javascript
chrome.storage.local.set({ key: 'value' });
```

### Remove Data

```javascript
chrome.storage.local.remove(['key']);
```

## Tab API

### Get Current Tab

```javascript
chrome.tabs.query({ active: true }, tabs => {
  const currentTab = tabs[0];
});
```

### Execute Script

```javascript
chrome.tabs.executeScript(tabId, {
  code: "console.log('Hello');"
});
```

## Content Script API

### Listen for Messages

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "REQUEST") {
    // Handle request
    sendResponse({ type: "RESPONSE", status: "ok" });
  }
});
```

## Error Handling

```javascript
try {
  // Extension code
} catch (error) {
  console.error("Error:", error);
  chrome.runtime.sendMessage({
    type: "ERROR",
    message: error.message
  });
}
```
