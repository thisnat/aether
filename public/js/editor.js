/**
 * Aether Markdown Editor Controller
 * Handles textarea interactions, auto-save, smart key bindings, and toolbar actions.
 */

class EditorController {
  constructor(options = {}) {
    this.textarea = options.textarea;
    this.onContentChange = options.onContentChange || (() => {});
    this.onSaveRequest = options.onSaveRequest || (() => {});
    this.debounceMs = options.debounceMs || 500;

    this.saveTimeout = null;
    this.isDirty = false;

    this.initTextarea();
    this.initToolbar();
  }

  initTextarea() {
    if (!this.textarea) return;

    // Listen to typing & auto-save debounce
    this.textarea.addEventListener('input', () => {
      this.isDirty = true;
      this.onContentChange(this.getValue());
      this.scheduleSave();
    });

    // Keyboard shortcuts & smart indentation
    this.textarea.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
  }

  initToolbar() {
    const toolbar = document.getElementById('markdown-toolbar');
    if (!toolbar) return;

    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      this.applyAction(action);
    });
  }

  handleKeyDown(e) {
    const { key, shiftKey, ctrlKey, metaKey } = e;
    const isCmd = ctrlKey || metaKey;

    // Ctrl+S / Cmd+S -> Immediate Save
    if (isCmd && key.toLowerCase() === 's') {
      e.preventDefault();
      this.forceSave();
      return;
    }

    // Ctrl+B -> Bold
    if (isCmd && key.toLowerCase() === 'b') {
      e.preventDefault();
      this.applyAction('bold');
      return;
    }

    // Ctrl+I -> Italic
    if (isCmd && key.toLowerCase() === 'i') {
      e.preventDefault();
      this.applyAction('italic');
      return;
    }

    // Tab key handling (Indent / Unindent)
    if (key === 'Tab') {
      e.preventDefault();
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const val = this.textarea.value;

      if (start === end) {
        // Single cursor: insert 2 spaces
        this.textarea.value = val.substring(0, start) + '  ' + val.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
      } else {
        // Multi-line selection: indent or unindent lines
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = val.indexOf('\n', end);
        const effectiveEnd = lineEnd === -1 ? val.length : lineEnd;
        const selectedText = val.substring(lineStart, effectiveEnd);
        const lines = selectedText.split('\n');

        let modified;
        if (shiftKey) {
          // Unindent
          modified = lines
            .map((line) =>
              line.startsWith('  ')
                ? line.substring(2)
                : line.startsWith(' ')
                  ? line.substring(1)
                  : line
            )
            .join('\n');
        } else {
          // Indent
          modified = lines.map((line) => '  ' + line).join('\n');
        }

        this.textarea.value = val.substring(0, lineStart) + modified + val.substring(effectiveEnd);
        this.textarea.selectionStart = lineStart;
        this.textarea.selectionEnd = lineStart + modified.length;
      }

      this.isDirty = true;
      this.onContentChange(this.getValue());
      this.scheduleSave();
      return;
    }

    // Enter key auto-lists continuation
    if (key === 'Enter') {
      const pos = this.textarea.selectionStart;
      const val = this.textarea.value;
      const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
      const currentLine = val.substring(lineStart, pos);

      // Check for task checklist: "- [ ] " or "- [x] "
      const taskMatch = currentLine.match(/^(\s*[-*+]\s+\[[ xX]\]\s+)(.*)$/);
      if (taskMatch) {
        if (taskMatch[2].trim() === '') {
          // Empty task line: clear prefix on enter
          e.preventDefault();
          this.textarea.value = val.substring(0, lineStart) + val.substring(pos);
          this.textarea.selectionStart = this.textarea.selectionEnd = lineStart;
          this.onContentChange(this.getValue());
          return;
        }
        e.preventDefault();
        const prefix = '\n' + taskMatch[1].replace(/\[[xX]\]/, '[ ]');
        this.insertAtCursor(prefix);
        return;
      }

      // Check for bullet list: "- " or "* " or "+ "
      const bulletMatch = currentLine.match(/^(\s*[-*+]\s+)(.*)$/);
      if (bulletMatch) {
        if (bulletMatch[2].trim() === '') {
          // Empty bullet line: clear
          e.preventDefault();
          this.textarea.value = val.substring(0, lineStart) + val.substring(pos);
          this.textarea.selectionStart = this.textarea.selectionEnd = lineStart;
          this.onContentChange(this.getValue());
          return;
        }
        e.preventDefault();
        this.insertAtCursor('\n' + bulletMatch[1]);
        return;
      }

      // Check for numbered list: "1. "
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        if (numMatch[3].trim() === '') {
          // Empty number line: clear
          e.preventDefault();
          this.textarea.value = val.substring(0, lineStart) + val.substring(pos);
          this.textarea.selectionStart = this.textarea.selectionEnd = lineStart;
          this.onContentChange(this.getValue());
          return;
        }
        e.preventDefault();
        const nextNum = parseInt(numMatch[2], 10) + 1;
        this.insertAtCursor(`\n${numMatch[1]}${nextNum}. `);
        return;
      }
    }

    // Auto-pair brackets & quotes
    const pairs = {
      '[': ']',
      '(': ')',
      '{': '}',
      '`': '`',
      '"': '"',
      '*': '*',
    };

    if (pairs[key]) {
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const val = this.textarea.value;

      if (start !== end) {
        // Wrap selected text
        e.preventDefault();
        const selected = val.substring(start, end);
        const wrapped = key + selected + pairs[key];
        this.textarea.value = val.substring(0, start) + wrapped + val.substring(end);
        this.textarea.selectionStart = start + 1;
        this.textarea.selectionEnd = end + 1;
        this.isDirty = true;
        this.onContentChange(this.getValue());
        this.scheduleSave();
      }
    }
  }

  insertAtCursor(text) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const val = this.textarea.value;

    this.textarea.value = val.substring(0, start) + text + val.substring(end);
    this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;

    this.isDirty = true;
    this.onContentChange(this.getValue());
    this.scheduleSave();
  }

  applyAction(action) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const val = this.textarea.value;
    const selected = val.substring(start, end);

    let replacement = '';
    let cursorOffset = 0;

    switch (action) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        cursorOffset = selected ? replacement.length : 1;
        break;
      case 'strike':
        replacement = `~~${selected || 'strikethrough'}~~`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'h1':
        replacement = `\n# ${selected || 'Heading 1'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'h2':
        replacement = `\n## ${selected || 'Heading 2'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'h3':
        replacement = `\n### ${selected || 'Heading 3'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'checklist':
        replacement = `\n- [ ] ${selected || 'Task item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'list':
        replacement = `\n- ${selected || 'List item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'numlist':
        replacement = `\n1. ${selected || 'Numbered item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'wikilink':
        replacement = `[[${selected || 'Note Title'}]]`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'link':
        replacement = `[${selected || 'link text'}](https://)`;
        cursorOffset = replacement.length - 1;
        break;
      case 'quote':
        replacement = `\n> ${selected || 'Quote'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'code':
        if (selected.includes('\n')) {
          replacement = `\n\`\`\`javascript\n${selected}\n\`\`\`\n`;
        } else {
          replacement = `\`${selected || 'code'}\``;
        }
        cursorOffset = replacement.length;
        break;
      case 'table':
        replacement = `\n| Column 1 | Column 2 |\n| :--- | :--- |\n| Item A | Item B |\n`;
        cursorOffset = replacement.length;
        break;
      default:
        return;
    }

    this.textarea.value = val.substring(0, start) + replacement + val.substring(end);
    this.textarea.focus();
    this.textarea.selectionStart = this.textarea.selectionEnd = start + cursorOffset;

    this.isDirty = true;
    this.onContentChange(this.getValue());
    this.scheduleSave();
  }

  scheduleSave() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.forceSave();
    }, this.debounceMs);
  }

  forceSave() {
    clearTimeout(this.saveTimeout);
    if (!this.isDirty) return;
    this.onSaveRequest(this.getValue());
    this.isDirty = false;
  }

  setValue(val, resetDirty = true) {
    if (this.textarea) {
      this.textarea.value = val || '';
      if (resetDirty) {
        this.isDirty = false;
        clearTimeout(this.saveTimeout);
      }
      this.onContentChange(this.getValue());
    }
  }

  getValue() {
    return this.textarea ? this.textarea.value : '';
  }

  getStats() {
    const text = this.getValue().trim();
    if (!text) {
      return { words: 0, characters: 0, sizeKb: '0 KB' };
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    const characters = text.length;
    const bytes = new Blob([text]).size;
    const sizeKb = (bytes / 1024).toFixed(1) + ' KB';
    return { words, characters, sizeKb };
  }
}

if (typeof window !== 'undefined') {
  window.EditorController = EditorController;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EditorController;
}
