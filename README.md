# ▲ Aether

> A minimal, distraction-free markdown note-taking app built with Node.js and React, focused on seamless local-network sharing, Obsidian-compatible `.md` file handling, and interactive node graph visualization.

---

## ✨ Features

- **🌐 Zero-Config Local Network Sharing**
  - Automatically detects your local Wi-Fi / LAN IP (e.g. `192.168.1.178:3000`).
  - Terminal prints both **Local** and **Network** URLs, plus a **QR Code** you can scan with your phone's camera.
  - In-app **Share on Network** modal with a high-resolution QR code and 1-click link copying.
  - Real-time synchronization across phones, tablets, and computers on the same Wi-Fi using WebSockets.
  - Live active peer counter (know how many devices are connected).

- **📝 100% Obsidian Compatible & Node Graph View**
  - All notes are saved directly as standard `.md` files in the `./vault` directory on disk.
  - External changes (from Obsidian, VS Code, or file manager) are auto-detected via `chokidar` and live-reloaded.
  - **Interactive Node Graph View**: Hardware-accelerated 2D Canvas force-directed graph with zero-idle CPU overhead. Visualizes all interconnected documents as glowing nodes and references as link edges.
  - **Local Graph & Hover Preview**: Inline local graph showing immediate references for the active document, plus floating hover preview cards when hovering over `[[Wikilinks]]` or graph nodes.
  - **Internal Wikilinks**: Link notes using double brackets like `[[Quick Start]]` or `[[Projects/Ideas]]`. If a linked note doesn't exist yet, click it to create it on the spot.
  - **Interactive Checklists**: `- [ ]` and `- [x]` can be checked or unchecked directly inside the rendered preview, updating the raw markdown file automatically.
  - **Backlinks (Linked References)**: Automatically detects and displays other notes that link to the current note.

- **🎨 JSON-Driven Theme Engine & Refined Workspace (React + Vite)**
  - Developer- and mod-friendly theme architecture configured purely via JSON files in `src/client/themes/`.
  - Built-in esoteric themes (`Tabula`, `Rhizome`, `Ephemera`) with distinct typography, borders, and graph color schemes.
  - Topbar Theme Picker dropdown with color swatches, Light/Dark mode toggles, and instant `localStorage` persistence.
  - **Three Viewing Modes**:
    - `◫ Split`: Side-by-side live editor and rendered markdown preview with resizable divider.
    - `✏️ Edit`: Focused distraction-free markdown writing.
    - `👁 Preview`: Clean reading mode with interactive checkboxes, inline local graph, and backlinks.
  - **Markdown Toolbar & Smart Textarea**:
    - Tab / Shift+Tab for 2-space indentation and unindentation.
    - Automatic continuation of bullet lists `- `, numbered lists `1. `, and checklists `- [ ] `.
    - Syntax-highlighted code blocks with 1-click Copy button.
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

_(Running `npm start` automatically builds the React client and launches the server)._

---

## 🎨 Theme System

Aether features a JSON-driven theme architecture. Themes are defined as standalone JSON files in `src/client/themes/`, making it easy to tweak styles or add custom themes:

- **Tabula**: A warm editorial workspace inspired by thoughtful publishing, featuring warm paper backgrounds, rounded geometry, and subtle amber accents.
- **Rhizome**: Precision hypertext and network-archive styling with crisp borders, tabular contrast, and subtle node connections.
- **Ephemera**: Stark typographic minimalism with brutalist monochrome borders, square geometry, and monospace metadata accents.

Switch themes or toggle between Light and Dark mode anytime using the palette dropdown in the top header bar.

---

## ⌨️ Keyboard Shortcuts

| Shortcut                      | Description                                   |
| :---------------------------- | :-------------------------------------------- |
| **Ctrl + S** (or **Cmd + S**) | Save active note _(auto-save is also active)_ |
| **Ctrl + K** / **Ctrl + P**   | Open Quick Switcher / Search palette          |
| **Ctrl + N**                  | Create a new note                             |
| **Ctrl + E**                  | Toggle between Edit and Preview modes         |
| **Ctrl + \\**                 | Toggle sidebar visibility                     |
| **Ctrl + B**                  | Bold text selection                           |
| **Ctrl + I**                  | Italic text selection                         |
| **Tab** / **Shift + Tab**     | Indent / unindent selection (2 spaces)        |
| **Esc**                       | Close any active modal or search box          |

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

---

## 🧹 Code Formatting

Format all codebase files using Prettier:

```bash
# Automatically format all files:
npm run format

# Check formatting status:
npm run format:check
```
