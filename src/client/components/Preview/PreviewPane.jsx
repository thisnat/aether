import React, { useMemo, useEffect, useRef, useState } from 'react';
import { renderMarkdown, enhanceRenderedContent } from '../../utils/markdown';
import { Backlinks } from './Backlinks';
import { LocalGraph } from '../Graph/LocalGraph';
import { HoverPreview } from './HoverPreview';

export function PreviewPane({
  activeNote,
  graphData,
  isDark = true,
  theme = 'tabula',
  onToggleCheckbox,
  onWikilinkClick,
  onSelectNote,
  onOpenGlobalGraph,
}) {
  const contentRef = useRef(null);
  const [hoverTarget, setHoverTarget] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const renderedHtml = useMemo(() => {
    return renderMarkdown(activeNote?.content || '');
  }, [activeNote?.content]);

  useEffect(() => {
    if (contentRef.current) {
      enhanceRenderedContent(contentRef.current);
    }
  }, [renderedHtml]);

  // Lookup map for fast target resolution
  const targetMap = useMemo(() => {
    const map = new Map();
    if (graphData?.nodes) {
      for (const node of graphData.nodes) {
        map.set(node.title.toLowerCase(), node.path);
        map.set(node.path.toLowerCase(), node.path);
        map.set(node.path.replace(/\.md$/i, '').toLowerCase(), node.path);
      }
    }
    return map;
  }, [graphData]);

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
      setHoverTarget(null);
      onWikilinkClick?.(targetNote);
    }
  };

  // Hover detection on wikilinks
  const handleMouseMove = (e) => {
    const wikilink = e.target.closest('.wikilink');
    if (wikilink) {
      clearTimeout(hoverTimeoutRef.current);
      const raw = (wikilink.dataset.target || '').trim().toLowerCase();
      const resolvedPath = targetMap.get(raw);
      if (resolvedPath) {
        setHoverTarget({
          path: resolvedPath,
          position: { x: e.clientX, y: e.clientY },
        });
      }
    } else if (!e.target.closest('.node-hover-preview')) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        setHoverTarget(null);
      }, 150);
    }
  };

  return (
    <div className="preview-pane" onMouseMove={handleMouseMove}>
      <div
        ref={contentRef}
        className="preview-content markdown-body"
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />

      {/* Local Graph Node View */}
      <LocalGraph
        graphData={graphData}
        activePath={activeNote?.path}
        onSelectNote={onSelectNote}
        onOpenGlobalGraph={onOpenGlobalGraph}
        isDark={isDark}
        theme={theme}
      />

      {/* Backlinks */}
      <Backlinks backlinks={activeNote?.backlinks || []} onSelectNote={onSelectNote} />

      {/* Hover preview card */}
      {hoverTarget && (
        <HoverPreview
          targetPath={hoverTarget.path}
          position={hoverTarget.position}
          onClose={() => setHoverTarget(null)}
          onSelectNote={(path) => {
            setHoverTarget(null);
            onSelectNote(path);
          }}
        />
      )}
    </div>
  );
}
