const fs = require('fs');
const path = require('path');

/**
 * Creates initial welcome and guide notes if the vault folder is empty.
 */
function createInitialNotesIfEmpty(vaultDir) {
  if (!fs.existsSync(vaultDir)) {
    fs.mkdirSync(vaultDir, { recursive: true });
  }

  const existing = fs.readdirSync(vaultDir).filter(f => !f.startsWith('.'));
  if (existing.length > 0) return;

  const welcomeNote = `# ✧ Welcome to Aether

**Aether** is a minimal, local-network markdown note-taking app designed for simplicity, privacy, and seamless sharing across all your devices.

---

### 🌐 Real-Time Local Network Sharing
- **Zero Configuration**: Aether automatically binds to your local Wi-Fi or Ethernet.
- **Cross-Device Ready**: Open the network URL or scan the QR code on your phone, tablet, or another computer on the same network.
- **No Cloud Required**: Your notes stay 100% on this local machine. No accounts, no subscriptions, no third-party servers.

### 📝 Obsidian & Plain Markdown Compatible
- All notes are saved directly as standard \`.md\` files in your \`./vault\` folder.
- You can open this vault directly in **Obsidian**, **VS Code**, or any text editor — any changes made externally are instantly synchronized in real time!
- Full support for:
  - **Internal Wikilinks**: Link other notes with \`[[Quick Start]]\` or \`[[Guides/Formatting Demo]]\`.
  - **Interactive Checklists**: Click checkboxes right in the preview to update your notes!
  - **Code Highlighting**: Multi-language syntax highlighting with one-click copy.
  - **Search & Quick Switcher**: Jump anywhere with \`Ctrl + K\` (or \`Ctrl + P\`).

### ⌨️ Handy Keyboard Shortcuts
| Shortcut | Action |
| :--- | :--- |
| **Ctrl + S** | Save note immediately *(auto-save is also active)* |
| **Ctrl + K** / **Ctrl + P** | Quick switcher / Search notes |
| **Ctrl + N** | Create new note |
| **Ctrl + E** | Toggle Edit / Preview mode |
| **Ctrl + \\** | Toggle sidebar visibility |

---

*Try clicking on [[Quick Start]] to see how internal wikilinks work, or scan the QR code in the top bar with your phone!*
`;

  const quickStartNote = `# ⚡ Quick Start Guide

Welcome to your second note in Aether!

### 1. Connecting your Phone or Tablet
1. Make sure your phone is connected to the same Wi-Fi network as this computer.
2. Click the **"Share on Network"** button in the top navigation bar (or look at the terminal where you ran \`npm start\`).
3. Point your camera at the QR code, or type the network URL in your phone's browser.
4. You can now read, search, and edit your notes from your mobile device!

### 2. Organizing with Folders
- Click the **"New Folder"** icon in the left sidebar to group notes into categories (e.g. *Journal*, *Projects*, *Work*).
- Drag-and-drop or use the rename option to organize your notes.

### 3. Checklists & Tasks
Here are some things to try:
- [x] Started Aether server
- [ ] Connect a phone or second device via the Network QR code
- [ ] Try creating your first note with **Ctrl + N**
- [ ] Check out [[Guides/Formatting Demo]] for tables, code blocks, and markdown styles

*Click any checkbox above in the preview window to see it update the raw markdown file instantly!*
`;

  const demoDir = path.join(vaultDir, 'Guides');
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
  }

  const formattingDemo = `# 🎨 Formatting Demo

Here is a quick overview of how Aether renders rich Markdown.

## Wikilinks & Internal Navigation
You can link to any note in your vault using double brackets:
- Back to home: [[Welcome to Aether]]
- Quick setup: [[Quick Start]]

If you click a wikilink to a note that doesn't exist yet, Aether will offer to create it for you on the spot!

---

## Code Syntax Highlighting

\`\`\`javascript
// Aether network sync snippet
console.log("Aether live on local network");
\`\`\`

\`\`\`python
# Python list comprehension example
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci(8)))
\`\`\`

---

## Quotes & Blockquotes

> "Simplicity is the prerequisite for reliability."
> — *Edsger W. Dijkstra*

---

## Tables

| Feature | Aether | Cloud Notes |
| :--- | :---: | :---: |
| **Local-first (plain .md)** | ✅ Yes | ❌ Proprietary |
| **Local Wi-Fi Sharing** | ✅ Instant | ❌ Needs Internet |
| **Obsidian Compatible** | ✅ 100% | ❌ No |
| **Zero Account Required** | ✅ Yes | ❌ Requires login |
| **Clean & Minimal UI** | ✅ Built-in | ⚠️ Varies |
`;

  fs.writeFileSync(path.join(vaultDir, 'Welcome to Aether.md'), welcomeNote, 'utf-8');
  fs.writeFileSync(path.join(vaultDir, 'Quick Start.md'), quickStartNote, 'utf-8');
  fs.writeFileSync(path.join(demoDir, 'Formatting Demo.md'), formattingDemo, 'utf-8');
}

module.exports = {
  createInitialNotesIfEmpty,
};
