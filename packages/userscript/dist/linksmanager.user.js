// ==UserScript==
// @name         Links Manager
// @namespace    https://github.com/userscript-linksmanager
// @version      1.0.0
// @description  Collect and manage links on webpages with a backend API
// @author       Links Manager Team
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      localhost
// @connect      *
// @run-at       document-idle
// ==/UserScript==

/**
 * Links Manager Userscript
 * 
 * Main entry point for the userscript.
 * Collects links on the page and displays information from the backend API.
 */

(function() {
  'use strict';

  // =================================================================
  // EMBEDDED CONFIG (from config.js)
  // =================================================================
  
  /**
 * Links Manager Userscript - Configuration
 * 
 * Customize the behavior of the userscript here.
 * This file contains all configurable options.
 */

const LinksManagerConfig = {
  // =================================================================
  // API CONFIGURATION
  // =================================================================
  
  /**
   * Backend API URL
   * Change this to your server's address
   */
  apiUrl: 'http://localhost:3000',

  /**
   * Enable WebSocket connection for real-time updates
   */
  enableWebSocket: true,

  /**
   * Batch size for submitting links to the backend
   */
  batchSize: 10,

  /**
   * Delay between batch submissions (ms)
   */
  batchDelay: 100,

  // =================================================================
  // LINK FILTERING
  // =================================================================
  
  /**
   * Domains to include (empty array = all domains)
   * Example: ['example.com', 'test.org']
   */
  includeDomains: [],

  /**
   * Domains to exclude
   * Example: ['google.com', 'facebook.com']
   */
  excludeDomains: [],

  /**
   * Path patterns to include (regex patterns)
   * Example: [/^\/products\//, /^\/items\//]
   */
  includePathPatterns: [],

  /**
   * Path patterns to exclude (regex patterns)
   * Example: [/^\/login/, /^\/logout/]
   */
  excludePathPatterns: [],

  /**
   * Minimum path depth to include
   * Example: 1 means /path is included, / is not
   */
  minPathDepth: 0,

  // =================================================================
  // UI CONFIGURATION
  // =================================================================
  
  /**
   * Position of the badge relative to the link
   * Options: 'after', 'before'
   */
  badgePosition: 'after',

  /**
   * Enable dark mode (auto-detected if null)
   */
  darkMode: null,

  /**
   * Animation duration in milliseconds
   */
  animationDuration: 200,

  /**
   * Show tooltips on hover
   */
  showTooltips: true,

  /**
   * Z-index for dropdown menus
   */
  zIndex: 999999,

  // =================================================================
  // STATUS CONFIGURATION
  // =================================================================
  
  /**
   * Status definitions with colors and icons
   */
  statuses: {
    new: {
      label: 'New',
      color: '#3b82f6',
      icon: 'sparkles',
      description: 'Newly discovered link'
    },
    processed: {
      label: 'Processed',
      color: '#22c55e',
      icon: 'check',
      description: 'Link has been processed'
    },
    good: {
      label: 'Good',
      color: '#10b981',
      icon: 'thumb-up',
      description: 'Link marked as good'
    },
    bad: {
      label: 'Bad',
      color: '#ef4444',
      icon: 'thumb-down',
      description: 'Link marked as bad'
    },
    pending: {
      label: 'Pending',
      color: '#f59e0b',
      icon: 'clock',
      description: 'Awaiting review'
    }
  },

  /**
   * Priority levels
   */
  priorities: [
    { value: 0, label: 'None', color: '#6b7280' },
    { value: 1, label: 'Low', color: '#3b82f6' },
    { value: 2, label: 'Medium', color: '#f59e0b' },
    { value: 3, label: 'High', color: '#ef4444' },
    { value: 4, label: 'Critical', color: '#dc2626' }
  ],

  // =================================================================
  // TOPBAR CONFIGURATION
  // =================================================================
  
  /**
   * Enable the topbar feature
   */
  enableTopbar: true,

  /**
   * Domains where the topbar should appear (empty = all domains)
   * Example: ['example.com', 'test.org']
   */
  topbarDomains: [],

  /**
   * Exclude domains from showing topbar
   * Example: ['google.com', 'facebook.com']
   */
  topbarExcludeDomains: [],

  /**
   * Default collapsed state of the topbar
   */
  topbarCollapsed: false,

  /**
   * Remember topbar collapsed state across pages
   */
  topbarRememberState: true,

  /**
   * Topbar position: 'top' or 'bottom'
   */
  topbarPosition: 'top',

  /**
   * Keyboard shortcuts configuration
   */
  shortcuts: {
    // Toggle topbar visibility
    toggleTopbar: { key: 'l', ctrlKey: true, shiftKey: true },
    // Cycle through priorities
    cyclePriority: { key: 'p', ctrlKey: true, shiftKey: true },
    // Cycle through statuses
    cycleStatus: { key: 's', ctrlKey: true, shiftKey: true },
    // Toggle crawl state
    toggleCrawl: { key: 'c', ctrlKey: true, shiftKey: true }
  },

  /**
   * Enable keyboard shortcuts
   */
  enableShortcuts: true,

  // =================================================================
  // CRAWL STATE CONFIGURATION
  // =================================================================
  
  /**
   * Crawl state definitions
   */
  crawlStates: {
    idle: { label: 'Idle', color: '#6b7280', icon: 'pause' },
    queued: { label: 'Queued', color: '#f59e0b', icon: 'clock' },
    crawling: { label: 'Crawling', color: '#3b82f6', icon: 'refresh' },
    completed: { label: 'Completed', color: '#22c55e', icon: 'check' },
    failed: { label: 'Failed', color: '#ef4444', icon: 'alert' }
  },

  // =================================================================
  // CALLBACKS
  // =================================================================
  
  /**
   * Called when a link is clicked in the dropdown
   */
  onLinkClick: null,

  /**
   * Called when link status changes
   */
  onStatusChange: null,

  /**
   * Called on error
   */
  onError: null
};

  // =================================================================
  // EMBEDDED API (from api.js)
  // =================================================================
  
  /**
 * Links Manager Userscript - API Service
 * 
 * Handles all communication with the backend server.
 */

const LinksManagerAPI = {
  config: null,

  /**
   * Initialize the API service
   */
  init(config) {
    this.config = config;
  },

  /**
   * Make an API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[LinksManager] API Error:', error);
      throw error;
    }
  },

  /**
   * Submit links in batch
   */
  async submitLinks(urls) {
    return this.request('/api/links/batch', {
      method: 'POST',
      body: JSON.stringify({ urls })
    });
  },

  /**
   * Get link details by ID
   */
  async getLink(id) {
    return this.request(`/api/links/${id}`);
  },

  /**
   * Update link status
   */
  async updateStatus(id, status) {
    return this.request(`/api/links/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  /**
   * Update link priority
   */
  async updatePriority(id, priority) {
    return this.request(`/api/links/${id}/priority`, {
      method: 'PUT',
      body: JSON.stringify({ priority })
    });
  },

  /**
   * Update link description
   */
  async updateDescription(id, description) {
    return this.request(`/api/links/${id}/description`, {
      method: 'PUT',
      body: JSON.stringify({ description })
    });
  },

  /**
   * Toggle link deleted status
   */
  async toggleDeleted(id, isDeleted) {
    return this.request(`/api/links/${id}/delete`, {
      method: 'PUT',
      body: JSON.stringify({ is_deleted: isDeleted })
    });
  },

  /**
   * Get current page info by URL
   */
  async getPageInfo(url) {
    return this.request('/api/page/info', {
      method: 'POST',
      body: JSON.stringify({ url })
    });
  },

  /**
   * Get domain statistics
   */
  async getDomainStats(domain) {
    return this.request(`/api/domains/${encodeURIComponent(domain)}/stats`);
  },

  /**
   * Update crawl state for a link
   */
  async updateCrawlState(id, crawlState) {
    return this.request(`/api/links/${id}/crawl-state`, {
      method: 'PUT',
      body: JSON.stringify({ crawl_state: crawlState })
    });
  },

  /**
   * Get total captured pages count
   */
  async getTotalPagesCount() {
    return this.request('/api/stats/total-pages');
  }
};

  // =================================================================
  // EMBEDDED ICONS (from icons.js)
  // =================================================================
  
  /**
 * Links Manager Userscript - Icons
 * 
 * SVG icons used throughout the UI.
 * Add or modify icons here as needed.
 */

const LinksManagerIcons = {
  // Loading spinner
  spinner: `<svg class="lm-icon lm-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
  </svg>`,

  // Status icons
  sparkles: `<svg class="lm-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
    <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
  </svg>`,

  check: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,

  'thumb-up': `<svg class="lm-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777z"/>
  </svg>`,

  'thumb-down': `<svg class="lm-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.73 5.25h1.035A7.465 7.465 0 0118 9.375a7.465 7.465 0 01-1.235 4.125h-.148c-.806 0-1.534.446-2.031 1.08a9.04 9.04 0 01-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 00-.322 1.672V21a.75.75 0 01-.75.75 2.25 2.25 0 01-2.25-2.25c0-1.152.26-2.243.723-3.218.266-.558-.107-1.282-.725-1.282H3.622c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 011.5 12c0-2.848.992-5.464 2.649-7.521.388-.482.987-.729 1.605-.729H9.77a4.5 4.5 0 011.423.23l3.114 1.04a4.5 4.5 0 001.423.23z"/>
  </svg>`,

  clock: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>`,

  // Action icons
  trash: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>`,

  edit: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`,

  restore: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
  </svg>`,

  chevronDown: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`,

  externalLink: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`,

  info: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>`,

  star: `<svg class="lm-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"/>
  </svg>`,

  starOutline: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>`,

  close: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,

  // Topbar icons
  chevronUp: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>`,

  menu: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`,

  pause: `<svg class="lm-icon" viewBox="0 0 24 24" fill="currentColor">
    <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd"/>
  </svg>`,

  play: `<svg class="lm-icon" viewBox="0 0 24 24" fill="currentColor">
    <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/>
  </svg>`,

  refresh: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>`,

  alert: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`,

  globe: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>`,

  database: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>`,

  keyboard: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/>
    <path d="M6 8h.001"/>
    <path d="M10 8h.001"/>
    <path d="M14 8h.001"/>
    <path d="M18 8h.001"/>
    <path d="M8 12h.001"/>
    <path d="M12 12h.001"/>
    <path d="M16 12h.001"/>
    <path d="M7 16h10"/>
  </svg>`,

  link: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>`,

  settings: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,

  copy: `<svg class="lm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>`,

  /**
   * Get an icon by name
   */
  get(name) {
    return this[name] || this.info;
  }
};

  // =================================================================
  // EMBEDDED UI (from ui.js)
  // =================================================================
  
  /**
 * Links Manager Userscript - UI Components
 * 
 * All UI components for the userscript.
 * Includes badge, dropdown menu, and notification components.
 */

const LinksManagerUI = {
  config: null,
  icons: null,
  api: null,
  
  // Track active dropdown
  activeDropdown: null,
  
  // BroadcastChannel for cross-tab sync
  channel: null,

  // Topbar elements and state
  topbar: null,
  topbarCollapsed: false,
  currentPageInfo: null,
  domainStats: null,

  /**
   * Initialize UI components
   */
  init(config, icons, api) {
    this.config = config;
    this.icons = icons;
    this.api = api;
    
    // Setup cross-tab sync
    this.setupBroadcastChannel();
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (this.activeDropdown && !e.target.closest('.lm-badge-wrapper')) {
        this.closeDropdown();
      }
    });
    
    // Close dropdowns on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeDropdown) {
        this.closeDropdown();
      }
    });

    // Setup keyboard shortcuts
    if (this.config.enableShortcuts) {
      this.setupKeyboardShortcuts();
    }
  },

  /**
   * Setup BroadcastChannel for cross-tab sync
   */
  setupBroadcastChannel() {
    try {
      this.channel = new BroadcastChannel('linksmanager');
      this.channel.onmessage = (event) => {
        if (event.data.type === 'link-updated') {
          this.handleLinkUpdate(event.data.link);
        }
      };
    } catch {
      console.warn('[LinksManager] BroadcastChannel not supported');
    }
  },

  /**
   * Broadcast link update to other tabs
   */
  broadcastLinkUpdate(link) {
    if (this.channel) {
      this.channel.postMessage({ type: 'link-updated', link });
    }
  },

  /**
   * Handle link update from other tabs or WebSocket
   */
  handleLinkUpdate(link) {
    const badges = document.querySelectorAll(`.lm-badge-wrapper[data-link-id="${link.id}"]`);
    badges.forEach(badge => {
      this.updateBadge(badge, link);
    });
  },

  /**
   * Create a loading spinner element
   */
  createSpinner() {
    const spinner = document.createElement('span');
    spinner.className = 'lm-badge lm-badge-loading';
    spinner.innerHTML = this.icons.spinner;
    spinner.setAttribute('aria-label', 'Loading link information');
    return spinner;
  },

  /**
   * Create the badge/chip element for a link
   */
  createBadge(link, anchorElement) {
    const wrapper = document.createElement('span');
    wrapper.className = 'lm-badge-wrapper';
    wrapper.setAttribute('data-link-id', link.id);
    wrapper.setAttribute('data-link-url', link.url);

    const badge = document.createElement('button');
    badge.className = 'lm-badge';
    badge.type = 'button';
    badge.setAttribute('aria-haspopup', 'true');
    badge.setAttribute('aria-expanded', 'false');
    
    this.updateBadgeContent(badge, link);

    badge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleDropdown(wrapper, link, anchorElement);
    });

    wrapper.appendChild(badge);

    // Apply deleted style to the anchor if needed
    if (link.is_deleted) {
      anchorElement.classList.add('lm-link-deleted');
    }

    return wrapper;
  },

  /**
   * Update badge content based on link state
   */
  updateBadgeContent(badge, link) {
    const statusConfig = this.config.statuses[link.status] || this.config.statuses.new;
    
    badge.style.setProperty('--lm-badge-color', statusConfig.color);
    badge.innerHTML = `
      ${this.icons.get(statusConfig.icon)}
      <span class="lm-badge-label">${statusConfig.label}</span>
      ${this.icons.chevronDown}
    `;
    badge.title = statusConfig.description;
    
    // Add priority indicator if set
    if (link.priority > 0) {
      const priorityConfig = this.config.priorities.find(p => p.value === link.priority);
      if (priorityConfig) {
        badge.style.setProperty('--lm-priority-color', priorityConfig.color);
        badge.classList.add('lm-badge-has-priority');
      }
    } else {
      badge.classList.remove('lm-badge-has-priority');
    }
    
    // Add deleted state
    if (link.is_deleted) {
      badge.classList.add('lm-badge-deleted');
    } else {
      badge.classList.remove('lm-badge-deleted');
    }
  },

  /**
   * Update an existing badge with new link data
   */
  updateBadge(wrapper, link) {
    const badge = wrapper.querySelector('.lm-badge');
    if (badge) {
      this.updateBadgeContent(badge, link);
    }
    
    // Update anchor styling
    const anchorElement = wrapper.previousElementSibling || wrapper.nextElementSibling;
    if (anchorElement && anchorElement.tagName === 'A') {
      if (link.is_deleted) {
        anchorElement.classList.add('lm-link-deleted');
      } else {
        anchorElement.classList.remove('lm-link-deleted');
      }
    }
  },

  /**
   * Toggle dropdown menu
   */
  toggleDropdown(wrapper, link, anchorElement) {
    if (this.activeDropdown === wrapper) {
      this.closeDropdown();
      return;
    }

    this.closeDropdown();
    this.openDropdown(wrapper, link, anchorElement);
  },

  /**
   * Open dropdown menu
   */
  async openDropdown(wrapper, link, anchorElement) {
    const badge = wrapper.querySelector('.lm-badge');
    badge.setAttribute('aria-expanded', 'true');

    // Fetch fresh link data
    let freshLink = link;
    try {
      const response = await this.api.getLink(link.id);
      freshLink = response.link;
    } catch {
      // Use cached data if fetch fails
    }

    const dropdown = this.createDropdownMenu(freshLink, wrapper, anchorElement);
    wrapper.appendChild(dropdown);
    
    // Position dropdown
    this.positionDropdown(wrapper, dropdown);
    
    this.activeDropdown = wrapper;

    // Animate in
    requestAnimationFrame(() => {
      dropdown.classList.add('lm-dropdown-open');
    });
  },

  /**
   * Close active dropdown
   */
  closeDropdown() {
    if (!this.activeDropdown) return;

    const dropdown = this.activeDropdown.querySelector('.lm-dropdown');
    const badge = this.activeDropdown.querySelector('.lm-badge');
    
    if (badge) {
      badge.setAttribute('aria-expanded', 'false');
    }
    
    if (dropdown) {
      dropdown.classList.remove('lm-dropdown-open');
      setTimeout(() => {
        dropdown.remove();
      }, this.config.animationDuration);
    }

    this.activeDropdown = null;
  },

  /**
   * Create dropdown menu content
   */
  createDropdownMenu(link, wrapper, anchorElement) {
    const dropdown = document.createElement('div');
    dropdown.className = 'lm-dropdown';
    dropdown.setAttribute('role', 'menu');

    dropdown.innerHTML = `
      <div class="lm-dropdown-header">
        <div class="lm-dropdown-title">Link Details</div>
        <button class="lm-dropdown-close" aria-label="Close menu">${this.icons.close}</button>
      </div>
      
      <div class="lm-dropdown-info">
        <div class="lm-info-row">
          <span class="lm-info-label">URL:</span>
          <span class="lm-info-value lm-info-url" title="${link.url}">${this.truncateUrl(link.url)}</span>
        </div>
        <div class="lm-info-row">
          <span class="lm-info-label">Domain:</span>
          <span class="lm-info-value">${link.domain}</span>
        </div>
        ${link.domain_link_count !== undefined ? `
        <div class="lm-info-row">
          <span class="lm-info-label">Domain Links:</span>
          <span class="lm-info-value">${link.domain_link_count}</span>
        </div>
        ` : ''}
        <div class="lm-info-row">
          <span class="lm-info-label">Added:</span>
          <span class="lm-info-value">${this.formatDate(link.created_at)}</span>
        </div>
        <div class="lm-info-row">
          <span class="lm-info-label">Updated:</span>
          <span class="lm-info-value">${this.formatDate(link.updated_at)}</span>
        </div>
      </div>

      <div class="lm-dropdown-section">
        <div class="lm-section-title">Status</div>
        <div class="lm-status-buttons">
          ${Object.entries(this.config.statuses).map(([key, status]) => `
            <button class="lm-status-btn ${link.status === key ? 'lm-status-btn-active' : ''}" 
                    data-status="${key}"
                    style="--btn-color: ${status.color}"
                    title="${status.description}">
              ${this.icons.get(status.icon)}
              <span>${status.label}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="lm-dropdown-section">
        <div class="lm-section-title">Priority</div>
        <div class="lm-priority-selector">
          ${this.config.priorities.map(p => `
            <button class="lm-priority-btn ${link.priority === p.value ? 'lm-priority-btn-active' : ''}"
                    data-priority="${p.value}"
                    style="--btn-color: ${p.color}"
                    title="${p.label}">
              ${p.value === 0 ? '−' : p.value}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="lm-dropdown-section">
        <div class="lm-section-title">Description</div>
        <textarea class="lm-description-input" 
                  placeholder="Add a description..."
                  rows="2">${link.description || ''}</textarea>
        <button class="lm-save-description-btn" style="display: none;">Save</button>
      </div>

      <div class="lm-dropdown-actions">
        ${link.is_deleted ? `
          <button class="lm-action-btn lm-action-restore" data-action="restore">
            ${this.icons.restore}
            <span>Restore Link</span>
          </button>
        ` : `
          <button class="lm-action-btn lm-action-delete" data-action="delete">
            ${this.icons.trash}
            <span>Blacklist Link</span>
          </button>
        `}
      </div>
    `;

    // Setup event listeners
    this.setupDropdownEvents(dropdown, link, wrapper);

    return dropdown;
  },

  /**
   * Setup dropdown event listeners
   */
  setupDropdownEvents(dropdown, link, wrapper) {
    // Close button
    dropdown.querySelector('.lm-dropdown-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeDropdown();
    });

    // Status buttons
    dropdown.querySelectorAll('.lm-status-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const status = btn.dataset.status;
        if (status !== link.status) {
          await this.updateLinkStatus(link.id, status, wrapper, dropdown);
        }
      });
    });

    // Priority buttons
    dropdown.querySelectorAll('.lm-priority-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const priority = parseInt(btn.dataset.priority, 10);
        if (priority !== link.priority) {
          await this.updateLinkPriority(link.id, priority, wrapper, dropdown);
        }
      });
    });

    // Description input
    const descInput = dropdown.querySelector('.lm-description-input');
    const saveBtn = dropdown.querySelector('.lm-save-description-btn');
    let originalDesc = link.description || '';

    descInput.addEventListener('input', () => {
      if (descInput.value !== originalDesc) {
        saveBtn.style.display = 'block';
      } else {
        saveBtn.style.display = 'none';
      }
    });

    saveBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.updateLinkDescription(link.id, descInput.value, wrapper);
      originalDesc = descInput.value;
      saveBtn.style.display = 'none';
    });

    // Delete/Restore action
    const actionBtn = dropdown.querySelector('.lm-action-btn');
    actionBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = actionBtn.dataset.action;
      await this.toggleLinkDeleted(link.id, action === 'delete', wrapper);
      this.closeDropdown();
    });

    // Prevent dropdown from closing when clicking inside
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  },

  /**
   * Position dropdown menu
   */
  positionDropdown(wrapper, dropdown) {
    const rect = wrapper.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dropdownWidth = 320;
    const dropdownHeight = 450;

    // Position below by default
    let top = rect.height + 4;
    let left = 0;

    // Check if dropdown would go off-screen to the right
    if (rect.left + dropdownWidth > viewportWidth) {
      left = -(dropdownWidth - rect.width);
    }

    // Check if dropdown would go off-screen at the bottom
    if (rect.bottom + dropdownHeight > viewportHeight) {
      top = -dropdownHeight - 4;
    }

    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
  },

  /**
   * Update link status
   */
  async updateLinkStatus(id, status, wrapper, dropdown) {
    try {
      dropdown.classList.add('lm-dropdown-loading');
      const response = await this.api.updateStatus(id, status);
      this.updateBadge(wrapper, response.link);
      this.broadcastLinkUpdate(response.link);
      
      // Update active buttons
      dropdown.querySelectorAll('.lm-status-btn').forEach(btn => {
        btn.classList.toggle('lm-status-btn-active', btn.dataset.status === status);
      });

      if (this.config.onStatusChange) {
        this.config.onStatusChange(response.link);
      }
    } catch (error) {
      this.showError('Failed to update status');
    } finally {
      dropdown.classList.remove('lm-dropdown-loading');
    }
  },

  /**
   * Update link priority
   */
  async updateLinkPriority(id, priority, wrapper, dropdown) {
    try {
      dropdown.classList.add('lm-dropdown-loading');
      const response = await this.api.updatePriority(id, priority);
      this.updateBadge(wrapper, response.link);
      this.broadcastLinkUpdate(response.link);
      
      // Update active buttons
      dropdown.querySelectorAll('.lm-priority-btn').forEach(btn => {
        btn.classList.toggle('lm-priority-btn-active', parseInt(btn.dataset.priority, 10) === priority);
      });
    } catch (error) {
      this.showError('Failed to update priority');
    } finally {
      dropdown.classList.remove('lm-dropdown-loading');
    }
  },

  /**
   * Update link description
   */
  async updateLinkDescription(id, description, wrapper) {
    try {
      const response = await this.api.updateDescription(id, description);
      this.updateBadge(wrapper, response.link);
      this.broadcastLinkUpdate(response.link);
    } catch (error) {
      this.showError('Failed to update description');
    }
  },

  /**
   * Toggle link deleted status
   */
  async toggleLinkDeleted(id, isDeleted, wrapper) {
    try {
      const response = await this.api.toggleDeleted(id, isDeleted);
      this.updateBadge(wrapper, response.link);
      this.broadcastLinkUpdate(response.link);
    } catch (error) {
      this.showError(`Failed to ${isDeleted ? 'delete' : 'restore'} link`);
    }
  },

  /**
   * Show error notification
   */
  showError(message) {
    console.error('[LinksManager]', message);
    if (this.config.onError) {
      this.config.onError(message);
    }
  },

  /**
   * Truncate URL for display
   */
  truncateUrl(url, maxLength = 40) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  },

  /**
   * Format date for display
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  },

  // =================================================================
  // TOPBAR FUNCTIONALITY
  // =================================================================

  /**
   * Check if topbar should be shown on current domain
   */
  shouldShowTopbar() {
    if (!this.config.enableTopbar) return false;

    const currentDomain = window.location.hostname;
    const { topbarDomains, topbarExcludeDomains } = this.config;

    // Check exclude list first
    if (topbarExcludeDomains.length > 0) {
      if (topbarExcludeDomains.some(d => currentDomain.includes(d))) {
        return false;
      }
    }

    // If include list is empty, show on all domains
    if (topbarDomains.length === 0) return true;

    // Check include list
    return topbarDomains.some(d => currentDomain.includes(d));
  },

  /**
   * Initialize and show the topbar
   */
  async initTopbar() {
    if (!this.shouldShowTopbar()) return;

    // Load collapsed state from storage
    this.loadTopbarState();

    // Create topbar element
    this.topbar = this.createTopbar();
    document.body.appendChild(this.topbar);

    // Add body padding to prevent content overlap
    this.updateBodyPadding();

    // Fetch initial data
    await this.refreshTopbarData();
  },

  /**
   * Load topbar collapsed state from localStorage
   */
  loadTopbarState() {
    if (this.config.topbarRememberState) {
      try {
        const saved = localStorage.getItem('lm-topbar-collapsed');
        this.topbarCollapsed = saved === 'true';
      } catch {
        this.topbarCollapsed = this.config.topbarCollapsed;
      }
    } else {
      this.topbarCollapsed = this.config.topbarCollapsed;
    }
  },

  /**
   * Save topbar collapsed state to localStorage
   */
  saveTopbarState() {
    if (this.config.topbarRememberState) {
      try {
        localStorage.setItem('lm-topbar-collapsed', String(this.topbarCollapsed));
      } catch {
        // Storage not available
      }
    }
  },

  /**
   * Create the topbar element
   */
  createTopbar() {
    const topbar = document.createElement('div');
    topbar.className = `lm-topbar ${this.config.topbarPosition === 'bottom' ? 'lm-topbar-bottom' : 'lm-topbar-top'}`;
    if (this.topbarCollapsed) {
      topbar.classList.add('lm-topbar-collapsed');
    }
    topbar.id = 'lm-topbar';

    topbar.innerHTML = this.renderTopbarContent();
    this.setupTopbarEvents(topbar);

    return topbar;
  },

  /**
   * Render topbar HTML content
   */
  renderTopbarContent() {
    const shortcutHint = this.config.enableShortcuts ? this.formatShortcut(this.config.shortcuts.toggleTopbar) : '';
    
    return `
      <div class="lm-topbar-container">
        <div class="lm-topbar-collapsed-bar">
          <button class="lm-topbar-expand-btn" title="Expand Links Manager${shortcutHint ? ' (' + shortcutHint + ')' : ''}">
            ${this.icons.menu}
            <span class="lm-topbar-brand">Links Manager</span>
            ${this.icons.chevronDown}
          </button>
        </div>
        
        <div class="lm-topbar-content">
          <div class="lm-topbar-header">
            <div class="lm-topbar-brand-full">
              ${this.icons.link}
              <span>Links Manager</span>
            </div>
            <button class="lm-topbar-collapse-btn" title="Collapse${shortcutHint ? ' (' + shortcutHint + ')' : ''}">
              ${this.icons.chevronUp}
            </button>
          </div>

          <div class="lm-topbar-main">
            <!-- Stats Section -->
            <div class="lm-topbar-section lm-topbar-stats">
              <div class="lm-stat-item" title="Total captured pages">
                ${this.icons.database}
                <span class="lm-stat-value" id="lm-stat-total">--</span>
                <span class="lm-stat-label">Total</span>
              </div>
              <div class="lm-stat-item" title="Pages on this domain">
                ${this.icons.globe}
                <span class="lm-stat-value" id="lm-stat-domain">--</span>
                <span class="lm-stat-label">Domain</span>
              </div>
            </div>

            <!-- Current Page Section -->
            <div class="lm-topbar-section lm-topbar-page">
              <div class="lm-page-status">
                <span class="lm-page-badge" id="lm-page-status-badge">
                  ${this.icons.sparkles}
                  <span id="lm-page-status-text">Loading...</span>
                </span>
              </div>
            </div>

            <!-- Priority Section -->
            <div class="lm-topbar-section lm-topbar-priority">
              <span class="lm-section-label">Priority</span>
              <div class="lm-topbar-priority-btns" id="lm-topbar-priority-btns">
                ${this.config.priorities.map(p => `
                  <button class="lm-topbar-priority-btn" 
                          data-priority="${p.value}"
                          style="--btn-color: ${p.color}"
                          title="${p.label}">
                    ${p.value === 0 ? '−' : p.value}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Status Section -->
            <div class="lm-topbar-section lm-topbar-status">
              <span class="lm-section-label">Status</span>
              <div class="lm-topbar-status-btns" id="lm-topbar-status-btns">
                ${Object.entries(this.config.statuses).map(([key, status]) => `
                  <button class="lm-topbar-status-btn"
                          data-status="${key}"
                          style="--btn-color: ${status.color}"
                          title="${status.description}">
                    ${this.icons.get(status.icon)}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Crawl State Section -->
            <div class="lm-topbar-section lm-topbar-crawl">
              <span class="lm-section-label">Crawl</span>
              <div class="lm-topbar-crawl-btns" id="lm-topbar-crawl-btns">
                ${Object.entries(this.config.crawlStates).map(([key, state]) => `
                  <button class="lm-topbar-crawl-btn"
                          data-crawl="${key}"
                          style="--btn-color: ${state.color}"
                          title="${state.label}">
                    ${this.icons.get(state.icon)}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Actions Section -->
            <div class="lm-topbar-section lm-topbar-actions">
              <button class="lm-topbar-action-btn" id="lm-copy-url" title="Copy URL">
                ${this.icons.copy}
              </button>
              <button class="lm-topbar-action-btn" id="lm-refresh-data" title="Refresh data">
                ${this.icons.refresh}
              </button>
            </div>
          </div>

          <!-- Keyboard Shortcuts Hint -->
          ${this.config.enableShortcuts ? `
          <div class="lm-topbar-shortcuts">
            <span class="lm-shortcuts-hint">
              ${this.icons.keyboard}
              <span>Shortcuts: 
                <kbd>${this.formatShortcut(this.config.shortcuts.toggleTopbar)}</kbd> Toggle
                <kbd>${this.formatShortcut(this.config.shortcuts.cyclePriority)}</kbd> Priority
                <kbd>${this.formatShortcut(this.config.shortcuts.cycleStatus)}</kbd> Status
              </span>
            </span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Setup topbar event listeners
   */
  setupTopbarEvents(topbar) {
    // Collapse/expand buttons
    const expandBtn = topbar.querySelector('.lm-topbar-expand-btn');
    const collapseBtn = topbar.querySelector('.lm-topbar-collapse-btn');

    if (expandBtn) {
      expandBtn.addEventListener('click', () => this.toggleTopbar());
    }
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => this.toggleTopbar());
    }

    // Priority buttons
    topbar.querySelectorAll('.lm-topbar-priority-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const priority = parseInt(btn.dataset.priority, 10);
        await this.updateCurrentPagePriority(priority);
      });
    });

    // Status buttons
    topbar.querySelectorAll('.lm-topbar-status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const status = btn.dataset.status;
        await this.updateCurrentPageStatus(status);
      });
    });

    // Crawl state buttons
    topbar.querySelectorAll('.lm-topbar-crawl-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const crawlState = btn.dataset.crawl;
        await this.updateCurrentPageCrawlState(crawlState);
      });
    });

    // Copy URL button
    const copyBtn = topbar.querySelector('#lm-copy-url');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyCurrentUrl());
    }

    // Refresh data button
    const refreshBtn = topbar.querySelector('#lm-refresh-data');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshTopbarData());
    }
  },

  /**
   * Toggle topbar collapsed state
   */
  toggleTopbar() {
    this.topbarCollapsed = !this.topbarCollapsed;
    
    if (this.topbar) {
      this.topbar.classList.toggle('lm-topbar-collapsed', this.topbarCollapsed);
    }
    
    this.saveTopbarState();
    this.updateBodyPadding();
  },

  /**
   * Update body padding to prevent content overlap
   */
  updateBodyPadding() {
    const paddingProperty = this.config.topbarPosition === 'bottom' ? 'paddingBottom' : 'paddingTop';
    const height = this.topbarCollapsed ? '36px' : '72px';
    document.body.style[paddingProperty] = height;
  },

  /**
   * Refresh topbar data from API
   */
  async refreshTopbarData() {
    try {
      // Get current page info
      const pageInfoResponse = await this.api.getPageInfo(window.location.href);
      this.currentPageInfo = pageInfoResponse;

      // Get total pages count
      const totalResponse = await this.api.getTotalPagesCount();

      // Update UI
      this.updateTopbarUI(pageInfoResponse, totalResponse.total_pages);
    } catch (error) {
      console.error('[LinksManager] Failed to refresh topbar data:', error);
    }
  },

  /**
   * Update topbar UI with data
   */
  updateTopbarUI(pageInfo, totalPages) {
    if (!this.topbar) return;

    // Update total pages stat (only if provided)
    if (totalPages !== null && totalPages !== undefined) {
      const totalEl = this.topbar.querySelector('#lm-stat-total');
      if (totalEl) {
        totalEl.textContent = this.formatNumber(totalPages);
      }
    }

    // Update domain stat
    const domainEl = this.topbar.querySelector('#lm-stat-domain');
    if (domainEl && pageInfo.domain_stats) {
      domainEl.textContent = this.formatNumber(pageInfo.domain_stats.total_links);
    } else if (domainEl && !pageInfo.domain_stats) {
      domainEl.textContent = '0';
    }

    // Update page status
    const statusBadge = this.topbar.querySelector('#lm-page-status-badge');
    const statusText = this.topbar.querySelector('#lm-page-status-text');
    
    if (pageInfo.exists && pageInfo.link) {
      const link = pageInfo.link;
      const statusConfig = this.config.statuses[link.status] || this.config.statuses.new;
      
      if (statusBadge) {
        statusBadge.style.setProperty('--badge-color', statusConfig.color);
        // Update icon by finding the SVG element
        const iconEl = statusBadge.querySelector('.lm-icon');
        if (iconEl) {
          iconEl.outerHTML = this.icons.get(statusConfig.icon);
        }
        // Update text content
        const textEl = statusBadge.querySelector('#lm-page-status-text');
        if (textEl) {
          textEl.textContent = statusConfig.label;
        }
      }

      // Update active priority button
      this.topbar.querySelectorAll('.lm-topbar-priority-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.priority, 10) === link.priority);
      });

      // Update active status button
      this.topbar.querySelectorAll('.lm-topbar-status-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === link.status);
      });

      // Update active crawl state button
      const crawlState = link.crawl_state || 'idle';
      this.topbar.querySelectorAll('.lm-topbar-crawl-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.crawl === crawlState);
      });
    } else {
      if (statusText) {
        statusText.textContent = 'Not tracked';
      }
      if (statusBadge) {
        statusBadge.style.setProperty('--badge-color', '#6b7280');
      }
    }
  },

  /**
   * Update current page priority
   */
  async updateCurrentPagePriority(priority) {
    if (!this.currentPageInfo?.exists || !this.currentPageInfo?.link) {
      this.showError('Page not tracked yet');
      return;
    }

    try {
      const response = await this.api.updatePriority(this.currentPageInfo.link.id, priority);
      this.currentPageInfo.link = response.link;
      this.updateTopbarUI(this.currentPageInfo, null);
      this.broadcastLinkUpdate(response.link);
    } catch (error) {
      this.showError('Failed to update priority');
    }
  },

  /**
   * Update current page status
   */
  async updateCurrentPageStatus(status) {
    if (!this.currentPageInfo?.exists || !this.currentPageInfo?.link) {
      this.showError('Page not tracked yet');
      return;
    }

    try {
      const response = await this.api.updateStatus(this.currentPageInfo.link.id, status);
      this.currentPageInfo.link = response.link;
      this.updateTopbarUI(this.currentPageInfo, null);
      this.broadcastLinkUpdate(response.link);
    } catch (error) {
      this.showError('Failed to update status');
    }
  },

  /**
   * Update current page crawl state
   */
  async updateCurrentPageCrawlState(crawlState) {
    if (!this.currentPageInfo?.exists || !this.currentPageInfo?.link) {
      this.showError('Page not tracked yet');
      return;
    }

    try {
      const response = await this.api.updateCrawlState(this.currentPageInfo.link.id, crawlState);
      this.currentPageInfo.link = response.link;
      this.updateTopbarUI(this.currentPageInfo, null);
      this.broadcastLinkUpdate(response.link);
    } catch (error) {
      this.showError('Failed to update crawl state');
    }
  },

  /**
   * Copy current URL to clipboard
   */
  async copyCurrentUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      const btn = this.topbar.querySelector('#lm-copy-url');
      if (btn) {
        btn.classList.add('lm-copied');
        setTimeout(() => btn.classList.remove('lm-copied'), 1500);
      }
    } catch (error) {
      this.showError('Failed to copy URL');
    }
  },

  /**
   * Format number with K/M suffix
   */
  formatNumber(num) {
    if (num === null || num === undefined) return '--';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
  },

  /**
   * Format keyboard shortcut for display
   */
  formatShortcut(shortcut) {
    if (!shortcut) return '';
    const parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.metaKey) parts.push('Cmd');
    parts.push(shortcut.key.toUpperCase());
    return parts.join('+');
  },

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.matches('input, textarea, select, [contenteditable]')) {
        return;
      }

      const { shortcuts } = this.config;

      // Toggle topbar
      if (this.matchesShortcut(e, shortcuts.toggleTopbar)) {
        e.preventDefault();
        this.toggleTopbar();
        return;
      }

      // Cycle priority
      if (this.matchesShortcut(e, shortcuts.cyclePriority)) {
        e.preventDefault();
        this.cyclePriority();
        return;
      }

      // Cycle status
      if (this.matchesShortcut(e, shortcuts.cycleStatus)) {
        e.preventDefault();
        this.cycleStatus();
        return;
      }

      // Toggle crawl state
      if (this.matchesShortcut(e, shortcuts.toggleCrawl)) {
        e.preventDefault();
        this.toggleCrawlState();
        return;
      }
    });
  },

  /**
   * Check if key event matches shortcut
   */
  matchesShortcut(event, shortcut) {
    if (!shortcut) return false;
    return (
      event.key.toLowerCase() === shortcut.key.toLowerCase() &&
      event.ctrlKey === (shortcut.ctrlKey || false) &&
      event.shiftKey === (shortcut.shiftKey || false) &&
      event.altKey === (shortcut.altKey || false) &&
      event.metaKey === (shortcut.metaKey || false)
    );
  },

  /**
   * Cycle through priorities
   */
  async cyclePriority() {
    if (!this.currentPageInfo?.exists || !this.currentPageInfo?.link) return;

    const currentPriority = this.currentPageInfo.link.priority || 0;
    const priorities = this.config.priorities.map(p => p.value);
    const currentIndex = priorities.indexOf(currentPriority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    const nextPriority = priorities[nextIndex];

    await this.updateCurrentPagePriority(nextPriority);
  },

  /**
   * Cycle through statuses
   */
  async cycleStatus() {
    if (!this.currentPageInfo?.exists || !this.currentPageInfo?.link) return;

    const currentStatus = this.currentPageInfo.link.status || 'new';
    const statuses = Object.keys(this.config.statuses);
    const currentIndex = statuses.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];

    await this.updateCurrentPageStatus(nextStatus);
  },

  /**
   * Cycle through crawl states
   * Cycles: idle -> queued -> crawling -> completed -> idle (skips 'failed')
   */
  async toggleCrawlState() {
    if (!this.currentPageInfo?.exists || !this.currentPageInfo?.link) return;

    const currentCrawl = this.currentPageInfo.link.crawl_state || 'idle';
    // Define the cycle order (skipping 'failed' as it's an error state)
    const crawlCycle = ['idle', 'queued', 'crawling', 'completed'];
    const currentIndex = crawlCycle.indexOf(currentCrawl);
    // If current state is not in cycle (e.g., 'failed'), reset to 'idle'
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % crawlCycle.length;
    const nextCrawl = crawlCycle[nextIndex];

    await this.updateCurrentPageCrawlState(nextCrawl);
  }
};

  // =================================================================
  // MAIN LINKS MANAGER CLASS
  // =================================================================

  class LinksManager {
    constructor() {
      this.processedLinks = new Map(); // Map of normalized URL to link data
      this.pendingLinks = new Map();   // Map of normalized URL to anchor elements
      this.isProcessing = false;
      this.socket = null;
    }

    /**
     * Initialize the Links Manager
     */
    async init() {
      console.log('[LinksManager] Initializing...');

      // Inject styles
      this.injectStyles();

      // Create root element for styles
      this.createRootElement();

      // Initialize modules
      LinksManagerAPI.init(LinksManagerConfig);
      LinksManagerUI.init(LinksManagerConfig, LinksManagerIcons, LinksManagerAPI);

      // Initialize topbar if enabled
      if (LinksManagerConfig.enableTopbar) {
        await LinksManagerUI.initTopbar();
      }

      // Collect and process links
      await this.collectAndProcessLinks();

      // Setup mutation observer for dynamic content
      this.setupMutationObserver();

      // Setup WebSocket if enabled
      if (LinksManagerConfig.enableWebSocket) {
        this.setupWebSocket();
      }

      console.log('[LinksManager] Initialized successfully');
    }

    /**
     * Inject CSS styles
     */
    injectStyles() {
      const styles = `.lm-root{--lm-bg: #ffffff;--lm-bg-secondary: #f8fafc;--lm-text: #1e293b;--lm-text-secondary: #64748b;--lm-border: #e2e8f0;--lm-shadow: rgba(0, 0, 0, 0.1);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:14px;line-height:1.5}.lm-root *,.lm-root *::before,.lm-root *::after{box-sizing:border-box}.lm-root.lm-dark{--lm-bg: #1e293b;--lm-bg-secondary: #0f172a;--lm-text: #f1f5f9;--lm-text-secondary: #94a3b8;--lm-border: #334155;--lm-shadow: rgba(0, 0, 0, 0.3)}@media(prefers-color-scheme: dark){.lm-root:not(.lm-light){--lm-bg: #1e293b;--lm-bg-secondary: #0f172a;--lm-text: #f1f5f9;--lm-text-secondary: #94a3b8;--lm-border: #334155;--lm-shadow: rgba(0, 0, 0, 0.3)}}.lm-icon{width:14px;height:14px;display:inline-flex;flex-shrink:0;vertical-align:middle}.lm-spinner{animation:lm-spin 1s linear infinite}@keyframes lm-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.lm-badge-wrapper{display:inline-flex;align-items:center;vertical-align:middle;position:relative;margin-left:4px}.lm-badge{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;font-size:11px;font-weight:500;color:var(--lm-badge-color, #3b82f6);background:color-mix(in srgb, var(--lm-badge-color, #3b82f6) 10%, transparent);border:1px solid color-mix(in srgb, var(--lm-badge-color, #3b82f6) 30%, transparent);border-radius:100px;cursor:pointer;transition:all 150ms ease;white-space:nowrap;font-family:inherit;outline:none}.lm-badge:hover{background:color-mix(in srgb, var(--lm-badge-color, #3b82f6) 20%, transparent);border-color:color-mix(in srgb, var(--lm-badge-color, #3b82f6) 50%, transparent)}.lm-badge:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb, var(--lm-badge-color, #3b82f6) 30%, transparent)}.lm-badge .lm-icon:last-child{width:12px;height:12px;margin-left:2px;opacity:.6}.lm-badge.lm-badge-has-priority{border-left:3px solid var(--lm-priority-color, #f59e0b);padding-left:6px}.lm-badge.lm-badge-deleted{opacity:.6;text-decoration:line-through}.lm-badge-label{display:inline-block}.lm-badge-loading{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;margin-left:4px;color:var(--lm-text-secondary, #64748b);background:rgba(0,0,0,0);border:none}.lm-badge-loading .lm-icon{width:16px;height:16px}.lm-link-deleted{color:#ef4444 !important;text-decoration:line-through !important;opacity:.7}.lm-dropdown{position:absolute;z-index:999999;width:320px;max-height:80vh;overflow-y:auto;background:var(--lm-bg);border:1px solid var(--lm-border);border-radius:6px;box-shadow:0 10px 40px var(--lm-shadow),0 2px 10px var(--lm-shadow);opacity:0;transform:translateY(-8px);transition:opacity 200ms ease,transform 200ms ease}.lm-dropdown.lm-dropdown-open{opacity:1;transform:translateY(0)}.lm-dropdown.lm-dropdown-loading::after{content:"";position:absolute;inset:0;background:var(--lm-bg);opacity:.7;z-index:10;cursor:wait}.lm-dropdown-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--lm-border);background:var(--lm-bg-secondary)}.lm-dropdown-title{font-size:14px;font-weight:600;color:var(--lm-text)}.lm-dropdown-close{display:flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:none;background:rgba(0,0,0,0);color:var(--lm-text-secondary);border-radius:4px;cursor:pointer;transition:all 150ms ease}.lm-dropdown-close:hover{background:var(--lm-border);color:var(--lm-text)}.lm-dropdown-close .lm-icon{width:16px;height:16px}.lm-dropdown-info{padding:12px 16px;border-bottom:1px solid var(--lm-border)}.lm-info-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:6px}.lm-info-row:last-child{margin-bottom:0}.lm-info-label{flex-shrink:0;width:90px;font-size:12px;font-weight:500;color:var(--lm-text-secondary)}.lm-info-value{font-size:12px;color:var(--lm-text);word-break:break-word}.lm-info-url{font-family:"SF Mono",Monaco,"Cascadia Code",monospace;font-size:11px}.lm-dropdown-section{padding:12px 16px;border-bottom:1px solid var(--lm-border)}.lm-section-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--lm-text-secondary);margin-bottom:10px}.lm-status-buttons{display:flex;flex-wrap:wrap;gap:6px}.lm-status-btn{display:inline-flex;align-items:center;gap:4px;padding:6px 10px;font-size:12px;font-weight:500;font-family:inherit;color:var(--btn-color, #3b82f6);background:color-mix(in srgb, var(--btn-color, #3b82f6) 10%, transparent);border:1px solid color-mix(in srgb, var(--btn-color, #3b82f6) 25%, transparent);border-radius:4px;cursor:pointer;transition:all 150ms ease}.lm-status-btn .lm-icon{width:14px;height:14px}.lm-status-btn:hover{background:color-mix(in srgb, var(--btn-color, #3b82f6) 20%, transparent);border-color:var(--btn-color)}.lm-status-btn.lm-status-btn-active{background:var(--btn-color);color:#fff;border-color:var(--btn-color)}.lm-status-btn.lm-status-btn-active .lm-icon{color:#fff}.lm-priority-selector{display:flex;gap:4px}.lm-priority-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;font-size:12px;font-weight:600;font-family:inherit;color:var(--btn-color, #64748b);background:var(--lm-bg-secondary);border:1px solid var(--lm-border);border-radius:4px;cursor:pointer;transition:all 150ms ease}.lm-priority-btn:hover{border-color:var(--btn-color);color:var(--btn-color)}.lm-priority-btn.lm-priority-btn-active{background:var(--btn-color);color:#fff;border-color:var(--btn-color)}.lm-description-input{width:100%;padding:8px 10px;font-size:13px;font-family:inherit;color:var(--lm-text);background:var(--lm-bg-secondary);border:1px solid var(--lm-border);border-radius:4px;resize:vertical;min-height:60px;transition:border-color 150ms ease}.lm-description-input:focus{outline:none;border-color:#3b82f6}.lm-description-input::placeholder{color:var(--lm-text-secondary)}.lm-save-description-btn{display:block;width:100%;margin-top:8px;padding:8px;font-size:12px;font-weight:500;font-family:inherit;color:#fff;background:#3b82f6;border:none;border-radius:4px;cursor:pointer;transition:background 150ms ease}.lm-save-description-btn:hover{background:color-mix(in srgb, #3b82f6 85%, black)}.lm-dropdown-actions{padding:12px 16px}.lm-action-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:10px;font-size:13px;font-weight:500;font-family:inherit;border:none;border-radius:4px;cursor:pointer;transition:all 150ms ease}.lm-action-btn .lm-icon{width:16px;height:16px}.lm-action-delete{color:#ef4444;background:color-mix(in srgb, #ef4444 10%, transparent)}.lm-action-delete:hover{background:color-mix(in srgb, #ef4444 20%, transparent)}.lm-action-restore{color:#22c55e;background:color-mix(in srgb, #22c55e 10%, transparent)}.lm-action-restore:hover{background:color-mix(in srgb, #22c55e 20%, transparent)}.lm-dropdown{scrollbar-width:thin;scrollbar-color:var(--lm-border) rgba(0,0,0,0)}.lm-dropdown::-webkit-scrollbar{width:6px}.lm-dropdown::-webkit-scrollbar-track{background:rgba(0,0,0,0)}.lm-dropdown::-webkit-scrollbar-thumb{background:var(--lm-border);border-radius:3px}.lm-dropdown::-webkit-scrollbar-thumb:hover{background:var(--lm-text-secondary)}.lm-topbar{position:fixed;left:0;right:0;z-index:1000000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:13px;line-height:1.4;--lm-bg: #ffffff;--lm-bg-secondary: #f8fafc;--lm-text: #1e293b;--lm-text-secondary: #64748b;--lm-border: #e2e8f0;--lm-shadow: rgba(0, 0, 0, 0.1)}.lm-topbar.lm-dark{--lm-bg: #1e293b;--lm-bg-secondary: #0f172a;--lm-text: #f1f5f9;--lm-text-secondary: #94a3b8;--lm-border: #334155;--lm-shadow: rgba(0, 0, 0, 0.3)}@media(prefers-color-scheme: dark){.lm-topbar:not(.lm-light){--lm-bg: #1e293b;--lm-bg-secondary: #0f172a;--lm-text: #f1f5f9;--lm-text-secondary: #94a3b8;--lm-border: #334155;--lm-shadow: rgba(0, 0, 0, 0.3)}}.lm-topbar-top{top:0}.lm-topbar-bottom{bottom:0}.lm-topbar-container{background:linear-gradient(135deg, var(--lm-bg) 0%, var(--lm-bg-secondary) 100%);border-bottom:1px solid var(--lm-border);box-shadow:0 2px 16px var(--lm-shadow),0 1px 4px var(--lm-shadow);transition:all 200ms ease}.lm-topbar-bottom .lm-topbar-container{border-bottom:none;border-top:1px solid var(--lm-border);box-shadow:0 -2px 16px var(--lm-shadow),0 -1px 4px var(--lm-shadow)}.lm-topbar-collapsed-bar{display:none;padding:6px 16px}.lm-topbar-collapsed .lm-topbar-collapsed-bar{display:block}.lm-topbar-expand-btn{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;font-size:13px;font-weight:500;font-family:inherit;color:var(--lm-text);background:var(--lm-bg);border:1px solid var(--lm-border);border-radius:100px;cursor:pointer;transition:all 150ms ease}.lm-topbar-expand-btn:hover{background:var(--lm-bg-secondary);border-color:#3b82f6;color:#3b82f6}.lm-topbar-expand-btn .lm-icon{width:16px;height:16px}.lm-topbar-expand-btn .lm-icon:last-child{width:14px;height:14px;opacity:.6}.lm-topbar-brand{font-weight:600;background:linear-gradient(135deg, #3b82f6, #8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:rgba(0,0,0,0);background-clip:text}.lm-topbar-content{display:block;padding:0}.lm-topbar-collapsed .lm-topbar-content{display:none}.lm-topbar-header{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;border-bottom:1px solid var(--lm-border);background:var(--lm-bg-secondary)}.lm-topbar-brand-full{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600}.lm-topbar-brand-full span{background:linear-gradient(135deg, #3b82f6, #8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:rgba(0,0,0,0);background-clip:text}.lm-topbar-brand-full .lm-icon{width:18px;height:18px;color:#3b82f6}.lm-topbar-collapse-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:none;background:rgba(0,0,0,0);color:var(--lm-text-secondary);border-radius:4px;cursor:pointer;transition:all 150ms ease}.lm-topbar-collapse-btn:hover{background:var(--lm-border);color:var(--lm-text)}.lm-topbar-collapse-btn .lm-icon{width:16px;height:16px}.lm-topbar-main{display:flex;align-items:center;gap:16px;padding:8px 16px;overflow-x:auto;scrollbar-width:none}.lm-topbar-main::-webkit-scrollbar{display:none}.lm-topbar-section{display:flex;align-items:center;gap:8px;flex-shrink:0;padding-right:16px;border-right:1px solid var(--lm-border)}.lm-topbar-section:last-child{border-right:none;padding-right:0}.lm-section-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--lm-text-secondary);white-space:nowrap}.lm-topbar-stats{gap:16px}.lm-stat-item{display:flex;align-items:center;gap:6px}.lm-stat-item .lm-icon{width:16px;height:16px;color:var(--lm-text-secondary)}.lm-stat-value{font-size:16px;font-weight:700;color:var(--lm-text);font-variant-numeric:tabular-nums}.lm-stat-label{font-size:11px;color:var(--lm-text-secondary)}.lm-topbar-page{min-width:100px}.lm-page-status{display:flex;align-items:center}.lm-page-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;font-size:12px;font-weight:500;color:var(--badge-color, #3b82f6);background:color-mix(in srgb, var(--badge-color, #3b82f6) 12%, transparent);border:1px solid color-mix(in srgb, var(--badge-color, #3b82f6) 30%, transparent);border-radius:100px}.lm-page-badge .lm-icon{width:14px;height:14px}.lm-topbar-priority-btns{display:flex;gap:4px}.lm-topbar-priority-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;font-size:12px;font-weight:600;font-family:inherit;color:var(--btn-color, var(--lm-text-secondary));background:var(--lm-bg);border:1px solid var(--lm-border);border-radius:4px;cursor:pointer;transition:all 150ms ease}.lm-topbar-priority-btn:hover{border-color:var(--btn-color);color:var(--btn-color);background:color-mix(in srgb, var(--btn-color) 10%, transparent)}.lm-topbar-priority-btn.active{background:var(--btn-color);color:#fff;border-color:var(--btn-color)}.lm-topbar-status-btns{display:flex;gap:4px}.lm-topbar-status-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;font-family:inherit;color:var(--btn-color, var(--lm-text-secondary));background:var(--lm-bg);border:1px solid var(--lm-border);border-radius:4px;cursor:pointer;transition:all 150ms ease}.lm-topbar-status-btn .lm-icon{width:14px;height:14px}.lm-topbar-status-btn:hover{border-color:var(--btn-color);background:color-mix(in srgb, var(--btn-color) 10%, transparent)}.lm-topbar-status-btn.active{background:var(--btn-color);color:#fff;border-color:var(--btn-color)}.lm-topbar-crawl-btns{display:flex;gap:4px}.lm-topbar-crawl-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;font-family:inherit;color:var(--btn-color, var(--lm-text-secondary));background:var(--lm-bg);border:1px solid var(--lm-border);border-radius:4px;cursor:pointer;transition:all 150ms ease}.lm-topbar-crawl-btn .lm-icon{width:14px;height:14px}.lm-topbar-crawl-btn:hover{border-color:var(--btn-color);background:color-mix(in srgb, var(--btn-color) 10%, transparent)}.lm-topbar-crawl-btn.active{background:var(--btn-color);color:#fff;border-color:var(--btn-color)}.lm-topbar-crawl-btn.active[data-crawl=crawling] .lm-icon{animation:lm-spin 1.5s linear infinite}.lm-topbar-actions{gap:4px}.lm-topbar-action-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;font-family:inherit;color:var(--lm-text-secondary);background:var(--lm-bg);border:1px solid var(--lm-border);border-radius:4px;cursor:pointer;transition:all 150ms ease}.lm-topbar-action-btn .lm-icon{width:16px;height:16px}.lm-topbar-action-btn:hover{border-color:#3b82f6;color:#3b82f6;background:color-mix(in srgb, #3b82f6 10%, transparent)}.lm-topbar-action-btn.lm-copied{border-color:#22c55e;color:#22c55e;background:color-mix(in srgb, #22c55e 15%, transparent)}.lm-topbar-shortcuts{padding:4px 16px 8px;border-top:1px solid var(--lm-border);background:var(--lm-bg-secondary)}.lm-shortcuts-hint{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--lm-text-secondary)}.lm-shortcuts-hint .lm-icon{width:14px;height:14px}.lm-shortcuts-hint kbd{display:inline-flex;align-items:center;padding:2px 6px;margin:0 2px;font-size:10px;font-family:"SF Mono",Monaco,"Cascadia Code",monospace;font-weight:500;color:var(--lm-text);background:var(--lm-bg);border:1px solid var(--lm-border);border-radius:4px;box-shadow:0 1px 2px var(--lm-shadow)}@media(max-width: 768px){.lm-topbar-main{gap:12px;padding:8px 12px}.lm-topbar-section{gap:6px;padding-right:12px}.lm-section-label{display:none}.lm-topbar-shortcuts{display:none}.lm-stat-label{display:none}}`;
      
      if (typeof GM_addStyle !== 'undefined') {
        GM_addStyle(styles);
      } else {
        const styleEl = document.createElement('style');
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
      }
    }

    /**
     * Create root element for CSS variables
     */
    createRootElement() {
      // Determine dark mode
      let isDark = LinksManagerConfig.darkMode;
      if (isDark === null) {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      document.body.classList.add('lm-root');
      if (isDark) {
        document.body.classList.add('lm-dark');
      }
    }

    /**
     * Normalize a URL to extract domain and path
     */
    normalizeUrl(url) {
      try {
        const parsed = new URL(url, window.location.href);
        const domain = parsed.hostname;
        const path = parsed.pathname || '/';
        return `${parsed.protocol}//${domain}${path}`;
      } catch {
        return null;
      }
    }

    /**
     * Check if a link should be processed based on filters
     */
    shouldProcessLink(anchor) {
      const href = anchor.href;
      if (!href) return false;

      try {
        const url = new URL(href, window.location.href);
        const domain = url.hostname;
        const path = url.pathname;

        // Skip non-http links
        if (!url.protocol.startsWith('http')) return false;

        // Skip same-page anchors
        if (url.origin === window.location.origin && 
            url.pathname === window.location.pathname && 
            url.hash) return false;

        // Check domain filters
        const { includeDomains, excludeDomains } = LinksManagerConfig;
        
        if (excludeDomains.length > 0) {
          if (excludeDomains.some(d => domain.includes(d))) return false;
        }
        
        if (includeDomains.length > 0) {
          if (!includeDomains.some(d => domain.includes(d))) return false;
        }

        // Check path filters
        const { includePathPatterns, excludePathPatterns, minPathDepth } = LinksManagerConfig;
        
        if (excludePathPatterns.length > 0) {
          if (excludePathPatterns.some(p => p.test(path))) return false;
        }
        
        if (includePathPatterns.length > 0) {
          if (!includePathPatterns.some(p => p.test(path))) return false;
        }

        // Check path depth
        const pathDepth = path.split('/').filter(Boolean).length;
        if (pathDepth < minPathDepth) return false;

        return true;
      } catch {
        return false;
      }
    }

    /**
     * Collect all links on the page
     */
    collectLinks() {
      const anchors = document.querySelectorAll('a[href]');
      const linksToProcess = new Map();

      anchors.forEach(anchor => {
        // Skip if already has a badge
        if (anchor.querySelector('.lm-badge-wrapper') || 
            anchor.nextElementSibling?.classList?.contains('lm-badge-wrapper')) {
          return;
        }

        if (!this.shouldProcessLink(anchor)) return;

        const normalizedUrl = this.normalizeUrl(anchor.href);
        if (!normalizedUrl) return;

        // Group anchors by normalized URL
        if (!linksToProcess.has(normalizedUrl)) {
          linksToProcess.set(normalizedUrl, []);
        }
        linksToProcess.get(normalizedUrl).push(anchor);
      });

      return linksToProcess;
    }

    /**
     * Add loading spinner to anchor
     */
    addSpinner(anchor) {
      const spinner = LinksManagerUI.createSpinner();
      
      if (LinksManagerConfig.badgePosition === 'before') {
        anchor.parentNode.insertBefore(spinner, anchor);
      } else {
        anchor.parentNode.insertBefore(spinner, anchor.nextSibling);
      }
      
      return spinner;
    }

    /**
     * Process links in batches
     */
    async collectAndProcessLinks() {
      const linksToProcess = this.collectLinks();
      
      if (linksToProcess.size === 0) {
        console.log('[LinksManager] No links to process');
        return;
      }

      console.log(`[LinksManager] Found ${linksToProcess.size} unique links to process`);

      // Add spinners and track pending links
      linksToProcess.forEach((anchors, normalizedUrl) => {
        if (!this.processedLinks.has(normalizedUrl)) {
          this.pendingLinks.set(normalizedUrl, anchors);
          anchors.forEach(anchor => this.addSpinner(anchor));
        }
      });

      // Process in batches
      await this.processBatches();
    }

    /**
     * Process pending links in batches
     */
    async processBatches() {
      if (this.isProcessing) return;
      this.isProcessing = true;

      const urls = Array.from(this.pendingLinks.keys());
      const batchSize = LinksManagerConfig.batchSize;

      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        
        try {
          const response = await LinksManagerAPI.submitLinks(batch);
          
          response.links.forEach(link => {
            this.processedLinks.set(link.url, link);
            
            const anchors = this.pendingLinks.get(link.url);
            if (anchors) {
              anchors.forEach(anchor => this.attachBadge(anchor, link));
              this.pendingLinks.delete(link.url);
            }
          });
        } catch (error) {
          console.error('[LinksManager] Batch processing error:', error);
          
          // Remove spinners on error
          batch.forEach(url => {
            const anchors = this.pendingLinks.get(url);
            if (anchors) {
              anchors.forEach(anchor => {
                const spinner = anchor.parentNode.querySelector('.lm-badge-loading');
                if (spinner) spinner.remove();
              });
              this.pendingLinks.delete(url);
            }
          });
        }

        // Delay between batches
        if (i + batchSize < urls.length) {
          await new Promise(resolve => setTimeout(resolve, LinksManagerConfig.batchDelay));
        }
      }

      this.isProcessing = false;
    }

    /**
     * Attach badge to an anchor element
     */
    attachBadge(anchor, link) {
      // Remove spinner
      const spinner = anchor.parentNode.querySelector('.lm-badge-loading');
      if (spinner) spinner.remove();

      // Create and attach badge
      const badge = LinksManagerUI.createBadge(link, anchor);
      
      if (LinksManagerConfig.badgePosition === 'before') {
        anchor.parentNode.insertBefore(badge, anchor);
      } else {
        anchor.parentNode.insertBefore(badge, anchor.nextSibling);
      }
    }

    /**
     * Setup mutation observer for dynamic content
     */
    setupMutationObserver() {
      const observer = new MutationObserver((mutations) => {
        let hasNewLinks = false;

        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'A' || node.querySelector?.('a')) {
                hasNewLinks = true;
              }
            }
          });
        });

        if (hasNewLinks) {
          // Debounce processing
          clearTimeout(this.mutationTimeout);
          this.mutationTimeout = setTimeout(() => {
            this.collectAndProcessLinks();
          }, 500);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    /**
     * Setup WebSocket connection for real-time updates
     */
    setupWebSocket() {
      // Check if socket.io is available or load it
      const scriptUrl = `${LinksManagerConfig.apiUrl}/socket.io/socket.io.js`;
      
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.onload = () => {
        this.connectWebSocket();
      };
      script.onerror = () => {
        console.warn('[LinksManager] Could not load Socket.IO, real-time updates disabled');
      };
      document.head.appendChild(script);
    }

    /**
     * Connect to WebSocket server
     */
    connectWebSocket() {
      if (typeof io === 'undefined') return;

      this.socket = io(LinksManagerConfig.apiUrl, {
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('[LinksManager] WebSocket connected');
        
        // Subscribe to all processed link IDs
        const linkIds = Array.from(this.processedLinks.values()).map(l => l.id);
        if (linkIds.length > 0) {
          this.socket.emit('subscribe', linkIds);
        }
      });

      this.socket.on('link-changed', (link) => {
        // Update processed links cache
        this.processedLinks.set(link.url, link);
        
        // Update UI
        LinksManagerUI.handleLinkUpdate(link);
      });

      this.socket.on('disconnect', () => {
        console.log('[LinksManager] WebSocket disconnected');
      });
    }
  }

  // =================================================================
  // INITIALIZATION
  // =================================================================

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const lm = new LinksManager();
      lm.init();
    });
  } else {
    const lm = new LinksManager();
    lm.init();
  }

})();
