import React from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Link,
  Quote,
  Code,
  Table,
} from 'lucide-react';

export function MarkdownToolbar({ onAction }) {
  return (
    <div className="markdown-toolbar" onMouseDown={(e) => e.preventDefault()}>
      <button type="button" onClick={() => onAction('bold')} title="Bold (Ctrl+B)">
        <Bold size={13} />
      </button>
      <button type="button" onClick={() => onAction('italic')} title="Italic (Ctrl+I)">
        <Italic size={13} />
      </button>
      <button type="button" onClick={() => onAction('strike')} title="Strikethrough">
        <Strikethrough size={13} />
      </button>

      <span className="toolbar-sep" />

      <button type="button" onClick={() => onAction('h1')} title="Heading 1">
        <Heading1 size={13} />
      </button>
      <button type="button" onClick={() => onAction('h2')} title="Heading 2">
        <Heading2 size={13} />
      </button>
      <button type="button" onClick={() => onAction('h3')} title="Heading 3">
        <Heading3 size={13} />
      </button>

      <span className="toolbar-sep" />

      <button type="button" onClick={() => onAction('checklist')} title="Checklist task">
        <CheckSquare size={13} />
      </button>
      <button type="button" onClick={() => onAction('list')} title="Bullet list">
        <List size={13} />
      </button>
      <button type="button" onClick={() => onAction('numlist')} title="Numbered list">
        <ListOrdered size={13} />
      </button>

      <span className="toolbar-sep" />

      <button type="button" onClick={() => onAction('wikilink')} title="Internal wikilink [[Note]]">
        [[ ]]
      </button>
      <button type="button" onClick={() => onAction('link')} title="Web link">
        <Link size={13} />
      </button>
      <button type="button" onClick={() => onAction('quote')} title="Quote block">
        <Quote size={13} />
      </button>
      <button type="button" onClick={() => onAction('code')} title="Code block">
        <Code size={13} />
      </button>
      <button type="button" onClick={() => onAction('table')} title="Insert table">
        <Table size={13} />
      </button>
    </div>
  );
}
