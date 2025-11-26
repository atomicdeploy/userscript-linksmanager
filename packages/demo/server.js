/**
 * Demo Server for Links Manager
 * 
 * Serves a demo page with sample links to test the userscript.
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.DEMO_PORT || 8080;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve userscript for installation
app.get('/linksmanager.user.js', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'userscript', 'dist', 'linksmanager.user.js'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Demo server running at http://localhost:${PORT}`);
  console.log(`Install userscript from: http://localhost:${PORT}/linksmanager.user.js`);
});
