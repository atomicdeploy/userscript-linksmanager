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

// Export for use in the main script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinksManagerConfig;
}
