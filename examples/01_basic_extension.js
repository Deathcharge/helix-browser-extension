/**
 * Basic extension example
 */

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "REQUEST") {
    console.log("Received request:", request);
    
    // Process request
    const response = {
      type: "RESPONSE",
      status: "success",
      data: { message: "Request processed" }
    };
    
    sendResponse(response);
  }
});

// Listen for tab changes
chrome.tabs.onActivated.addListener(activeInfo => {
  console.log("Tab activated:", activeInfo.tabId);
});

// Listen for URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    console.log("Tab loaded:", tab.url);
  }
});
