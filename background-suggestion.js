// Function to analyze and categorize a tab
async function analyzeTab(tab) {
  const { id, url, title } = tab;
  
  // Skip special browser pages, settings, etc.
  if (!url || url.startsWith('chrome:') || url.startsWith('chrome-extension:') || url.startsWith('about:')) {
    return;
  }
  
  // Get page content
  const content = await getPageContent(id);
  
  // Call LLM API for analysis
  const analysis = await analyzeThroughLLM(content);
  
  // Store the tab data with LLM analysis
  tabData[id] = {
    id,
    url,
    title,
    category: analysis.category,
    summary: analysis.summary,
    topics: analysis.topics,
    importance: analysis.importance,
    lastAccessed: new Date().getTime(),
    content: content
  };
  
  // Save to storage for persistence
  chrome.storage.local.set({ tabData });
  
  // Notify popup if it's open
  chrome.runtime.sendMessage({ action: "tabAnalyzed", tabId: id });
}

// Example function to analyze tab content using an LLM API
async function analyzeThroughLLM(tabContent) {
  const API_KEY = 'your-api-key'; // Store securely, not hardcoded
  const API_URL = 'https://api.openai.com/v1/completions'; // Replace with actual API endpoint
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-analysis-001',
        prompt: `Analyze the following web page content. 
                Title: ${tabContent.title}
                Description: ${tabContent.metaDescription}
                Content: ${tabContent.bodyText.substring(0, 500)}
                
                Provide a JSON response with:
                1. A category for this page (e.g., Development, Research, Shopping, Entertainment, News, Social, Productivity)
                2. A brief 1-sentence summary of what the page is about
                3. Key topics or entities mentioned
                4. Estimated importance (high/medium/low)`,
        max_tokens: 200,
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return {
      category: data.category,
      summary: data.summary,
      topics: data.key_topics || [],
      importance: data.importance
    };
  } catch (error) {
    console.error('Error calling LLM API:', error);
    // Fallback to basic categorization
    return {
      category: 'Uncategorized',
      summary: tabContent.title || 'Unknown page',
      topics: [],
      importance: 'medium'
    };
  }
}
