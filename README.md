# ▲ Aether

> A minimal, distraction-free markdown note-taking app built with Node.js and React, focused on seamless local-network sharing and Obsidian-compatible `.md` file handling.

---

## ✨ Features

- **🌐 Zero-Config Local Network Sharing**
  - Automatically detects your local Wi-Fi / LAN IP (e.g. `192.168.1.178:3000`).
  - Terminal prints both **Local** and **Network** URLs, plus a **QR Code** you can scan with your phone's camera.
  - In-app **Share on Network** modal with a high-resolution QR code and 1-click link copying.
  - Real-time synchronization across phones, tablets, and computers on the same Wi-Fi using WebSockets.
  - Live active peer counter (know how many devices are connected).

- **📝 100% Obsidian Compatible**
  - All notes are saved directly as standard `.md` files in the `./vault` directory on disk.
  - External changes (from Obsidian, VS Code, or file manager) are auto-detected via `chokidar` and live-reloaded.
  - **Internal Wikilinks**: Link notes using double brackets like `[[Quick Start]]` or `[[Projects/Ideas]]`. If a linked note doesn't exist yet, click it to create it on the spot.
  - **Interactive Checklists**: `- [ ]` and `- [x]` can be checked or unchecked directly inside the rendered preview, updating the raw markdown file automatically.
  - **Backlinks (Linked References)**: Automatically detects and displays other notes that link to the current note.

- **🎨 Clean, Modern & Modular UI (React + Vite)**
  - Modern typography and distraction-free workspace inspired by Obsidian, iA Writer, and Notion.
  - **Three Viewing Modes**:
    - `◫ Split`: Side-by-side live editor and rendered markdown preview with resizable divider.
    - `✏️ Edit`: Focused distraction-free markdown writing.
    - `👁 Preview`: Clean reading mode with interactive checkboxes and backlinks.
  - **Markdown Toolbar & Smart Textarea**:
    - Tab / Shift+Tab for 2-space indentation and unindentation.
    - Automatic continuation of bullet lists `- `, numbered lists `1. `, and checklists `- [ ] `.
    - Syntax-highlighted code blocks with 1-click Copy button.
  - **Dark & Light Modes**: Seamless toggle with persistent preference and matching syntax themes.
  - **Mobile Ready**: Fully responsive with slide-out navigation drawer for mobile browsers.

- **🔍 Quick Switcher & Full-Text Search (`Ctrl + K` / `Ctrl + P`)**
  - Instant fuzzy search across titles and note contents with line snippets.
  - Keyboard navigation with Arrow keys and Enter to open.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
Run both backend and client with hot-module replacement (HMR):
```bash
npm run dev
```

### 3. Production Build & Start
```bash
npm start
```
*(Running `npm start` automatically builds the React client and launches the server).*

---

## 📁 Project Architecture & Folder Structure

```
aether/
├── src/
│   ├── server/                         # Modular Node.js / Express / WebSocket backend
│   │   ├── config/                     # CLI flags & environment variables parser
│   │   ├── controllers/                # Thin HTTP request adapters (vault, network)
│   │   ├── routes/                     # Clean Express route declarations
│   │   ├── services/                   # Business logic (vault filesystem, websockets, chokidar watcher)
│   │   ├── utils/                      # Network IP resolution, startup banner, note seeder
│   │   ├── app.js                      # Express configuration & static serving
│   │   └── index.js                    # Server lifecycle & graceful shutdown
│   │
│   └── client/                         # Declarative, high-performance React + Vite frontend
│       ├── components/
│       │   ├── Header/                 # Topbar, breadcrumb, mode switcher, theme toggle
│       │   ├── Sidebar/                # File tree, folders, notes, search trigger
│       │   ├── Editor/                 # Note title input, markdown toolbar, smart textarea
│       │   ├── Preview/                # Rendered markdown, task checkboxes, backlinks
│       │   ├── Modals/                 # Network QR modal, Quick switcher (Ctrl+K), Prompts
│       │   └── Common/                 # Status bar, resizer, toast notifications
│       ├── hooks/                      # Custom hooks (useVault, useWebSocket, useTheme, useKeyboardShortcuts)
│       ├── services/                   # REST API client & WebSocket client
│       ├── utils/                      # Markdown parser, wikilinks, formatting stats
│       ├── styles/                     # Modular CSS (variables, base, components, markdown)
│       ├── App.jsx                     # Root application coordinator
│       └── main.jsx                    # React entry point
│
├── dist/                               # Production-built client bundle (auto-generated)
├── vault/                              # Plain markdown files (Obsidian-compatible)
├── tests/                              # Automated integration tests
├── server.js                           # Root entrypoint delegate
└── vite.config.mjs                     # Vite build & proxy configuration
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| **Ctrl + S** (or **Cmd + S**) | Save active note *(auto-save is also active)* |
| **Ctrl + K** / **Ctrl + P** | Open Quick Switcher / Search palette |
| **Ctrl + N** | Create a new note |
| **Ctrl + E** | Toggle between Edit and Preview modes |
| **Ctrl + \\** | Toggle sidebar visibility |
| **Ctrl + B** | Bold text selection |
| **Ctrl + I** | Italic text selection |
| **Tab** / **Shift + Tab** | Indent / unindent selection (2 spaces) |
| **Esc** | Close any active modal or search box |

---

## ⚙️ Custom Configuration

You can customize the port or vault location using flags or environment variables:

```bash
# Change port (default: 3000)
node server.js --port 8080

# Specify custom vault directory
node server.js --vault "/path/to/MyObsidianVault"

# Or using environment variables:
PORT=8080 VAULT_DIR="/path/to/MyObsidianVault" npm start
```

---

## 🧪 Testing

Run automated tests verifying note creation, folder management, rename, search, and deletion:
```bash
npm test
```
