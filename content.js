// Universal content script for profile scraping
console.log('Universal Profile Scraper content script loaded for:', window.location.hostname);

// Inject additional script into page context if needed
function injectPageScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Supported domains for script injection
const supportedDomains = [
  'sbcconnect.com',
  'event.igblive.com'
];

// Only inject if we're on a supported site
if (supportedDomains.some(domain => window.location.hostname.includes(domain))) {
  injectPageScript();
  console.log('Injected page script for:', window.location.hostname);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkPageReady') {
    // Check if page is ready for scraping
    sendResponse({
      ready: document.readyState === 'complete',
      domain: window.location.hostname,
      url: window.location.href
    });
  }
  
  if (request.action === 'getPageInfo') {
    // Return page information
    sendResponse({
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
      readyState: document.readyState
    });
  }
});

// Monitor for dynamic content changes
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Notify background script of URL change
    chrome.runtime.sendMessage({
      action: 'pageChanged',
      url: url,
      domain: window.location.hostname
    }).catch(() => {
      // Background script might not be listening, ignore
    });
  }
}).observe(document, { subtree: true, childList: true });