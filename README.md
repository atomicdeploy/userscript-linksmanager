# Links Manager Userscript

A powerful userscript that collects and manages links on webpages with a backend API. Features include link status tracking, priority management, and real-time cross-tab synchronization.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Link Collection & Normalization**: Automatically collects links on any webpage, normalizing URLs by domain and path
- **Batch Processing**: Efficiently submits links to the backend in configurable batches
- **Visual Status Badges**: Displays elegant badges next to links showing their status (New, Processed, Good, Bad, Pending)
- **Interactive Dropdown Menu**: Rich dropdown with status controls, priority settings, and description editing
- **Priority System**: 5-level priority system (None, Low, Medium, High, Critical) with visual indicators
- **Blacklist/Delete**: Mark links as deleted with visual strikethrough styling
- **Cross-Tab Sync**: Changes sync across all open tabs using BroadcastChannel API
- **Real-Time Updates**: Optional WebSocket support for instant updates from the backend
- **Light/Dark Theme**: Automatically adapts to system preferences or manual override
- **Fully Customizable**: Modular architecture with clear configuration options

## 📁 Project Structure

```
userscript-linksmanager/
├── packages/
│   ├── backend/           # Express.js API server
│   │   ├── src/
│   │   │   ├── index.js   # Main server with Socket.IO
│   │   │   └── database.js # SQLite database module
│   │   └── package.json
│   │
│   ├── userscript/        # Userscript source
│   │   ├── src/
│   │   │   ├── main.js    # Main entry point
│   │   │   ├── config.js  # Configuration options
│   │   │   ├── api.js     # API service module
│   │   │   ├── ui.js      # UI components
│   │   │   ├── icons.js   # SVG icons
│   │   │   └── styles/
│   │   │       └── main.scss # SCSS styles
│   │   ├── dist/          # Built userscript
│   │   ├── build.js       # Build script
│   │   └── package.json
│   │
│   └── demo/              # Demo page for testing
│       ├── public/
│       │   └── index.html # Demo page with sample links
│       ├── server.js      # Demo server
│       └── package.json
│
├── package.json           # Root workspace config
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+
- A userscript manager (Tampermonkey, Greasemonkey, Violentmonkey)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/userscript-linksmanager/userscript-linksmanager.git
   cd userscript-linksmanager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the userscript**
   ```bash
   npm run build
   ```

4. **Start the backend server**
   ```bash
   npm run dev
   ```

5. **Start the demo server** (in a new terminal)
   ```bash
   npm run demo
   ```

6. **Install the userscript**
   - Open your userscript manager
   - Create a new script
   - Copy the contents of `packages/userscript/dist/linksmanager.user.js`
   - Or visit `http://localhost:8080/linksmanager.user.js`

7. **Test it out**
   - Visit `http://localhost:8080` to see the demo page
   - Links should display loading spinners, then status badges

## ⚙️ Configuration

Edit `packages/userscript/src/config.js` to customize:

```javascript
const LinksManagerConfig = {
  // Backend API URL
  apiUrl: 'http://localhost:3000',
  
  // Batch processing settings
  batchSize: 10,
  batchDelay: 100,
  
  // Domain filtering
  includeDomains: [],        // Empty = all domains
  excludeDomains: [],        // Domains to skip
  
  // Path filtering
  includePathPatterns: [],   // Regex patterns to include
  excludePathPatterns: [],   // Regex patterns to exclude
  minPathDepth: 0,           // Minimum path segments
  
  // UI settings
  badgePosition: 'after',    // 'before' or 'after' the link
  darkMode: null,            // null = auto-detect
  zIndex: 999999,
  
  // Status definitions (customize colors/icons)
  statuses: {
    new: { label: 'New', color: '#3b82f6', icon: 'sparkles' },
    processed: { label: 'Processed', color: '#22c55e', icon: 'check' },
    // ... more statuses
  }
};
```

## 🔌 API Endpoints

The backend provides the following REST API:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/links/batch` | Submit links in batch |
| `GET` | `/api/links/:id` | Get link details |
| `PUT` | `/api/links/:id/status` | Update link status |
| `PUT` | `/api/links/:id/priority` | Update link priority |
| `PUT` | `/api/links/:id/description` | Update link description |
| `PUT` | `/api/links/:id/delete` | Toggle deleted status |
| `GET` | `/api/links` | List all links |

### WebSocket Events

- `subscribe` - Subscribe to link update notifications
- `unsubscribe` - Unsubscribe from updates
- `link-changed` - Broadcasted when a link is updated

## 🎨 Customizing Styles

The userscript uses SCSS for styling. Edit `packages/userscript/src/styles/main.scss`:

```scss
// Colors
$primary-color: #3b82f6;
$success-color: #22c55e;
$warning-color: #f59e0b;
$danger-color: #ef4444;

// Light theme
$light-bg: #ffffff;
$light-text: #1e293b;

// Dark theme
$dark-bg: #1e293b;
$dark-text: #f1f5f9;

// Sizing
$badge-height: 22px;
$dropdown-width: 320px;
```

After editing, rebuild with `npm run build`.

## 🧩 Adding Custom Actions

To add custom actions to the dropdown menu, edit `packages/userscript/src/ui.js`:

```javascript
// In createDropdownMenu(), add to the actions section:
<button class="lm-action-btn" data-action="custom">
  ${this.icons.star}
  <span>Custom Action</span>
</button>

// Then handle in setupDropdownEvents():
const customBtn = dropdown.querySelector('[data-action="custom"]');
customBtn.addEventListener('click', async () => {
  // Your custom logic here
});
```

## 📦 Database Schema

SQLite database with the following schema:

```sql
CREATE TABLE links (
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
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🗺️ Roadmap

- [ ] Keyboard shortcuts for common actions
- [ ] Export/import link data
- [ ] Link categorization with tags
- [ ] Bulk operations UI
- [ ] Browser extension version
- [ ] REST API authentication
