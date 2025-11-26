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
  }
};

// Export for use in the main script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinksManagerUI;
}
