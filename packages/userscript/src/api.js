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

// Export for use in the main script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinksManagerAPI;
}
