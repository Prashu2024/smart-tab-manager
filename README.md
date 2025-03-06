 # Smart Tab Manager & Organizer

A Chrome extension that uses AI-powered tab management to help you organize, group, and summarize your browser tabs.

![Smart Tab Manager & Organizer](icons/icon-128.png)

## Features

- **Automatic Tab Categorization**: Automatically categorizes your tabs into groups like Development, Documents, Email, Entertainment, and Reading
- **Tab Summaries**: Provides concise summaries of tab content for quick identification
- **Inactive Tab Management**: Identifies and helps you close tabs that haven't been used recently
- **Search Functionality**: Quickly find tabs across all your open windows
- **Group Collapsing**: Collapse and expand tab groups for better organization

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store (link to be added)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your browser toolbar

## Usage

1. Click on the extension icon in your browser toolbar to open the popup
2. Your tabs will be automatically analyzed and categorized
3. Use the search bar to find specific tabs
4. Click on a tab in the list to navigate to it
5. Use the "Close Inactive" button to identify and close tabs you haven't used recently
6. Click on group headers to collapse or expand groups

## Technical Details

The extension is built using:
- JavaScript
- Chrome Extension Manifest V3
- Chrome APIs (tabs, storage, scripting)

### Architecture

- **Background Script**: Handles tab monitoring, analysis, and categorization
- **Popup**: Provides the user interface for tab management
- **Content Script**: Extracts detailed page content for better analysis

## Development

### Prerequisites
- Node.js and npm

### Setup
1. Clone the repository
```
git clone https://github.com/Prashu2024/smart-tab-manager.git
cd smart-tab-manager
```

2. Install dependencies
```
npm install
```

### Building
The extension doesn't require a build step, but you can use tools like webpack for bundling if needed.

### Testing
1. Load the extension in Chrome using Developer mode
2. Make changes to the code
3. Reload the extension to test changes

## Future Enhancements

- Integration with AI services for better tab categorization and summarization
- Tab grouping in Chrome's native tab groups
- Customizable categories and organization rules
- Tab usage statistics and insights
- Sync across devices

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
