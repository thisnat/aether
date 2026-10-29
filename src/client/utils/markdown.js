import { marked } from 'marked';
import hljs from 'highlight.js/lib/common';

// Configure marked options
marked.use({
  gfm: true,
  breaks: true,
});

/**
 * Renders raw markdown into safe HTML with:
 * 1. Obsidian wikilinks: [[Note Name]] or [[Folder/Note Name|Custom Text]]
 * 2. Interactive tasklists
 */
export function renderMarkdown(markdownText = '') {
  if (!markdownText) return '<div class="muted">Empty note. Start typing...</div>';

  // 1. Pre-process Obsidian Wikilinks
  const processed = markdownText.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, alias) => {
    const cleanTarget = target.trim();
    const displayText = alias ? alias.trim() : cleanTarget;
    return `<a class="wikilink" data-target="${escapeHtml(cleanTarget)}" title="Go to note: ${escapeHtml(cleanTarget)}">${escapeHtml(displayText)}</a>`;
  });

  // 2. Render markdown to HTML using marked
  let html = '';
  try {
    html = marked.parse(processed);
  } catch (e) {
    console.error('Markdown parse error:', e);
    html = `<div class="error-msg">Error rendering markdown: ${escapeHtml(e.message)}</div>`;
  }

  // 3. Post-process task lists to make checkboxes interactive
  let taskIndex = 0;
  html = html.replace(/<li(?:\s+class="([^"]*)")?>\s*<input\s+([^>]*?)type="checkbox"([^>]*?)>/gi, (match, liClass, before, after) => {
    const isChecked = before.includes('checked') || after.includes('checked');
    const idx = taskIndex++;
    const fullLiClass = (liClass ? liClass + ' ' : '') + 'task-list-item';
    return `<li class="${fullLiClass}"><input type="checkbox" class="interactive-task" data-task-idx="${idx}" ${isChecked ? 'checked' : ''}>`;
  });

  return html;
}

/**
 * Highlights code blocks in a rendered container and adds "Copy" buttons.
 */
export function enhanceRenderedContent(containerElement) {
  if (!containerElement) return;

  // Highlight code blocks
  containerElement.querySelectorAll('pre code').forEach((block) => {
    try {
      hljs.highlightElement(block);
    } catch {
      // Fallback gracefully
    }
  });

  // Inject 1-click Copy button
  containerElement.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const codeText = pre.querySelector('code')?.innerText || '';
      try {
        await navigator.clipboard.writeText(codeText);
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      } catch {
        btn.textContent = 'Failed';
      }
    });
    pre.appendChild(btn);
  });
}

/**
 * Toggles the n-th checkbox inside a raw markdown string.
 */
export function toggleCheckboxInMarkdown(rawMarkdown, targetIndex) {
  const taskRegex = /^(\s*[-*+]\s+\[)([ xX])(\]\s+.*)$/gm;
  let currentIndex = 0;

  return rawMarkdown.replace(taskRegex, (line, prefix, checkState, suffix) => {
    if (currentIndex === targetIndex) {
      currentIndex++;
      const newState = (checkState.trim() === 'x' || checkState.trim() === 'X') ? ' ' : 'x';
      return `${prefix}${newState}${suffix}`;
    }
    currentIndex++;
    return line;
  });
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
