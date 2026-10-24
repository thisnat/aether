# ▲ Aether

> A minimal, distraction-free markdown note-taking app built with Node.js, focused on seamless local-network sharing and Obsidian-compatible `.md` file handling.

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

- **🎨 Clean, Minimal & Fast UI**
  - Modern typography and distraction-free workspace inspired by Obsidian, iA Writer, and Notion.
  - **Three Viewing Modes**:
    - `◫ Split`: Side-by-side live editor and rendered markdown preview.
    - `✏️ Edit`: Focused distraction-free markdown writing.
    - `👁 Preview`: Clean reading mode with interactive checkboxes.
  - **Markdown Toolbar & Smart Textarea**:
    - Auto-pairing of brackets `()`, `[]`, `{}`, quotes `""`, and markdown tags `**`.
    - Tab / Shift+Tab for 2-space indentation and unindentation.
    - Automatic continuation of bullet lists `- `, numbered lists `1. `, and checklists `- [ ] `.
    - Syntax-highlighted code blocks with 1-click Copy button.
  - **Dark & Light Modes**: Seamless toggle with persistent preference.
  - **Mobile Ready**: Fully responsive with slide-out navigation drawer for mobile browsers.

- **🔍 Quick Switcher & Full-Text Search (`Ctrl + K` / `Ctrl + P`)**
  - Instant fuzzy search across titles and note contents.
  - Keyboard navigation with Arrow keys and Enter to open.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

When you run `npm start`, Aether starts the engine, binds to all network interfaces (`0.0.0.0`), and prints the startup banner with links and a QR code:

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   ▲  E  T  H  E  R                                           │
  │   Local-Network Markdown Note Engine                         │
  │                                                              │
  │   ●  Local:    http://localhost:3000                         │
  │   ●  Network:  http://192.168.1.178:3000                     │
  │                                                              │
  │   Scan the QR code below on mobile to open notes instantly   │
  └──────────────────────────────────────────────────────────────┘

    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    █ ▄▄▄▄▄ ██▀▀▄▄▄██▄█ ▄▄▄▄▄ █
    █ █   █ █▀███ ▀ ▀ █ █   █ █
    █ █▄▄▄█ █▄▄█▀▀▀ █▀█ █▄▄▄█ █
    ...
```

- On your computer: Open **`http://localhost:3000`** in your browser.
- On your phone or tablet: Make sure you're on the same Wi-Fi, then scan the terminal QR code or visit **`http://<your-lan-ip>:3000`**.

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
| **Tab** / **Shift + Tab** | Indent / unindent selection |
| **Esc** | Close any active modal or search box |

---

## 📁 Vault Structure

All notes live in plain `.md` files inside `./vault/`:

```
aether/
├── vault/                         <-- Your plain markdown files
│   ├── Welcome to Aether.md
│   ├── Quick Start.md
│   └── Guides/
│       └── Formatting Demo.md
├── public/                        <-- Clean minimal web UI
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       ├── editor.js
│       ├── markdown.js
│       └── socket.js
├── lib/
│   ├── vault.js                   <-- File system & markdown handling
│   └── network.js                 <-- LAN IP resolution & QR codes
└── server.js                      <-- Express + WebSockets server
```

You can point Obsidian or any text editor directly at the `vault/` folder. Any notes you add, edit, or delete from external tools are instantly synchronized across all devices in real time.

---

## ⚙️ Custom Configuration

You can customize the port or vault location using flags or environment variables:

```bash
# Change port (default: 3000)
node server.js --port 8080

# Specify custom vault directory
node server.js --vault "D:/MyObsidianVault"

# Or using environment variables:
PORT=8080 VAULT_DIR="D:/MyObsidianVault" npm start
```

---

## 🧪 Testing

Run automated tests verifying note creation, folder management, search, and deletion:
```bash
npm test
```
