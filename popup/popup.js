// Store for our tab data
let tabData = {};
let categories = new Set();

// Function to initialize the popup
async function initPopup() {
  // Retrieve tab data from background script
  chrome.runtime.sendMessage({ action: "getTabData" }, async (response) => {
    if (response && response.tabData) {
      tabData = response.tabData;
      
      // If no data, analyze tabs now
      if (Object.keys(tabData).length === 0) {
        await analyzeTabs();
      } else {
        renderTabGroups();
      }
    } else {
      console.error("Failed to get tab data");
    }
  });
  
  // Listen for tab analyzed messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "tabAnalyzed") {
      // Refresh the data and re-render
      chrome.runtime.sendMessage({ action: "getTabData" }, (response) => {
        if (response && response.tabData) {
          tabData = response.tabData;
          renderTabGroups();
        }
      });
    }
    return true; // Keep the message channel open for async responses
  });
  
  // Set up event listeners
  document.getElementById('analyze-btn').addEventListener('click', analyzeTabs);
  document.getElementById('close-inactive-btn').addEventListener('click', closeInactiveTabs);
  document.getElementById('search-input').addEventListener('input', handleSearch);
}

// Function to analyze all tabs
async function analyzeTabs() {
  const tabs = await chrome.tabs.query({});
  
  document.getElementById('analyze-btn').textContent = "Analyzing...";
  document.getElementById('analyze-btn').disabled = true;
  
  // This would normally be handled in the background script
  // But for the prototype, we'll simulate it
  setTimeout(() => {
    document.getElementById('analyze-btn').textContent = "Analyze Tabs";
    document.getElementById('analyze-btn').disabled = false;
    renderTabGroups();
  }, 1500);
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
      
      // Get favicon from URL
      const faviconUrl = `chrome://favicon/${tab.url}`;
      
      tabElement.innerHTML = `
        <img class="tab-favicon" src="${faviconUrl}" alt="">
        <div class="tab-info">
          <div class="tab-title">${tab.title}</div>
          <div class="tab-summary">${tab.summary}</div>
        </div>
        <div class="tab-actions">
          <button class="tab-action-btn tab-goto-btn" title="Go to tab">↗</button>
          <button class="tab-action-btn tab-close-btn" title="Close tab">✕</button>
        </div>
      `;
      
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
