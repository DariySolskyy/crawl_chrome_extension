class UniversalPopupController {
  constructor() {
    this.initializeElements();
    this.bindEvents();
    this.loadSettings();
    this.updateStatus();
    this.startStatusPolling();
  }

  initializeElements() {
    this.statusDiv = document.getElementById('status');
    this.progressBar = document.getElementById('progressBar');
    this.startBtn = document.getElementById('startBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.exportBtn = document.getElementById('exportBtn');
    this.profileFile = document.getElementById('profileFile');
    
    // API Config elements
    this.apiType = document.getElementById('apiType');
    this.targetDomain = document.getElementById('targetDomain');
    this.customDomain = document.getElementById('customDomain');
    this.apiEndpoint = document.getElementById('apiEndpoint');
    this.eventPath = document.getElementById('eventPath');
    this.operationName = document.getElementById('operationName');
    this.sha256Hash = document.getElementById('sha256Hash');
    this.eventId = document.getElementById('eventId');
    this.clientVersion = document.getElementById('clientVersion');
    this.authToken = document.getElementById('authToken');
    this.sessionCookies = document.getElementById('sessionCookies');
    this.dynamicParams = document.getElementById('dynamicParams');
    this.customHeaders = document.getElementById('customHeaders');
    this.saveApiConfig = document.getElementById('saveApiConfig');
    
    // Settings
    this.delay = document.getElementById('delay');
    this.saveSettings = document.getElementById('saveSettings');
    
    // Config sections
    this.restConfig = document.getElementById('restConfig');
    this.graphqlConfig = document.getElementById('graphqlConfig');
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.startScraping());
    this.pauseBtn.addEventListener('click', () => this.pauseScraping());
    this.stopBtn.addEventListener('click', () => this.stopScraping());
    this.exportBtn.addEventListener('click', () => this.exportResults());
    this.profileFile.addEventListener('change', (e) => this.loadProfiles(e));
    this.saveApiConfig.addEventListener('click', () => this.saveApiConfiguration());
    this.saveSettings.addEventListener('click', () => this.saveGeneralSettings());
    
    // API type change handler
    this.apiType.addEventListener('change', () => this.updateConfigSections());
    this.targetDomain.addEventListener('change', () => this.loadPredefinedConfig());
  }

  updateConfigSections() {
    const apiType = this.apiType.value;
    
    // Hide all config sections
    this.restConfig.classList.remove('active');
    this.graphqlConfig.classList.remove('active');
    
    // Show relevant sections
    if (apiType === 'REST') {
      this.restConfig.classList.add('active');
    } else if (apiType === 'GraphQL') {
      this.graphqlConfig.classList.add('active');
    }
  }

  loadPredefinedConfig() {
    const domain = this.targetDomain.value;
    
    const configs = {
      'sbcconnect.com': {
        apiType: 'REST',
        endpoint: 'https://sbcconnect.com/api/user/getById',
        eventPath: 'casinobeats-summit-2025'
      },
      'event.igblive.com': {
        apiType: 'GraphQL',
        endpoint: 'https://event.igblive.com/api/graphql',
        operationName: 'EventPersonDetailsQuery',
        sha256Hash: '03e6ab3182b93582753b79d92ee01125bd74c7164986e7870be9dcad9080f048',
        eventId: 'RXZlbnRfMjYxMTQwMQ==',
        clientVersion: '2.309.229'
      }
    };
    
    if (configs[domain]) {
      const config = configs[domain];
      this.apiType.value = config.apiType;
      this.apiEndpoint.value = config.endpoint;
      
      if (config.eventPath) this.eventPath.value = config.eventPath;
      if (config.operationName) this.operationName.value = config.operationName;
      if (config.sha256Hash) this.sha256Hash.value = config.sha256Hash;
      if (config.eventId) this.eventId.value = config.eventId;
      if (config.clientVersion) this.clientVersion.value = config.clientVersion;
      
      this.updateConfigSections();
    }
  }

  async loadSettings() {
    const stored = await chrome.storage.local.get(['settings', 'apiConfig']);
    
    if (stored.settings) {
      this.delay.value = stored.settings.delay || 5000;
    }
    
    if (stored.apiConfig) {
      const config = stored.apiConfig;
      this.apiType.value = config.apiType || 'REST';
      this.apiEndpoint.value = config.endpoint || '';
      this.eventPath.value = config.eventPath || '';
      this.operationName.value = config.operationName || '';
      this.sha256Hash.value = config.sha256Hash || '';
      this.eventId.value = config.eventId || '';
      this.clientVersion.value = config.clientVersion || '';
      this.authToken.value = config.authToken || '';
      this.sessionCookies.value = config.sessionCookies || '';
      this.dynamicParams.value = config.dynamicParams ? JSON.stringify(config.dynamicParams) : '';
      this.targetDomain.value = config.targetDomain || '';
      
      if (config.headers) {
        this.customHeaders.value = JSON.stringify(config.headers);
      }
      
      this.updateConfigSections();
    }
  }

  async saveApiConfiguration() {
    try {
      const config = {
        apiType: this.apiType.value,
        endpoint: this.apiEndpoint.value,
        targetDomain: this.targetDomain.value === 'custom' ? this.customDomain.value : this.targetDomain.value
      };

      // Add type-specific config
      if (config.apiType === 'REST') {
        config.eventPath = this.eventPath.value;
      } else if (config.apiType === 'GraphQL') {
        config.operationName = this.operationName.value;
        config.sha256Hash = this.sha256Hash.value;
        config.eventId = this.eventId.value;
        config.authToken = this.authToken.value;
        config.sessionCookies = this.sessionCookies.value;
        
        // Parse dynamic parameters
        if (this.dynamicParams.value.trim()) {
          try {
            config.dynamicParams = JSON.parse(this.dynamicParams.value);
          } catch (e) {
            throw new Error('Invalid JSON format for dynamic parameters');
          }
        }
        
        if (this.clientVersion.value) {
          config.headers = {
            'x-client-version': this.clientVersion.value,
            'x-client-platform': 'Event App',
            'x-client-origin': config.targetDomain
          };
        }
        
        // Add authorization header if provided
        if (config.authToken) {
          config.headers = {
            ...config.headers,
            'authorization': config.authToken
          };
        }
        
        config.extensions = {
          persistedQuery: {
            version: 1,
            sha256Hash: config.sha256Hash
          }
        };
      }

      // Add custom headers
      if (this.customHeaders.value.trim()) {
        try {
          const customHeaders = JSON.parse(this.customHeaders.value);
          config.headers = { ...config.headers, ...customHeaders };
        } catch (e) {
          throw new Error('Invalid JSON format for custom headers');
        }
      }

      chrome.runtime.sendMessage({
        action: 'updateApiConfig',
        config: config
      }, (response) => {
        if (response.status === 'updated') {
          this.showMessage('API configuration saved!');
        }
      });
    } catch (error) {
      this.showMessage('Error: ' + error.message);
    }
  }

  async saveGeneralSettings() {
    const settings = {
      delay: parseInt(this.delay.value)
    };
    
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: settings
    }, (response) => {
      if (response.status === 'updated') {
        this.showMessage('Settings saved!');
      }
    });
  }

  async loadProfiles(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      let profiles = [];

      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        profiles = Array.isArray(data) ? data : data.profiles || data.data || [];
      } else if (file.name.endsWith('.csv')) {
        // Basic CSV parsing - you might want to use a proper CSV parser
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        profiles = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const profile = {};
          headers.forEach((header, index) => {
            profile[header] = values[index] || '';
          });
          return profile;
        });
      } else {
        // Assume text file with one profile identifier per line
        profiles = text.split('\n')
          .filter(line => line.trim())
          .map(line => ({ profileId: line.trim() }));
      }

      chrome.runtime.sendMessage({
        action: 'loadProfiles',
        data: profiles
      }, (response) => {
        if (response.status === 'loaded') {
          this.showMessage(`Loaded ${response.count} profiles`);
          this.updateStatus();
        } else {
          this.showMessage('Error: ' + response.error);
        }
      });
    } catch (error) {
      this.showMessage('Error loading file: ' + error.message);
    }
  }

  startScraping() {
    chrome.runtime.sendMessage({action: 'startScraping'}, (response) => {
      this.showMessage('Scraping started');
    });
  }

  pauseScraping() {
    chrome.runtime.sendMessage({action: 'pauseScraping'}, (response) => {
      this.showMessage('Scraping paused');
    });
  }

  stopScraping() {
    chrome.runtime.sendMessage({action: 'stopScraping'}, (response) => {
      this.showMessage('Scraping stopped');
    });
  }

  exportResults() {
    chrome.runtime.sendMessage({action: 'exportResults'}, (response) => {
      this.showMessage('Results exported');
    });
  }

  updateStatus() {
    chrome.runtime.sendMessage({action: 'getStatus'}, (response) => {
      if (response) {
        let statusText = 'Ready';
        let progress = 0;

        if (response.isRunning) {
          statusText = response.isPaused ? 'Paused' : 'Running';
          progress = response.totalProfiles > 0 ? (response.currentIndex / response.totalProfiles) * 100 : 0;
        }

        this.statusDiv.innerHTML = `
          <strong>Status:</strong> ${statusText}<br>
          <strong>Progress:</strong> ${response.currentIndex}/${response.totalProfiles}<br>
          <strong>Success:</strong> ${response.successCount || 0} | <strong>Errors:</strong> ${response.errorCount || 0}<br>
          <strong>API Type:</strong> ${response.apiConfig?.apiType || 'Not configured'}<br>
          <strong>Target:</strong> ${response.apiConfig?.targetDomain || 'Not set'}
        `;

        this.progressBar.style.width = progress + '%';
      }
    });
  }

  startStatusPolling() {
    setInterval(() => {
      this.updateStatus();
    }, 1000);
  }

  showMessage(message) {
    // Simple console log for now - could implement toast notifications
    console.log(message);
    
    // Show in status temporarily
    const originalHTML = this.statusDiv.innerHTML;
    this.statusDiv.innerHTML = `<strong style="color: blue;">${message}</strong>`;
    setTimeout(() => {
      this.updateStatus();
    }, 2000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new UniversalPopupController();
});