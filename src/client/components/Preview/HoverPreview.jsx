import React, { useState, useEffect } from 'react';
import { FileText, ArrowUpRight } from 'lucide-react';
import * as api from '../../services/api';

export function HoverPreview({ targetPath, position, onClose, onSelectNote }) {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetPath) return;

    let isMounted = true;
    setLoading(true);

    api
      .fetchNote(targetPath)
      .then((data) => {
        if (!isMounted) return;
        // Clean snippet: strip leading markdown headers/symbols for cleaner card preview
        const cleanSnippet = (data.content || '')
          .replace(/^[#>-]+\s*/gm, '')
          .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$2 || $1')
          .trim()
          .slice(0, 240);

        setPreviewData({
          title: data.title || data.name,
          path: data.path,
          snippet: cleanSnippet || 'Empty note...',
          backlinksCount: (data.backlinks || []).length,
        });
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetPath]);

  if (!targetPath || !position) return null;

  // Position preview popover cleanly on screen (avoid overflowing right/bottom viewport)
  const left = Math.min(window.innerWidth - 320, Math.max(16, position.x + 12));
  const top = Math.min(window.innerHeight - 200, Math.max(16, position.y + 12));

  return (
    <div
      className="node-hover-preview"
      style={{ left: `${left}px`, top: `${top}px` }}
      onClick={() => onSelectNote(targetPath)}
    >
      <div className="preview-card-header">
        <FileText size={14} />
        <span className="preview-card-title">
          {previewData?.title || targetPath.replace(/\.md$/, '')}
        </span>
        <ArrowUpRight size={13} className="preview-card-jump" />
      </div>

      <div className="preview-card-path">{targetPath}</div>

      <div className="preview-card-body">
        {loading ? <span className="muted">Loading preview...</span> : previewData?.snippet}
      </div>

      {previewData && (
        <div className="preview-card-footer">
          <span>
            {previewData.backlinksCount} linked reference
            {previewData.backlinksCount === 1 ? '' : 's'}
          </span>
          <span className="preview-card-hint">Click to open</span>
        </div>
      )}
    </div>
  );
}
