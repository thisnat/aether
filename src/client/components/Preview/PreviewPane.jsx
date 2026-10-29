import React, { useMemo, useEffect, useRef } from 'react';
import { renderMarkdown, enhanceRenderedContent } from '../../utils/markdown';
import { Backlinks } from './Backlinks';

export function PreviewPane({
  activeNote,
  onToggleCheckbox,
  onWikilinkClick,
  onSelectNote,
}) {
  const contentRef = useRef(null);

  const renderedHtml = useMemo(() => {
    return renderMarkdown(activeNote?.content || '');
  }, [activeNote?.content]);

  useEffect(() => {
    if (contentRef.current) {
      enhanceRenderedContent(contentRef.current);
    }
  }, [renderedHtml]);

  const handleClick = (e) => {
    // 1. Task checkbox toggle
    if (e.target && e.target.classList.contains('interactive-task')) {
      const taskIdx = parseInt(e.target.dataset.taskIdx, 10);
      if (!isNaN(taskIdx)) {
        onToggleCheckbox?.(taskIdx);
      }
      return;
    }

    // 2. Wikilink click
    const wikilink = e.target.closest('.wikilink');
    if (wikilink) {
      e.preventDefault();
      const targetNote = wikilink.dataset.target;
      onWikilinkClick?.(targetNote);
    }
  };

  return (
    <div className="preview-pane">
      <div
        ref={contentRef}
        className="preview-content markdown-body"
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />

      <Backlinks
        backlinks={activeNote?.backlinks || []}
        onSelectNote={onSelectNote}
      />
    </div>
  );
}
