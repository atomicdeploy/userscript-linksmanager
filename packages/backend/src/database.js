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
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_links_domain ON links(domain);
  CREATE INDEX IF NOT EXISTS idx_links_status ON links(status);
  CREATE INDEX IF NOT EXISTS idx_links_url ON links(url);
`);

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
    INSERT INTO links (id, url, domain, path, status, priority, description, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, normalized.normalizedUrl, normalized.domain, normalized.path, LINK_STATUS.NEW, 0, '', 0, now, now);
  
  return {
    id,
    url: normalized.normalizedUrl,
    domain: normalized.domain,
    path: normalized.path,
    status: LINK_STATUS.NEW,
    priority: 0,
    description: '',
    is_deleted: false,
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

module.exports = {
  LINK_STATUS,
  normalizeUrl,
  getOrCreateLink,
  getOrCreateLinks,
  getLinkById,
  updateLinkStatus,
  updateLinkPriority,
  updateLinkDescription,
  toggleLinkDeleted,
  getDomainLinkCount,
  getAllLinks
};
