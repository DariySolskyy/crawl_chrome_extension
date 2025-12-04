// ================== Universal Background Script ==================

// STANDALONE FUNCTION for making API calls - works with different API types
function makeUniversalApiCall(config, personData) {
  return new Promise((resolve) => {
    console.log(`🔄 Making API call for person:`, personData);
    
    const { apiType, endpoint, headers, method = 'GET' } = config;
    let requestOptions = {
      method: method,
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        ...headers
      },
      credentials: 'include',
      mode: 'cors'
    };

    let url = endpoint;
    let body = null;

    // Handle different API types
    switch (apiType) {
      case 'REST':
        // For REST APIs like SBC Connect
        const userId = personData.UserId || personData.userId || extractUserIdFromUrl(personData.User_url);
        url = `${endpoint}?userId=${userId}&eventPath=${config.eventPath || ''}`;
        break;
        
      case 'GraphQL':
        // For GraphQL APIs like event.igblive.com
        url = endpoint;
        requestOptions.method = 'POST';
        requestOptions.headers['content-type'] = 'application/json';
        
        // Add authorization header if provided
        if (config.authToken) {
          requestOptions.headers['authorization'] = config.authToken;
        }
        
        // Add session cookies if provided
        if (config.sessionCookies) {
          requestOptions.headers['cookie'] = config.sessionCookies;
        }
        
        // Build variables object
        const variables = {
          personId: personData.personId || personData.id,
          userId: personData.userId,
          eventId: config.eventId,
          skipMeetings: false,
          withEvent: true,
          ...config.variables,
          ...(config.dynamicParams || {})
        };
        
        body = JSON.stringify([{
          operationName: config.operationName || "EventPersonDetailsQuery",
          variables: variables,
          extensions: config.extensions || {
            persistedQuery: {
              version: 1,
              sha256Hash: config.sha256Hash
            }
          }
        }]);
        break;
        
      case 'CUSTOM':
        // For custom API implementations
        if (config.urlBuilder) {
          url = config.urlBuilder(endpoint, personData);
        }
        if (config.bodyBuilder && method !== 'GET') {
          body = config.bodyBuilder(personData);
          requestOptions.headers['content-type'] = 'application/json';
        }
        break;
    }

    if (body) {
      requestOptions.body = body;
    }

    console.log(`📡 API URL: ${url}`);
    console.log(`📋 Request options:`, requestOptions);

    fetch(url, requestOptions)
    .then(response => {
      console.log(`✅ API Response status: ${response.status}`);
      
      if (response.ok) {
        return response.json();
      } else if (response.status === 429) {
        throw new Error('RATE_LIMITED');
      } else {
        throw new Error(`HTTP_${response.status}`);
      }
    })
    .then(data => {
      console.log(`🎉 API Success:`, data);
      
      // Extract relevant data based on API type
      let extractedData = null;
      switch (apiType) {
        case 'REST':
          extractedData = data;
          break;
        case 'GraphQL':
          extractedData = data[0]?.data?.person || data.data?.person;
          break;
        case 'CUSTOM':
          extractedData = config.dataExtractor ? config.dataExtractor(data) : data;
          break;
      }
      
      if (extractedData) {
        resolve({ success: true, response: extractedData });
      } else {
        resolve({ success: false, error: 'Invalid response structure' });
      }
    })
    .catch(error => {
      console.log(`💥 API Error:`, error.message);
      
      if (error.message === 'RATE_LIMITED') {
        resolve({ success: false, rateLimited: true, error: 'Rate limited' });
      } else {
        resolve({ success: false, error: error.message });
      }
    });
  });
}

function extractUserIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/attendees\/([^?]+)/);
  return match ? match[1] : null;
}

class UniversalProfileScraper {
  constructor() {
    this.profileData = [];
    this.currentIndex = 0;
    this.results = [];
    this.isRunning = false;
    this.isPaused = false;
    this.delayBetweenRequests = 5000;
    this.maxRetries = 2;
    this.batchSize = 5;
    this.rateLimitDelay = 5000;
    
    // Default configuration for SBC Connect (backward compatibility)
    this.apiConfig = {
      apiType: 'REST',
      endpoint: 'https://sbcconnect.com/api/user/getById',
      eventPath: 'casinobeats-summit-2025',
      headers: {},
      targetDomain: 'sbcconnect.com'
    };
    
    // Predefined configurations for different sites
    this.siteConfigs = {
      'sbcconnect.com': {
        apiType: 'REST',
        endpoint: 'https://sbcconnect.com/api/user/getById',
        eventPath: 'casinobeats-summit-2025',
        headers: {},
        targetDomain: 'sbcconnect.com'
      },
      'event.igblive.com': {
        apiType: 'GraphQL',
        endpoint: 'https://event.igblive.com/api/graphql',
        operationName: 'EventPersonDetailsQuery',
        sha256Hash: '03e6ab3182b93582753b79d92ee01125bd74c7164986e7870be9dcad9080f048',
        eventId: 'RXZlbnRfMjYxMTQwMQ==',
        headers: {
          'x-client-origin': 'event.igblive.com',
          'x-client-platform': 'Event App',
          'x-client-version': '2.309.229'
        },
        targetDomain: 'event.igblive.com',
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: '03e6ab3182b93582753b79d92ee01125bd74c7164986e7870be9dcad9080f048'
          }
        }
      }
    };
  }

  async initialize() {
    const stored = await chrome.storage.local.get([
      'profileData', 'currentIndex', 'results', 'settings', 'apiConfig'
    ]);
    
    this.profileData = stored.profileData || [];
    this.currentIndex = stored.currentIndex || 0;
    this.results = stored.results || [];
    
    if (stored.settings) {
      this.delayBetweenRequests = stored.settings.delay || 5000;
    }
    
    if (stored.apiConfig) {
      this.apiConfig = { ...this.apiConfig, ...stored.apiConfig };
    }
    
    console.log(`Initialized with ${this.profileData.length} profiles, starting from index ${this.currentIndex}`);
  }

  async updateApiConfig(config) {
    // Auto-detect site configuration if domain is provided
    if (config.targetDomain && this.siteConfigs[config.targetDomain]) {
      this.apiConfig = { ...this.siteConfigs[config.targetDomain], ...config };
    } else {
      this.apiConfig = { ...this.apiConfig, ...config };
    }
    
    await chrome.storage.local.set({ apiConfig: this.apiConfig });
    console.log('API configuration updated:', this.apiConfig);
  }

  async loadProfileData(data) {
    if (Array.isArray(data)) {
      this.profileData = data;
    } else if (data.profiles && Array.isArray(data.profiles)) {
      this.profileData = data.profiles;
    } else {
      throw new Error('Invalid profile data format. Expected array or object with profiles property.');
    }
    
    this.currentIndex = 0;
    this.results = [];
    await this.saveState();
    
    console.log(`📥 Loaded ${this.profileData.length} profiles`);
  }

  async scrapeProfile(profileData, retryCount = 0) {
    try {
      console.log(`🎯 Scraping profile:`, profileData);
      
      // Get target tab based on domain
      const targetDomain = this.apiConfig.targetDomain;
      const tabs = await chrome.tabs.query({url: `https://${targetDomain}/*`});
      
      if (tabs.length === 0) {
        throw new Error(`No ${targetDomain} tab found. Please ensure you have ${targetDomain} open in a tab.`);
      }

      const targetTab = tabs[0];
      console.log(`🎯 Using tab: ${targetTab.url}`);

      // Execute API call in target tab context
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: targetTab.id },
        func: makeUniversalApiCall,
        args: [this.apiConfig, profileData]
      });

      if (result && result.result) {
        const data = result.result;
        
        if (data.success) {
          // Process and clean the API response
          const cleanedData = this.processApiResponse(data.response, this.apiConfig.apiType);
          
          return {
            ...cleanedData,
            timestamp: Date.now(),
            index: this.currentIndex
          };
        } else if (data.rateLimited && retryCount < this.maxRetries) {
          console.log(`⏱️ Rate limited, retrying in ${this.rateLimitDelay}ms...`);
          await this.sleep(this.rateLimitDelay);
          return this.scrapeProfile(profileData, retryCount + 1);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      }
      
      throw new Error('No response from content script');
      
    } catch (error) {
      console.error(`💥 Scraping error:`, error);
      
      if (retryCount < this.maxRetries) {
        console.log(`🔄 Retrying... (${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(2000);
        return this.scrapeProfile(profileData, retryCount + 1);
      }
      
      return {
        inputData: profileData,
        error: error.message,
        timestamp: Date.now(),
        index: this.currentIndex
      };
    }
  }

  async startScraping() {
    if (this.isRunning) return;
    
    await this.initialize();
    
    if (this.profileData.length === 0) {
      console.log('No profile data loaded');
      return;
    }
    
    this.isRunning = true;
    this.isPaused = false;
    
    console.log(`Starting to scrape ${this.profileData.length - this.currentIndex} remaining profiles`);
    
    while (this.currentIndex < this.profileData.length && this.isRunning && !this.isPaused) {
      const profileData = this.profileData[this.currentIndex];
      
      console.log(`🔄 Processing ${this.currentIndex + 1}/${this.profileData.length}`);
      
      this.broadcastStatus();
      
      const result = await this.scrapeProfile(profileData);
      this.results.push(result);
      this.currentIndex++;
      
      // Log result summary
      if (result.error) {
        console.log(`❌ Failed: ${result.error}`);
      } else {
        console.log(`✅ Success: Got profile data`);
      }
      
      // Save progress periodically
      if (this.currentIndex % this.batchSize === 0) {
        await this.saveState();
        console.log(`💾 Progress saved: ${this.currentIndex}/${this.profileData.length} completed`);
      }
      
      // Delay before next request
      if (this.currentIndex < this.profileData.length) {
        const delay = this.delayBetweenRequests + Math.random() * 2000;
        console.log(`⏱️ Waiting ${Math.round(delay/1000)}s before next request...`);
        await this.sleep(delay);
      }
    }
    
    await this.saveState();
    this.isRunning = false;
    this.broadcastStatus();
    
    console.log(`Scraping completed! ${this.results.length} profiles processed`);
    await this.exportResults();
  }

  async pauseScraping() {
    this.isPaused = true;
    await this.saveState();
    console.log('Scraping paused');
  }

  async resumeScraping() {
    if (!this.isRunning) {
      this.startScraping();
    } else {
      this.isPaused = false;
      console.log('Scraping resumed');
    }
  }

  async stopScraping() {
    this.isRunning = false;
    this.isPaused = false;
    await this.saveState();
    console.log('Scraping stopped');
  }

  async saveState() {
    await chrome.storage.local.set({
      'profileData': this.profileData,
      'currentIndex': this.currentIndex,
      'results': this.results,
      'apiConfig': this.apiConfig,
      'lastSaved': Date.now()
    });
  }

  async exportResults() {
    const dataStr = JSON.stringify(this.results, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    
    const reader = new FileReader();
    reader.onload = function(event) {
      chrome.downloads.download({
        url: event.target.result,
        filename: `universal_profile_scraping_results_${Date.now()}.json`,
        saveAs: true
      });
    };
    reader.readAsDataURL(blob);
  }

  broadcastStatus() {
    const status = {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalProfiles: this.profileData.length,
      totalResults: this.results.length,
      successCount: this.results.filter(r => !r.error).length,
      errorCount: this.results.filter(r => r.error).length,
      apiConfig: this.apiConfig
    };
    
    chrome.runtime.sendMessage({action: 'statusUpdate', status: status}).catch(() => {});
  }

  processApiResponse(apiData, apiType) {
    // Universal data processor that cleans and flattens API responses
    const result = {};
    
    if (apiType === 'GraphQL' && apiData) {
      // Extract core profile data
      result.id = apiData.id || null;
      result.userId = apiData.userId || null;
      result.firstName = apiData.firstName || null;
      result.lastName = apiData.lastName || null;
      result.jobTitle = apiData.jobTitle || null;
      result.organization = apiData.organization || null;
      result.email = apiData.email || null;
      result.websiteUrl = apiData.websiteUrl || null;
      result.mobilePhone = apiData.mobilePhone || null;
      result.landlinePhone = apiData.landlinePhone || null;
      result.photoUrl = apiData.photoUrl || null;
      result.address = apiData.address || null;
      
      // Process social networks into separate URL columns
      this.processSocialNetworks(apiData.socialNetworks, result);
      
      // Process event fields universally
      if (apiData.withEvent && apiData.withEvent.fields) {
        this.processEventFields(apiData.withEvent.fields, result);
      }
      
    } else if (apiType === 'REST' && apiData) {
      // Process REST API responses (like SBC Connect)
      result.id = apiData.userId || apiData.id || null;
      result.firstName = apiData.userProfile?.firstName || apiData.firstName || null;
      result.lastName = apiData.userProfile?.lastName || apiData.lastName || null;
      result.jobTitle = apiData.userProfile?.jobTitle || apiData.jobTitle || null;
      result.organization = apiData.userProfile?.company || apiData.organization || null;
      result.email = apiData.userProfile?.email || apiData.email || null;
      result.websiteUrl = apiData.userProfile?.website || apiData.websiteUrl || null;
      result.mobilePhone = apiData.userProfile?.phone || apiData.mobilePhone || null;
      result.photoUrl = apiData.userProfile?.avatar || apiData.photoUrl || null;
      
      // Process any additional fields
      if (apiData.userProfile) {
        Object.keys(apiData.userProfile).forEach(key => {
          if (!result.hasOwnProperty(key) && typeof apiData.userProfile[key] !== 'object') {
            result[key] = apiData.userProfile[key];
          }
        });
      }
    }
    
    return result;
  }

  processSocialNetworks(socialNetworks, result) {
    // Initialize all possible social network columns
    const socialPlatforms = {
      'linkedin': 'linkedinUrl',
      'facebook': 'facebookUrl', 
      'instagram': 'instagramUrl',
      'twitter': 'twitterUrl',
      'skype': 'skypeUrl',
      'telegram': 'telegramUrl',
      'youtube': 'youtubeUrl',
      'tiktok': 'tiktokUrl',
      'github': 'githubUrl',
      'discord': 'discordUrl',
      'whatsapp': 'whatsappUrl',
      'snapchat': 'snapchatUrl',
      'pinterest': 'pinterestUrl',
      'reddit': 'redditUrl',
      'tumblr': 'tumblrUrl',
      'medium': 'mediumUrl',
      'behance': 'behanceUrl',
      'dribbble': 'dribbbleUrl'
    };
    
    // Initialize all columns as null
    Object.values(socialPlatforms).forEach(column => {
      result[column] = null;
    });
    
    if (!socialNetworks || !Array.isArray(socialNetworks)) {
      return;
    }
    
    // Process each social network
    socialNetworks.forEach(network => {
      if (!network.type || !network.profile) return;
      
      const platformKey = network.type.toLowerCase();
      const profile = network.profile;
      const columnName = socialPlatforms[platformKey];
      
      if (columnName) {
        result[columnName] = this.generateSocialUrl(platformKey, profile);
      } else {
        // Handle unknown platforms by creating a column
        const unknownColumn = platformKey.toLowerCase() + 'Url';
        result[unknownColumn] = profile; // Just store the profile name for unknown platforms
      }
    });
  }

  generateSocialUrl(platform, profile) {
    // Generate proper URLs for social networks
    const urlMappings = {
      'linkedin': `https://linkedin.com/in/${profile}`,
      'facebook': `https://facebook.com/${profile}`,
      'instagram': `https://instagram.com/${profile}`,
      'twitter': `https://twitter.com/${profile}`,
      'skype': `skype:${profile}?chat`,
      'telegram': `https://t.me/${profile}`,
      'youtube': `https://youtube.com/@${profile}`,
      'tiktok': `https://tiktok.com/@${profile}`,
      'github': `https://github.com/${profile}`,
      'discord': `discord:${profile}`,
      'whatsapp': `https://wa.me/${profile}`,
      'snapchat': `https://snapchat.com/add/${profile}`,
      'pinterest': `https://pinterest.com/${profile}`,
      'reddit': `https://reddit.com/u/${profile}`,
      'tumblr': `https://${profile}.tumblr.com`,
      'medium': `https://medium.com/@${profile}`,
      'behance': `https://behance.net/${profile}`,
      'dribbble': `https://dribbble.com/${profile}`
    };
    
    return urlMappings[platform] || profile;
  }

  processEventFields(fields, result) {
    // Universal field processor that handles all GraphQL field types
    if (!fields || !Array.isArray(fields)) {
      return;
    }
    
    fields.forEach(field => {
      if (!field.name || !field.isVisible) return;
      
      const fieldName = field.name;
      let fieldValue = null;
      
      // Process different field types
      switch (field.__typename) {
        case 'Core_SelectField':
          // Single select field - extract text value
          if (field.value && field.value.text) {
            fieldValue = field.value.text;
          }
          break;
          
        case 'Core_MultipleSelectField':
          // Multiple select field - extract array of text values
          if (field.values && Array.isArray(field.values)) {
            fieldValue = field.values
              .filter(v => v.text)
              .map(v => v.text);
            
            // If empty array, set to null for cleaner CSV
            if (fieldValue.length === 0) {
              fieldValue = null;
            }
          }
          break;
          
        case 'Core_TextField':
          // Text field - extract text content
          if (field.value && field.value.text) {
            fieldValue = field.value.text;
          } else if (typeof field.value === 'string') {
            fieldValue = field.value;
          }
          break;
          
        case 'Core_NumberField':
          // Number field - extract numeric value
          if (field.value !== null && field.value !== undefined) {
            fieldValue = field.value;
          }
          break;
          
        case 'Core_BooleanField':
          // Boolean field - extract boolean value
          if (field.value !== null && field.value !== undefined) {
            fieldValue = field.value;
          }
          break;
          
        case 'Core_DateField':
          // Date field - extract date value
          if (field.value) {
            fieldValue = field.value;
          }
          break;
          
        default:
          // Unknown field type - try to extract any value
          if (field.value) {
            if (typeof field.value === 'object' && field.value.text) {
              fieldValue = field.value.text;
            } else if (typeof field.value !== 'object') {
              fieldValue = field.value;
            }
          }
          break;
      }
      
      // Clean field name for CSV compatibility
      const cleanFieldName = this.cleanFieldName(fieldName);
      result[cleanFieldName] = fieldValue;
    });
  }

  cleanFieldName(fieldName) {
    // Clean field names to be CSV-friendly while keeping them readable
    return fieldName
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();                  // Remove leading/trailing spaces
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize scraper
const scraper = new UniversalProfileScraper();

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'loadProfiles':
      scraper.loadProfileData(request.data).then(() => {
        sendResponse({status: 'loaded', count: scraper.profileData.length});
      }).catch(error => {
        console.error('Error loading profiles:', error);
        sendResponse({status: 'error', error: error.message});
      });
      break;
      
    case 'updateApiConfig':
      scraper.updateApiConfig(request.config).then(() => {
        sendResponse({status: 'updated'});
      });
      break;
      
    case 'startScraping':
      scraper.startScraping();
      sendResponse({status: 'started'});
      break;
      
    case 'pauseScraping':
      scraper.pauseScraping();
      sendResponse({status: 'paused'});
      break;
      
    case 'resumeScraping':
      scraper.resumeScraping();
      sendResponse({status: 'resumed'});
      break;
      
    case 'stopScraping':
      scraper.stopScraping().then(() => {
        sendResponse({status: 'stopped'});
      });
      break;
      
    case 'getStatus':
      sendResponse({
        isRunning: scraper.isRunning,
        isPaused: scraper.isPaused,
        currentIndex: scraper.currentIndex,
        totalProfiles: scraper.profileData.length,
        totalResults: scraper.results.length,
        successCount: scraper.results.filter(r => !r.error).length,
        errorCount: scraper.results.filter(r => r.error).length,
        apiConfig: scraper.apiConfig
      });
      break;
      
    case 'exportResults':
      scraper.exportResults().then(() => {
        sendResponse({status: 'exported'});
      });
      break;
      
    case 'updateSettings':
      chrome.storage.local.set({settings: request.settings}).then(() => {
        scraper.delayBetweenRequests = request.settings.delay || 5000;
        sendResponse({status: 'updated'});
      });
      break;
  }
  
  return true;
});