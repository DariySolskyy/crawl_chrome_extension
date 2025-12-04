# crawl_chrome_extension
# Universal Profile Scraper v2.0

A Chrome extension for scraping profile data from authenticated web sessions. Supports REST APIs, GraphQL APIs, and custom implementations across multiple websites.

## 🚀 Features

- **Multi-API Support**: REST, GraphQL, and custom API types
- **Session Management**: Handles tokens, cookies, and session-specific parameters
- **Universal Design**: Works with multiple websites and platforms
- **Batch Processing**: Efficient handling of large profile datasets
- **Rate Limiting**: Built-in delays and retry logic
- **Progress Tracking**: Real-time status updates and progress monitoring
- **Export Functionality**: Results exported as structured JSON

## 📦 Installation

### Method 1: Load Unpacked Extension

1. **Download/Clone** all extension files to a folder
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable "Developer mode"** (toggle in top right)
4. **Click "Load unpacked"** and select your extension folder
5. **Pin the extension** icon to your toolbar for easy access

### Method 2: Manual Installation

1. Create a folder named `universal-profile-scraper`
2. Save all the following files in that folder:
   - `manifest.json`
   - `background.js` (your existing v2 Universal Background Script)
   - `popup.html`
   - `popup.js`
   - `content.js`
   - `injected.js`
3. Follow Method 1 steps 2-5

## 📋 File Structure

```
universal-profile-scraper/
├── manifest.json          # Extension configuration
├── background.js          # Main scraping logic (service worker)
├── popup.html            # Extension popup interface
├── popup.js              # Popup controller logic
├── content.js            # Content script for page interaction
├── injected.js           # Page context script for API interception
└── README.md             # This file
```

## 🛠 Configuration

### Supported Websites

#### 1. SBC Connect (sbcconnect.com)
- **API Type**: REST
- **Pre-configured**: Yes
- **Required**: User session (login to SBC Connect)

#### 2. iGB Live Event (event.igblive.com)
- **API Type**: GraphQL
- **Pre-configured**: Partial (requires session tokens)
- **Required**: Authorization token, Event ID, SHA256 hash

#### 3. Custom Websites
- **API Type**: REST, GraphQL, or Custom
- **Configuration**: Manual setup required

### Session Parameters Setup

For sites like iGB Live Event that require session-specific parameters:

1. **Login** to the target website
2. **Open DevTools** (F12) → Network tab
3. **Navigate** to a profile page
4. **Find the API request** (usually GraphQL or REST)
5. **Extract parameters**:
   - Authorization token from headers
   - SHA256 hash from request payload
   - Event ID from variables
   - Session cookies (if needed)

## 📊 Usage Guide

### Step 1: Configure API Settings

1. **Open the extension popup**
2. **Select target domain** or choose "Custom"
3. **Choose API type** (REST/GraphQL/Custom)
4. **Fill in required parameters**:
   - For REST: API endpoint, event path
   - For GraphQL: Operation name, SHA256 hash, tokens
5. **Save configuration**

### Step 2: Prepare Profile Data

Create a JSON file with profile data:

**For SBC Connect:**
```json
[
  {
    "UserId": "12345",
    "Name": "John Doe",
    "User_url": "https://sbcconnect.com/attendees/12345"
  }
]
```

**For iGB Live Event:**
```json
[
  {
    "personId": "RXZlbnRQZW9wbGVfNDAwNzczNjc=",
    "userId": "VXNlcl8xNzM1NDg0",
    "firstName": "Ryan",
    "lastName": "Lazarus"
  }
]
```

### Step 3: Load and Start Scraping

1. **Upload your JSON file** using the file input
2. **Verify settings** and connection
3. **Click "Start"** to begin scraping
4. **Monitor progress** in real-time
5. **Export results** when complete

## 🔧 Advanced Configuration

### Custom Headers
```json
{
  "Authorization": "Bearer your-token",
  "X-API-Key": "your-api-key",
  "Custom-Header": "value"
}
```

### Dynamic Parameters (GraphQL)
```json
{
  "skipMeetings": false,
  "withEvent": true,
  "includePrivateData": false
}
```

### Rate Limiting
- **Default delay**: 5000ms (5 seconds)
- **Recommended**: 3000-10000ms depending on API
- **Automatic retries**: 2 attempts with exponential backoff

## 📤 Output Format

Results are exported as JSON with this structure:

```json
[
  {
    "inputData": {
      "personId": "...",
      "userId": "...",
      "firstName": "..."
    },
    "apiData": {
      "id": "...",
      "firstName": "...",
      "lastName": "...",
      "jobTitle": "...",
      "organization": "...",
      "biography": "...",
      "socialNetworks": [...],
      "eventFields": {...}
    },
    "timestamp": 1750238611000,
    "index": 0,
    "apiType": "GraphQL",
    "scrapingDetails": {
      "success": true,
      "responseTime": 145
    }
  }
]
```

## 🐛 Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if you're logged into the target website
   - Verify authorization token is current
   - Update session parameters

2. **403 Forbidden**
   - Ensure account has permission to view profiles
   - Check if API endpoint is correct
   - Verify event ID matches current event

3. **Rate Limiting (429)**
   - Increase delay between requests
   - Check daily/hourly API limits
   - Wait before retrying

4. **GraphQL Errors**
   - Verify SHA256 hash is current
   - Check operation name spelling
   - Ensure all required variables are provided

### Debug Steps

1. **Test single profile** first
2. **Check browser console** for detailed errors
3. **Verify network requests** in DevTools
4. **Ensure target tab is open** and active
5. **Update session parameters** if expired

## 🔒 Security & Best Practices

### Security
- Extension uses existing browser sessions (no credential storage)
- All data processed locally
- Exported files contain only scraped data
- Always review data before sharing

### Best Practices
- Use reasonable delays (5+ seconds) between requests
- Don't overwhelm servers with rapid requests
- Respect website terms of service
- Only scrape publicly accessible data
- Clear session tokens when done

### Data Privacy
- Only collect necessary profile information
- Respect privacy settings and permissions
- Follow applicable data protection regulations
- Delete exported data when no longer needed

## 📝 Adding New Websites

To add support for a new website:

1. **Identify API type** (REST/GraphQL/Custom)
2. **Find API endpoints** that return profile data
3. **Determine authentication method**
4. **Add configuration** to extension popup
5. **Test with sample data**

### Example Configuration
```javascript
// Add to popup.js predefined configs
'newsite.com': {
  apiType: 'REST',
  endpoint: 'https://newsite.com/api/profiles',
  headers: {
    'X-API-Key': 'required-api-key'
  }
}
```

## 🆘 Support

For issues, questions, or feature requests:

1. Check this README and troubleshooting section
2. Review browser console for error messages
3. Verify API endpoints are accessible
4. Test with small datasets first

## 📄 License

This extension is for educational and authorized use only. Users are responsible for complying with website terms of service and applicable laws.