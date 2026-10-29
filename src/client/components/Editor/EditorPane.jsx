import React, { useRef, useEffect } from 'react';
import { MarkdownToolbar } from './MarkdownToolbar';

export function EditorPane({ activeNote, onContentChange, onTitleRename, onForceSave }) {
  const textareaRef = useRef(null);
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (titleInputRef.current && activeNote) {
      titleInputRef.current.value = activeNote.title || '';
    }
  }, [activeNote?.title]);

  const insertAtCursor = (prefix, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.substring(start, end) || defaultText;

    const replacement = prefix + selected + suffix;
    const newVal = val.substring(0, start) + replacement + val.substring(end);

    textarea.value = newVal;
    textarea.selectionStart = start + prefix.length;
    textarea.selectionEnd = start + prefix.length + selected.length;
    textarea.focus();

    onContentChange(newVal);
  };

  const handleToolbarAction = (action) => {
    switch (action) {
      case 'bold':
        insertAtCursor('**', '**', 'bold text');
        break;
      case 'italic':
        insertAtCursor('*', '*', 'italic text');
        break;
      case 'strike':
        insertAtCursor('~~', '~~', 'strikethrough text');
        break;
      case 'h1':
        insertAtCursor('# ', '', 'Heading 1');
        break;
      case 'h2':
        insertAtCursor('## ', '', 'Heading 2');
        break;
      case 'h3':
        insertAtCursor('### ', '', 'Heading 3');
        break;
      case 'checklist':
        insertAtCursor('- [ ] ', '', 'Task item');
        break;
      case 'list':
        insertAtCursor('- ', '', 'List item');
        break;
      case 'numlist':
        insertAtCursor('1. ', '', 'Numbered item');
        break;
      case 'wikilink':
        insertAtCursor('[[', ']]', 'Note title');
        break;
      case 'link':
        insertAtCursor('[', '](https://)', 'Link text');
        break;
      case 'quote':
        insertAtCursor('> ', '', 'Quote text');
        break;
      case 'code':
        insertAtCursor('```\n', '\n```', 'code here');
        break;
      case 'table':
        insertAtCursor('\n| Column 1 | Column 2 |\n| :--- | :--- |\n| Item 1 | Item 2 |\n');
        break;
      default:
        break;
    }
  };

  const handleKeyDown = (e) => {
    const { key, shiftKey, ctrlKey, metaKey } = e;
    const isCmd = ctrlKey || metaKey;
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (isCmd && key.toLowerCase() === 's') {
      e.preventDefault();
      onForceSave?.();
      return;
    }

    if (isCmd && key.toLowerCase() === 'b') {
      e.preventDefault();
      handleToolbarAction('bold');
      return;
    }

    if (isCmd && key.toLowerCase() === 'i') {
      e.preventDefault();
      handleToolbarAction('italic');
      return;
    }

    if (key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      if (start === end) {
        textarea.value = val.substring(0, start) + '  ' + val.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      } else {
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = val.indexOf('\n', end);
        const effectiveEnd = lineEnd === -1 ? val.length : lineEnd;
        const selectedText = val.substring(lineStart, effectiveEnd);
        const lines = selectedText.split('\n');

        let modified;
        if (shiftKey) {
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
          modified = lines.map((line) => '  ' + line).join('\n');
        }

        textarea.value = val.substring(0, lineStart) + modified + val.substring(effectiveEnd);
        textarea.selectionStart = lineStart;
        textarea.selectionEnd = lineStart + modified.length;
      }

      onContentChange(textarea.value);
      return;
    }

    if (key === 'Enter') {
      const pos = textarea.selectionStart;
      const val = textarea.value;
      const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
      const currentLine = val.substring(lineStart, pos);

      // Task checklist: "- [ ] " or "- [x] "
      const taskMatch = currentLine.match(/^(\s*[-*+]\s+\[[ xX]\]\s+)(.*)$/);
      if (taskMatch) {
        if (taskMatch[2].trim() === '') {
          e.preventDefault();
          textarea.value = val.substring(0, lineStart) + val.substring(pos);
          textarea.selectionStart = textarea.selectionEnd = lineStart;
          onContentChange(textarea.value);
          return;
        }
        e.preventDefault();
        const prefix = '\n' + taskMatch[1].replace(/\[[xX]\]/, '[ ]');
        insertAtCursor(prefix);
        return;
      }

      // Bullet list: "- " or "* " or "+ "
      const bulletMatch = currentLine.match(/^(\s*[-*+]\s+)(.*)$/);
      if (bulletMatch) {
        if (bulletMatch[2].trim() === '') {
          e.preventDefault();
          textarea.value = val.substring(0, lineStart) + val.substring(pos);
          textarea.selectionStart = textarea.selectionEnd = lineStart;
          onContentChange(textarea.value);
          return;
        }
        e.preventDefault();
        insertAtCursor('\n' + bulletMatch[1]);
        return;
      }

      // Numbered list: "1. "
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        if (numMatch[3].trim() === '') {
          e.preventDefault();
          textarea.value = val.substring(0, lineStart) + val.substring(pos);
          textarea.selectionStart = textarea.selectionEnd = lineStart;
          onContentChange(textarea.value);
          return;
        }
        e.preventDefault();
        const nextNum = parseInt(numMatch[2], 10) + 1;
        insertAtCursor(`\n${numMatch[1]}${nextNum}. `);
        return;
      }
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onTitleRename(titleInputRef.current.value);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="editor-pane">
      <div className="note-top-header">
        <div className="title-input-wrapper">
          <input
            ref={titleInputRef}
            id="note-title-input"
            type="text"
            placeholder={activeNote ? 'Untitled Note' : 'No note selected'}
            disabled={!activeNote}
            defaultValue={activeNote?.title || ''}
            onKeyDown={handleTitleKeyDown}
            onBlur={() => onTitleRename(titleInputRef.current?.value || '')}
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        <MarkdownToolbar onAction={handleToolbarAction} />
      </div>

      <textarea
        ref={textareaRef}
        id="markdown-editor"
        placeholder={
          activeNote
            ? 'Type markdown here... You can use [[Wikilinks]] to link to other notes.'
            : 'Select or create a note to begin...'
        }
        disabled={!activeNote}
        value={activeNote?.content ?? ''}
        onChange={(e) => onContentChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck="true"
      />
    </div>
  );
}
