// Import browser polyfill if needed
// import browser from 'webextension-polyfill';

// Store for our tab data
let tabData = {};

// Function to fetch page content from a tab
async function getPageContent(tabId) {
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      function: () => {
        // Get page title, meta description, and visible text
        const title = document.title;
        const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
        
        // Get main content text (basic implementation)
        const bodyText = document.body.innerText.substring(0, 1000); // First 1000 chars
        
        return { title, metaDescription, bodyText };
      }
    });
    
    return result[0].result;
  } catch (error) {
    console.error(`Error getting content from tab ${tabId}:`, error);
    return { title: "", metaDescription: "", bodyText: "" };
  }
}

// Function to analyze and categorize a tab
async function analyzeTab(tab) {
  const { id, url, title } = tab;
  
  // Skip special browser pages, settings, etc.
  if (!url || url.startsWith('chrome:') || url.startsWith('chrome-extension:') || url.startsWith('about:')) {
    return;
  }
  
  // Get page content
  const content = await getPageContent(id);
  
  // In a real implementation, here you would:
  // 1. Call an LLM API to categorize/summarize the tab content
  // For the prototype, we'll use a simple categorization based on URL/title
  
  let category = "Uncategorized";
  
  // Simple rule-based categorization (replace with LLM in production)
  if (url.includes('github.com')) {
    category = "Development";
  } else if (url.includes('docs.google.com') || url.includes('notion.so')) {
    category = "Documents";
  } else if (url.includes('mail.') || url.includes('outlook.') || url.includes('gmail')) {
    category = "Email";
  } else if (url.includes('youtube') || url.includes('netflix') || url.includes('hulu')) {
    category = "Entertainment";
  } else if (url.includes('news') || url.includes('medium.com') || url.includes('blog')) {
    category = "Reading";
  }
  
  // Generate a basic summary (replace with LLM in production)
  const summary = content.title ? content.title : "No summary available";
  
  // Store the tab data
  tabData[id] = {
    id,
    url,
    title,
    category,
    summary,
    lastAccessed: new Date().getTime(),
    content: content
  };
  
  // Save to storage for persistence
  chrome.storage.local.set({ tabData });
  
  // Try to send a message to the popup, but handle the error if popup isn't open
  try {
    // Attempt to notify popup if it's open
    chrome.runtime.sendMessage({ action: "tabAnalyzed", tabId: id })
      .catch(error => {
        // Suppress the error about receiving end not existing
        console.log("Popup not available for message, this is normal");
      });
  } catch (error) {
    // Suppress any errors related to messaging
    console.log("Error sending message to popup, this is normal if popup is closed");
  }
}

// Listen for tab events
chrome.tabs.onCreated.addListener(async (tab) => {
  await analyzeTab(tab);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    await analyzeTab(tab);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const { tabId } = activeInfo;
  
  if (tabData[tabId]) {
    tabData[tabId].lastAccessed = new Date().getTime();
    chrome.storage.local.set({ tabData });
  }
  
  const tab = await chrome.tabs.get(tabId);
  await analyzeTab(tab);
});

// On extension startup, analyze all existing tabs
chrome.runtime.onStartup.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    await analyzeTab(tab);
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    await analyzeTab(tab);
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getTabData") {
    sendResponse({ tabData });
  } else if (message.action === "closeTabs") {
    const { tabIds } = message;
    for (const tabId of tabIds) {
      chrome.tabs.remove(tabId);
      delete tabData[tabId];
    }
    chrome.storage.local.set({ tabData });
    sendResponse({ success: true });
  } else if (message.action === "groupTabs") {
    // In Manifest V3, we need to implement tab grouping differently
    // This is a placeholder for tab grouping functionality
    sendResponse({ success: true });
  }
  
  return true; // Required for async response
});
