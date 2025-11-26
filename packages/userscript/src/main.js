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
  
  // __CONFIG_PLACEHOLDER__

  // =================================================================
  // EMBEDDED API (from api.js)
  // =================================================================
  
  // __API_PLACEHOLDER__

  // =================================================================
  // EMBEDDED ICONS (from icons.js)
  // =================================================================
  
  // __ICONS_PLACEHOLDER__

  // =================================================================
  // EMBEDDED UI (from ui.js)
  // =================================================================
  
  // __UI_PLACEHOLDER__

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
      const styles = `__STYLES_PLACEHOLDER__`;
      
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
