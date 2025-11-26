/**
 * Database module for Links Manager
 * Uses SQLite for persistent storage of link data
 */

const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, '..', 'data', 'links.db');
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL,
    path TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    priority INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    is_deleted INTEGER DEFAULT 0,
    crawl_state TEXT DEFAULT 'idle',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_links_domain ON links(domain);
  CREATE INDEX IF NOT EXISTS idx_links_status ON links(status);
  CREATE INDEX IF NOT EXISTS idx_links_url ON links(url);
  CREATE INDEX IF NOT EXISTS idx_links_crawl_state ON links(crawl_state);
`);

// Add crawl_state column if it doesn't exist (migration for existing databases)
const tableInfo = db.prepare('PRAGMA table_info(links)').all();
const hasCrawlState = tableInfo.some(col => col.name === 'crawl_state');
if (!hasCrawlState) {
  db.exec('ALTER TABLE links ADD COLUMN crawl_state TEXT DEFAULT \'idle\'');
}

/**
 * Link status constants
 */
const LINK_STATUS = {
  NEW: 'new',
  PROCESSED: 'processed',
  GOOD: 'good',
  BAD: 'bad',
  PENDING: 'pending'
};

/**
 * Crawl state constants
 */
const CRAWL_STATE = {
  IDLE: 'idle',
  QUEUED: 'queued',
  CRAWLING: 'crawling',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Normalize a URL by extracting domain and path
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const path = parsed.pathname || '/';
    const normalizedUrl = `${parsed.protocol}//${domain}${path}`;
    return { domain, path, normalizedUrl };
  } catch {
    return null;
  }
}

/**
 * Get or create a link by URL
 */
function getOrCreateLink(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return null;
  }

  const existing = db.prepare('SELECT * FROM links WHERE url = ?').get(normalized.normalizedUrl);
  if (existing) {
    return {
      ...existing,
      is_deleted: Boolean(existing.is_deleted),
      isNew: false
    };
  }

  const now = new Date().toISOString();
  const id = uuidv4();
  
  const stmt = db.prepare(`
    INSERT INTO links (id, url, domain, path, status, priority, description, is_deleted, crawl_state, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, normalized.normalizedUrl, normalized.domain, normalized.path, LINK_STATUS.NEW, 0, '', 0, CRAWL_STATE.IDLE, now, now);
  
  return {
    id,
    url: normalized.normalizedUrl,
    domain: normalized.domain,
    path: normalized.path,
    status: LINK_STATUS.NEW,
    priority: 0,
    description: '',
    is_deleted: false,
    crawl_state: CRAWL_STATE.IDLE,
    created_at: now,
    updated_at: now,
    isNew: true
  };
}

/**
 * Get multiple links by URLs (batch operation)
 */
function getOrCreateLinks(urls) {
  const results = [];
  const transaction = db.transaction((urls) => {
    for (const url of urls) {
      const link = getOrCreateLink(url);
      if (link) {
        results.push(link);
      }
    }
  });
  transaction(urls);
  return results;
}

/**
 * Get a link by ID
 */
function getLinkById(id) {
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
  if (link) {
    link.is_deleted = Boolean(link.is_deleted);
  }
  return link;
}

/**
 * Update link status
 */
function updateLinkStatus(id, status) {
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE links SET status = ?, updated_at = ? WHERE id = ?');
  stmt.run(status, now, id);
  return getLinkById(id);
}

/**
 * Update link priority
 */
function updateLinkPriority(id, priority) {
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE links SET priority = ?, updated_at = ? WHERE id = ?');
  stmt.run(priority, now, id);
  return getLinkById(id);
}

/**
 * Update link description
 */
function updateLinkDescription(id, description) {
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE links SET description = ?, updated_at = ? WHERE id = ?');
  stmt.run(description, now, id);
  return getLinkById(id);
}

/**
 * Toggle link deleted status (soft delete)
 */
function toggleLinkDeleted(id, isDeleted) {
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE links SET is_deleted = ?, updated_at = ? WHERE id = ?');
  stmt.run(isDeleted ? 1 : 0, now, id);
  return getLinkById(id);
}

/**
 * Get count of links on the same domain
 */
function getDomainLinkCount(domain) {
  const result = db.prepare('SELECT COUNT(*) as count FROM links WHERE domain = ?').get(domain);
  return result.count;
}

/**
 * Get all links (for admin/debugging)
 */
function getAllLinks() {
  return db.prepare('SELECT * FROM links ORDER BY created_at DESC').all().map(link => ({
    ...link,
    is_deleted: Boolean(link.is_deleted)
  }));
}

/**
 * Update link crawl state
 */
function updateLinkCrawlState(id, crawlState) {
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE links SET crawl_state = ?, updated_at = ? WHERE id = ?');
  stmt.run(crawlState, now, id);
  return getLinkById(id);
}

/**
 * Get link by URL
 */
function getLinkByUrl(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  
  const link = db.prepare('SELECT * FROM links WHERE url = ?').get(normalized.normalizedUrl);
  if (link) {
    link.is_deleted = Boolean(link.is_deleted);
  }
  return link;
}

/**
 * Get domain statistics
 */
function getDomainStats(domain) {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_links,
      SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
      SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) as processed_count,
      SUM(CASE WHEN status = 'good' THEN 1 ELSE 0 END) as good_count,
      SUM(CASE WHEN status = 'bad' THEN 1 ELSE 0 END) as bad_count,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN is_deleted = 1 THEN 1 ELSE 0 END) as deleted_count,
      SUM(CASE WHEN crawl_state = 'queued' THEN 1 ELSE 0 END) as queued_count,
      SUM(CASE WHEN crawl_state = 'crawling' THEN 1 ELSE 0 END) as crawling_count,
      SUM(CASE WHEN crawl_state = 'completed' THEN 1 ELSE 0 END) as completed_count
    FROM links 
    WHERE domain = ?
  `).get(domain);
  
  return {
    domain,
    total_links: stats.total_links || 0,
    by_status: {
      new: stats.new_count || 0,
      processed: stats.processed_count || 0,
      good: stats.good_count || 0,
      bad: stats.bad_count || 0,
      pending: stats.pending_count || 0
    },
    deleted_count: stats.deleted_count || 0,
    by_crawl_state: {
      queued: stats.queued_count || 0,
      crawling: stats.crawling_count || 0,
      completed: stats.completed_count || 0
    }
  };
}

/**
 * Get total pages count
 */
function getTotalPagesCount() {
  const result = db.prepare('SELECT COUNT(*) as count FROM links').get();
  return result.count || 0;
}

module.exports = {
  LINK_STATUS,
  CRAWL_STATE,
  normalizeUrl,
  getOrCreateLink,
  getOrCreateLinks,
  getLinkById,
  getLinkByUrl,
  updateLinkStatus,
  updateLinkPriority,
  updateLinkDescription,
  toggleLinkDeleted,
  updateLinkCrawlState,
  getDomainLinkCount,
  getDomainStats,
  getTotalPagesCount,
  getAllLinks
};
