// Content script runs in the context of web pages
// This will handle extracting detailed page content for better analysis

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractContent") {
    // Extract detailed page content
    const pageContent = extractPageContent();
    sendResponse({ content: pageContent });
  }
  return true; // Indicates async response
});

// Function to extract rich content from the page
function extractPageContent() {
  // Get page metadata
  const title = document.title;
  const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
  const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || '';
  
  // Get main content - this is a simple implementation
  // For production, you'd want more sophisticated content extraction
  
  // Try to get content from main article elements first
  let mainContent = '';
  const articleElements = document.querySelectorAll('article, [role="main"], main, .main-content');
  
  if (articleElements.length > 0) {
    // Use the first article element's text
    mainContent = articleElements[0].innerText;
  } else {
    // Fall back to extracting text from paragraphs
    const paragraphs = Array.from(document.querySelectorAll('p')).slice(0, 10);
    mainContent = paragraphs.map(p => p.innerText).join(' ');
  }
  
  // Get headings for structure
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .slice(0, 5)
    .map(h => h.innerText);
  
  // Extract links
  const links = Array.from(document.querySelectorAll('a[href]'))
    .slice(0, 20)
    .map(a => ({
      text: a.innerText.trim(),
      href: a.href
    }))
    .filter(link => link.text && !link.href.startsWith('javascript:'));
  
  return {
    title,
    url: window.location.href,
    metaDescription,
    metaKeywords,
    headings,
    mainContent: mainContent.substring(0, 3000), // Limit to 3000 chars
    links,
    timestamp: new Date().toISOString()
  };
}
