// Store for our tab data
let tabData = {};
let categories = new Set();
let isInitialized = false;

// Create a favicon cache
const faviconCache = new Map();

// Function to get favicon URL with caching
function getFaviconUrl(domain) {
  if (faviconCache.has(domain)) {
    return faviconCache.get(domain);
  }
  
  // Try to get the favicon from google's favicon service as it's more reliable
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  faviconCache.set(domain, faviconUrl);
  return faviconUrl;
}

// Intersection Observer for lazy loading favicons
const faviconObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const container = entry.target;
      const domain = container.dataset.domain;
      if (domain) {
        const img = container.querySelector('img');
        if (img && !img.src) {
          img.src = getFaviconUrl(domain);
        }
      }
      faviconObserver.unobserve(container);
    }
  });
}, {
  rootMargin: '50px' // Start loading when favicon is 50px away from viewport
});

// Function to initialize the popup
async function initPopup() {
  // Prevent double initialization
  if (isInitialized) return;
  
  try {
    isInitialized = true;
    
    // Show loading state
    document.getElementById('tab-groups-container').innerHTML = '<div class="loading">Loading tabs...</div>';
    
    // Set up message listeners first - using a more reliable approach
    setupMessageListeners();
    
    // Try to load from local storage first (fastest)
    try {
      const storageData = await chrome.storage.local.get('tabData');
      if (storageData && storageData.tabData && Object.keys(storageData.tabData).length > 0) {
        tabData = storageData.tabData;
        renderTabGroups();
        
        // Still try to get fresh data from background, but don't block UI
        refreshDataFromBackground();
        return;
      }
    } catch (storageError) {
      console.warn('Error loading from storage:', storageError);
    }
    
    // If storage didn't work, get data from background
    await refreshDataFromBackground();
    
  } catch (error) {
    console.error("Error initializing popup:", error);
    document.getElementById('tab-groups-container').innerHTML = 
      '<div class="error">Error loading tabs. Please try reloading the extension.</div>';
  }
  
  // Set up event listeners
  document.getElementById('analyze-btn').addEventListener('click', analyzeTabs);
  document.getElementById('close-inactive-btn').addEventListener('click', closeInactiveTabs);
  document.getElementById('search-input').addEventListener('input', handleSearch);
}

// Function to refresh data from background script
async function refreshDataFromBackground() {
  try {
    console.log('Refreshing data from background...');
    
    // Get initial tab data with timeout to prevent hanging
    const response = await getTabDataWithTimeout(5000);
    
    if (response && response.tabData && Object.keys(response.tabData).length > 0) {
      console.log(`Refreshed data with ${Object.keys(response.tabData).length} tabs`);
      tabData = response.tabData;
      renderTabGroups();
      return true;
    } else if (response && response.error) {
      console.error('Error refreshing data:', response.error);
      // If we have an error but already have tab data, keep using it
      if (Object.keys(tabData).length > 0) {
        console.log('Using existing tab data instead');
        renderTabGroups();
        return true;
      }
    }
    
    // If we got here, we need to analyze tabs
    console.log('No data received, trying to analyze tabs...');
    await analyzeTabs();
    return true;
  } catch (error) {
    console.error('Error refreshing data:', error);
    
    // If we already rendered something, don't show error
    if (document.querySelector('.tab-group')) {
      console.log('Already rendered groups, keeping current view');
      return true;
    }
    
    // If we have tab data but failed to render, try rendering again
    if (Object.keys(tabData).length > 0) {
      console.log('Have tab data, trying to render again');
      try {
        renderTabGroups();
        return true;
      } catch (renderError) {
        console.error('Error rendering tab groups:', renderError);
      }
    }
    
    document.getElementById('tab-groups-container').innerHTML = 
      `<div class="error">Error loading tabs: ${error.message}<br><br>
      Please try the Analyze button or reload the extension.</div>`;
    return false;
  }
}

// Helper function to set up message listeners
function setupMessageListeners() {
  try {
    // Remove any existing listeners to prevent duplicates
    chrome.runtime.onMessage.removeListener(handleBackgroundMessages);
    // Add the listener
    chrome.runtime.onMessage.addListener(handleBackgroundMessages);
  } catch (error) {
    console.warn('Error setting up message listeners:', error);
  }
}

// Message handler function
function handleBackgroundMessages(message, sender, sendResponse) {
  try {
    if (message.action === "tabAnalyzed" || message.action === "tabDataUpdated") {
      if (message.tabData) {
        tabData = message.tabData;
        renderTabGroups();
      }
    }
  } catch (error) {
    console.warn('Error handling message:', error);
  }
  return true; // Keep the message channel open
}

// Helper function to get tab data with a timeout
async function getTabDataWithTimeout(timeout = 5000) {
  console.log(`Getting tab data with ${timeout}ms timeout...`);
  
  // First try to get from storage directly
  try {
    console.log('Trying to get tab data from storage...');
    const storageData = await chrome.storage.local.get('tabData');
    if (storageData && storageData.tabData && Object.keys(storageData.tabData).length > 0) {
      console.log(`Found ${Object.keys(storageData.tabData).length} tabs in storage`);
      return { tabData: storageData.tabData };
    }
    console.log('No tab data in storage or empty data');
  } catch (storageError) {
    console.error('Error getting tab data from storage:', storageError);
  }
  
  // Then try to get from background script
  return new Promise((resolve) => {
    console.log('Requesting tab data from background script...');
    
    // Set a timeout to prevent hanging if background doesn't respond
    const timeoutId = setTimeout(() => {
      console.warn(`getTabData timed out after ${timeout}ms`);
      resolve({ tabData: {}, error: 'Timeout getting tab data' });
    }, timeout);
    
    // Request the data
    try {
      chrome.runtime.sendMessage({ action: "getTabData" }, (response) => {
        clearTimeout(timeoutId);
        
        if (chrome.runtime.lastError) {
          console.error('Runtime error getting tab data:', chrome.runtime.lastError);
          resolve({ tabData: {}, error: chrome.runtime.lastError.message });
          return;
        }
        
        if (response && response.tabData) {
          console.log(`Received ${Object.keys(response.tabData).length} tabs from background`);
          resolve(response);
        } else {
          console.warn('Received empty or invalid response from background');
          resolve({ tabData: {}, error: 'Invalid response from background' });
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error sending getTabData message:', error);
      resolve({ tabData: {}, error: error.message });
    }
  });
}

// Function to analyze all tabs
async function analyzeTabs() {
  try {
    // Update button state and show loading
    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.textContent = "Analyzing...";
    analyzeBtn.disabled = true;
    
    // Show loading state
    document.getElementById('tab-groups-container').innerHTML = 
      '<div class="loading">Analyzing tabs...</div>';

    console.log('Starting forced tab analysis...');
    
    // Clear existing tab data to force a fresh start
    tabData = {};
    try {
      await chrome.storage.local.remove('tabData');
      console.log('Cleared existing tab data');
    } catch (clearError) {
      console.warn('Error clearing storage:', clearError);
    }
    
    // First try to get tabs directly to check if we have access
    let allTabs;
    try {
      allTabs = await chrome.tabs.query({});
      console.log(`Found ${allTabs.length} tabs to analyze`);
    } catch (tabError) {
      console.error('Error accessing tabs:', tabError);
      throw new Error('Cannot access tabs. Extension permissions may need to be refreshed.');
    }

    // If we found no tabs, throw an error
    if (!allTabs || allTabs.length === 0) {
      throw new Error('No tabs found to analyze. Try reloading the extension.');
    }

    // Request analysis of all tabs with increased timeout
    console.log('Sending analyzeAllTabs message to background...');
    const response = await new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        console.warn('analyzeAllTabs timed out after 15 seconds');
        resolve({ success: false, error: 'Operation timed out' });
      }, 15000); // Increased timeout to 15 seconds
      
      try {
        chrome.runtime.sendMessage({ action: "analyzeAllTabs" }, (response) => {
          clearTimeout(timeoutId);
          console.log('Received analyzeAllTabs response:', response);
          resolve(response || { success: false, error: 'No response from background' });
        });
      } catch (msgError) {
        clearTimeout(timeoutId);
        console.error('Error sending analyzeAllTabs message:', msgError);
        resolve({ success: false, error: msgError.message });
      }
    });

    console.log('Analysis response:', response);

    if (response && response.success) {
      // Even if successful, force a fresh data load
      console.log('Forcing fresh data load...');
      const freshData = await getTabDataWithTimeout(10000); // Increased timeout
      
      if (freshData && freshData.tabData && Object.keys(freshData.tabData).length > 0) {
        tabData = freshData.tabData;
        renderTabGroups();
        console.log('Successfully refreshed tab data');
      } else {
        // If we can't get fresh data but have tabs, create basic data
        console.log('Creating basic tab data from query...');
        tabData = {};
        for (const tab of allTabs) {
          tabData[tab.id] = {
            id: tab.id,
            url: tab.url,
            title: tab.title,
            category: "Uncategorized", // Will be updated by background
            summary: tab.title || "No summary available",
            lastAccessed: new Date().getTime()
          };
        }
        renderTabGroups();
        
        // Trigger background refresh
        chrome.runtime.sendMessage({ action: "refreshAllTabs" });
      }
    } else {
      // If analysis failed, try to at least show basic tab data
      console.log('Analysis failed, showing basic tab data...');
      tabData = {};
      for (const tab of allTabs) {
        tabData[tab.id] = {
          id: tab.id,
          url: tab.url,
          title: tab.title,
          category: "Uncategorized",
          summary: tab.title || "No summary available",
          lastAccessed: new Date().getTime()
        };
      }
      renderTabGroups();
      
      // Show warning but don't throw error
      const container = document.getElementById('tab-groups-container');
      const warning = document.createElement('div');
      warning.className = 'warning';
      warning.textContent = 'Some tab information may be incomplete. Analysis is continuing in the background.';
      container.insertBefore(warning, container.firstChild);
      
      // Trigger background refresh
      chrome.runtime.sendMessage({ action: "refreshAllTabs" });
    }
  } catch (error) {
    console.error('Error analyzing tabs:', error);
    document.getElementById('tab-groups-container').innerHTML = 
      `<div class="error">
        Error analyzing tabs: ${error.message}<br><br>
        Please try reloading the extension from chrome://extensions page.
        <br><br>
        <button onclick="window.location.reload()">Reload Popup</button>
      </div>`;
  } finally {
    // Reset button state
    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.textContent = "Analyze Tabs";
    analyzeBtn.disabled = false;
  }
}

// Function to close inactive tabs
async function closeInactiveTabs() {
  const now = new Date().getTime();
  const thirtyMinutesAgo = now - (30 * 60 * 1000); // 30 minutes in milliseconds
  
  const inactiveTabIds = Object.entries(tabData)
    .filter(([_, data]) => data.lastAccessed < thirtyMinutesAgo)
    .map(([tabId, _]) => parseInt(tabId));
  
  if (inactiveTabIds.length > 0) {
    if (confirm(`Close ${inactiveTabIds.length} inactive tabs?`)) {
      chrome.runtime.sendMessage({ 
        action: "closeTabs", 
        tabIds: inactiveTabIds 
      }, () => {
        renderTabGroups();
      });
    }
  } else {
    alert("No inactive tabs found.");
  }
}

// Function to handle search input
function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  
  // Get all tab items
  const tabItems = document.querySelectorAll('.tab-item');
  
  // Filter tabs based on search term
  tabItems.forEach(item => {
    const tabTitle = item.querySelector('.tab-title').textContent.toLowerCase();
    const tabSummary = item.querySelector('.tab-summary').textContent.toLowerCase();
    
    if (tabTitle.includes(searchTerm) || tabSummary.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
  
  // Show/hide group headers based on whether they have visible tabs
  const tabGroups = document.querySelectorAll('.tab-group');
  tabGroups.forEach(group => {
    const visibleTabs = group.querySelectorAll('.tab-item[style="display: flex;"]');
    if (visibleTabs.length === 0 && searchTerm !== '') {
      group.style.display = 'none';
    } else {
      group.style.display = 'block';
    }
  });
}

// Function to render tab groups
function renderTabGroups() {
  const tabGroupsContainer = document.getElementById('tab-groups-container');
  tabGroupsContainer.innerHTML = '';
  
  // Extract categories and group tabs
  const groupedTabs = {};
  categories = new Set();
  
  // Group tabs by category
  Object.values(tabData).forEach(tab => {
    if (!groupedTabs[tab.category]) {
      groupedTabs[tab.category] = [];
      categories.add(tab.category);
    }
    groupedTabs[tab.category].push(tab);
  });
  
  // Sort tabs within each category by last accessed time
  Object.keys(groupedTabs).forEach(category => {
    groupedTabs[category].sort((a, b) => b.lastAccessed - a.lastAccessed);
  });
  
  // Create a fragment to minimize DOM updates
  const fragment = document.createDocumentFragment();
  
  // Create category elements
  Object.keys(groupedTabs).sort().forEach(category => {
    const tabs = groupedTabs[category];
    
    // Create group element
    const groupElement = document.createElement('div');
    groupElement.className = 'tab-group';
    
    // Create group header
    const headerElement = document.createElement('div');
    headerElement.className = 'group-header';
    headerElement.innerHTML = `
      <div class="group-title">
        <span>${category}</span>
        <span class="group-count">${tabs.length}</span>
      </div>
      <div class="group-actions">
        <button class="group-collapse-btn">▼</button>
      </div>
    `;
    
    // Create tab list container
    const tabListElement = document.createElement('div');
    tabListElement.className = 'tab-list';
    
    // Add tabs to the list
    tabs.forEach(tab => {
      const tabElement = document.createElement('div');
      tabElement.className = 'tab-item';
      tabElement.dataset.tabId = tab.id;
      
      // Create favicon container with lazy loading
      const faviconContainer = document.createElement('div');
      faviconContainer.className = 'favicon-container';
      
      try {
        const domain = new URL(tab.url).hostname;
        if (domain) {
          faviconContainer.dataset.domain = domain;
          const faviconImg = document.createElement('img');
          faviconImg.className = 'tab-favicon';
          faviconImg.alt = '';
          // Don't set src yet - will be set by Intersection Observer
          faviconContainer.appendChild(faviconImg);
          // Observe the container for lazy loading
          faviconObserver.observe(faviconContainer);
        } else {
          const defaultFavicon = document.createElement('div');
          defaultFavicon.className = 'default-favicon';
          faviconContainer.appendChild(defaultFavicon);
        }
      } catch (e) {
        // If URL parsing fails, use default favicon
        const defaultFavicon = document.createElement('div');
        defaultFavicon.className = 'default-favicon';
        faviconContainer.appendChild(defaultFavicon);
      }
      
      // Create tab info container
      const tabInfo = document.createElement('div');
      tabInfo.className = 'tab-info';
      tabInfo.innerHTML = `
        <div class="tab-title">${tab.title}</div>
        <div class="tab-summary">${tab.summary}</div>
      `;
      
      // Create actions container
      const tabActions = document.createElement('div');
      tabActions.className = 'tab-actions';
      tabActions.innerHTML = `
        <button class="tab-action-btn tab-goto-btn" title="Go to tab">↗</button>
        <button class="tab-action-btn tab-close-btn" title="Close tab">✕</button>
      `;
      
      // Append all elements
      tabElement.appendChild(faviconContainer);
      tabElement.appendChild(tabInfo);
      tabElement.appendChild(tabActions);
      
      tabListElement.appendChild(tabElement);
    });
    
    // Add elements to the group
    groupElement.appendChild(headerElement);
    groupElement.appendChild(tabListElement);
    
    // Add group to fragment
    fragment.appendChild(groupElement);
  });
  
  // Update the container
  tabGroupsContainer.appendChild(fragment);
  
  // Update tab count statistics
  updateStats();
  
  // Add event listeners
  addEventListeners();
}

// Function to update statistics
function updateStats() {
  const totalTabs = Object.keys(tabData).length;
  
  // Calculate inactive tabs (not accessed in the last 30 minutes)
  const now = new Date().getTime();
  const thirtyMinutesAgo = now - (30 * 60 * 1000);
  const inactiveTabs = Object.values(tabData).filter(tab => tab.lastAccessed < thirtyMinutesAgo).length;
  
  // Update the UI
  document.getElementById('total-tabs').textContent = totalTabs;
  document.getElementById('inactive-tabs').textContent = inactiveTabs;
  document.getElementById('groups-count').textContent = categories.size;
}

// Function to add event listeners to the UI elements
function addEventListeners() {
  // Add listeners for tab items
  document.querySelectorAll('.tab-item').forEach(item => {
    // Go to tab when clicked
    item.addEventListener('click', (event) => {
      // Don't trigger if clicking on a button
      if (!event.target.closest('button')) {
        const tabId = parseInt(item.dataset.tabId);
        chrome.tabs.update(tabId, { active: true });
      }
    });
    
    // Go to tab button
    const gotoBtn = item.querySelector('.tab-goto-btn');
    if (gotoBtn) {
      gotoBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const tabId = parseInt(item.dataset.tabId);
        chrome.tabs.update(tabId, { active: true });
      });
    }
    
    // Close tab button
    const closeBtn = item.querySelector('.tab-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const tabId = parseInt(item.dataset.tabId);
        chrome.tabs.remove(tabId);
        delete tabData[tabId];
        chrome.storage.local.set({ tabData });
        item.remove();
        updateStats();
      });
    }
  });
  
  // Add listeners for group headers
  document.querySelectorAll('.group-header').forEach(header => {
    header.addEventListener('click', () => {
      const tabList = header.nextElementSibling;
      const collapseBtn = header.querySelector('.group-collapse-btn');
      
      if (tabList.style.display === 'none') {
        tabList.style.display = 'block';
        collapseBtn.textContent = '▼';
      } else {
        tabList.style.display = 'none';
        collapseBtn.textContent = '▶';
      }
    });
  });
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', initPopup);
