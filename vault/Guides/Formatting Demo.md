# 🎨 Formatting Demo

Here is a quick overview of how Aether renders rich Markdown.

## Wikilinks & Internal Navigation
You can link to any note in your vault using double brackets:
- Back to home: [[Welcome to Aether]]
- Quick setup: [[Quick Start]]

If you click a wikilink to a note that doesn't exist yet, Aether will offer to create it for you on the spot!

---

## Code Syntax Highlighting

```javascript
// Aether network sync snippet
const { getNetworkAddresses } = require('./lib/network');

const { primaryIp } = getNetworkAddresses();
console.log(`Aether live on http://${primaryIp}:3000`);
```

```python
# Python list comprehension example
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci(8)))
```

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
