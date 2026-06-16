/**
 * Content script example
 */

// Send message to background script
function sendRequest(action, data) {
  chrome.runtime.sendMessage({
    type: "REQUEST",
    action: action,
    data: data
  }, response => {
    console.log("Response:", response);
  });
}

// Analyze current page
function analyzePage() {
  const pageData = {
    url: window.location.href,
    title: document.title,
    content: document.body.innerText.substring(0, 500)
  };
  
  sendRequest("analyze", pageData);
}

// Listen for keyboard shortcuts
document.addEventListener("keydown", event => {
  if (event.ctrlKey && event.key === "a") {
    analyzePage();
  }
});
