// Universal injected script that runs in page context
(function() {
  'use strict';
  
  console.log('Universal Profile Scraper injected script loaded for:', window.location.hostname);
  
  // Store original functions
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;
  
  // Enhanced fetch override for universal API support
  window.fetch = function(...args) {
    const [url, options = {}] = args;
    
    // Add anti-detection headers for different API endpoints
    if (url.includes('/api/user/getById') || 
        url.includes('/api/graphql') || 
        url.includes('/api/')) {
      
      options.headers = {
        ...options.headers,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      };
      
      // Add domain-specific headers
      if (window.location.hostname.includes('sbcconnect.com')) {
        options.headers = {
          ...options.headers,
          'Sec-Ch-Ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Priority': 'u=1, i'
        };
      }
      
      if (window.location.hostname.includes('event.igblive.com')) {
        options.headers = {
          ...options.headers,
          'sec-ch-ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'x-client-origin': 'event.igblive.com',
          'x-client-platform': 'Event App'
        };
      }
      
      // Ensure credentials are included
      options.credentials = options.credentials || 'include';
      options.referrerPolicy = options.referrerPolicy || 'strict-origin-when-cross-origin';
    }
    
    return originalFetch.apply(this, [url, options]);
  };
  
  // Enhanced XMLHttpRequest override
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;
    
    xhr.open = function(method, url, ...args) {
      this._method = method;
      this._url = url;
      return originalOpen.apply(this, [method, url, ...args]);
    };
    
    xhr.send = function(data) {
      // Add anti-detection headers for API requests
      if (this._url && (this._url.includes('/api/user/getById') || 
                       this._url.includes('/api/graphql') || 
                       this._url.includes('/api/'))) {
        
        this.setRequestHeader('Accept', 'application/json, text/plain, */*');
        this.setRequestHeader('Accept-Language', 'en-GB,en-US;q=0.9,en;q=0.8');
        this.setRequestHeader('Cache-Control', 'no-cache');
        this.setRequestHeader('Pragma', 'no-cache');
        this.setRequestHeader('Sec-Fetch-Dest', 'empty');
        this.setRequestHeader('Sec-Fetch-Mode', 'cors');
        this.setRequestHeader('Sec-Fetch-Site', 'same-origin');
        
        // Domain-specific headers
        if (window.location.hostname.includes('sbcconnect.com')) {
          this.setRequestHeader('Sec-Ch-Ua', '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"');
          this.setRequestHeader('Sec-Ch-Ua-Mobile', '?0');
          this.setRequestHeader('Sec-Ch-Ua-Platform', '"macOS"');
          this.setRequestHeader('Priority', 'u=1, i');
        }
        
        if (window.location.hostname.includes('event.igblive.com')) {
          this.setRequestHeader('sec-ch-ua', '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"');
          this.setRequestHeader('sec-ch-ua-mobile', '?0');
          this.setRequestHeader('sec-ch-ua-platform', '"macOS"');
          this.setRequestHeader('x-client-origin', 'event.igblive.com');
          this.setRequestHeader('x-client-platform', 'Event App');
        }
        
        // Include credentials
        this.withCredentials = true;
      }
      
      return originalSend.apply(this, [data]);
    };
    
    return xhr;
  };
  
  // Add utility functions to window for debugging
  window.universalScraperUtils = {
    checkApiEndpoints: function() {
      console.log('Current domain:', window.location.hostname);
      console.log('Available cookies:', document.cookie);
      console.log('Local storage:', localStorage);
      console.log('Session storage:', sessionStorage);
    },
    
    testApiCall: function(url, options = {}) {
      console.log('Testing API call to:', url);
      return fetch(url, {
        ...options,
        credentials: 'include'
      }).then(response => {
        console.log('Test response:', response.status, response.statusText);
        return response.json();
      }).then(data => {
        console.log('Test data:', data);
        return data;
      }).catch(error => {
        console.error('Test error:', error);
        return error;
      });
    }
  };
  
  console.log('Universal Profile Scraper page context ready. Utils available at window.universalScraperUtils');
})();