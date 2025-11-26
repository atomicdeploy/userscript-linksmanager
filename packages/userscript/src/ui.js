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

// Export for use in the main script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinksManagerUI;
}
