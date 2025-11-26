/**
 * Links Manager Backend Server
 * Express.js server with Socket.IO for real-time updates
 */

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const db = require('./database');

const app = express();
const httpServer = createServer(app);

// Configure Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Track connected clients and their subscriptions
const subscriptions = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  subscriptions.set(socket.id, new Set());

  // Subscribe to link updates
  socket.on('subscribe', (linkIds) => {
    const clientSubs = subscriptions.get(socket.id);
    if (Array.isArray(linkIds)) {
      linkIds.forEach(id => clientSubs.add(id));
    }
  });

  // Unsubscribe from link updates
  socket.on('unsubscribe', (linkIds) => {
    const clientSubs = subscriptions.get(socket.id);
    if (Array.isArray(linkIds)) {
      linkIds.forEach(id => clientSubs.delete(id));
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    subscriptions.delete(socket.id);
  });
});

/**
 * Broadcast link update to all subscribed clients
 */
function broadcastLinkUpdate(link) {
  subscriptions.forEach((linkIds, socketId) => {
    if (linkIds.has(link.id)) {
      io.to(socketId).emit('link-updated', link);
    }
  });
  // Also broadcast to all clients for cross-tab sync
  io.emit('link-changed', link);
}

// API Routes

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Submit links in batch
 * POST /api/links/batch
 * Body: { urls: string[] }
 */
app.post('/api/links/batch', (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!Array.isArray(urls)) {
      return res.status(400).json({ error: 'urls must be an array' });
    }

    const links = db.getOrCreateLinks(urls);
    res.json({ links });
  } catch (error) {
    console.error('Error in batch submit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get link by ID
 * GET /api/links/:id
 */
app.get('/api/links/:id', (req, res) => {
  try {
    const link = db.getLinkById(req.params.id);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    // Include domain stats
    const domainCount = db.getDomainLinkCount(link.domain);
    res.json({ link: { ...link, domain_link_count: domainCount } });
  } catch (error) {
    console.error('Error getting link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update link status
 * PUT /api/links/:id/status
 * Body: { status: string }
 */
app.put('/api/links/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    
    if (!Object.values(db.LINK_STATUS).includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const link = db.updateLinkStatus(req.params.id, status);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    broadcastLinkUpdate(link);
    res.json({ link });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update link priority
 * PUT /api/links/:id/priority
 * Body: { priority: number }
 */
app.put('/api/links/:id/priority', (req, res) => {
  try {
    const { priority } = req.body;
    
    if (typeof priority !== 'number') {
      return res.status(400).json({ error: 'Priority must be a number' });
    }

    const link = db.updateLinkPriority(req.params.id, priority);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    broadcastLinkUpdate(link);
    res.json({ link });
  } catch (error) {
    console.error('Error updating priority:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update link description
 * PUT /api/links/:id/description
 * Body: { description: string }
 */
app.put('/api/links/:id/description', (req, res) => {
  try {
    const { description } = req.body;
    
    if (typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }

    const link = db.updateLinkDescription(req.params.id, description);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    broadcastLinkUpdate(link);
    res.json({ link });
  } catch (error) {
    console.error('Error updating description:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Toggle link deleted (blacklist) status
 * PUT /api/links/:id/delete
 * Body: { is_deleted: boolean }
 */
app.put('/api/links/:id/delete', (req, res) => {
  try {
    const { is_deleted } = req.body;
    
    if (typeof is_deleted !== 'boolean') {
      return res.status(400).json({ error: 'is_deleted must be a boolean' });
    }

    const link = db.toggleLinkDeleted(req.params.id, is_deleted);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    broadcastLinkUpdate(link);
    res.json({ link });
  } catch (error) {
    console.error('Error toggling delete status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all links (admin endpoint)
 * GET /api/links
 */
app.get('/api/links', (req, res) => {
  try {
    const links = db.getAllLinks();
    res.json({ links });
  } catch (error) {
    console.error('Error getting all links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Links Manager Backend running on http://localhost:${PORT}`);
  console.log(`Socket.IO available at ws://localhost:${PORT}`);
});

module.exports = { app, io };
