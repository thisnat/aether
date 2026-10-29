import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GitFork, Search, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { GraphCanvas } from './GraphCanvas';

export function GraphModal({
  isOpen,
  onClose,
  graphData,
  activePath,
  onSelectNote,
  isDark = true,
}) {
  const [filterQuery, setFilterQuery] = useState('');
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    if (!isOpen) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.floor(rect.width) || 800,
          height: Math.floor(rect.height) || 500,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isOpen]);

  const filteredGraph = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };
    if (!filterQuery.trim()) return graphData;

    const clean = filterQuery.toLowerCase().trim();
    const matchingNodeIds = new Set(
      graphData.nodes
        .filter(n => n.title.toLowerCase().includes(clean) || n.path.toLowerCase().includes(clean))
        .map(n => n.id)
    );

    const filteredNodes = graphData.nodes.filter(n => matchingNodeIds.has(n.id));
    const filteredLinks = graphData.links.filter(
      l => matchingNodeIds.has(l.source) && matchingNodeIds.has(l.target)
    );

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [graphData, filterQuery]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="graph-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="graph-modal-header">
          <div className="graph-modal-title">
            <GitFork size={18} />
            <span>Graph View</span>
            <span className="graph-stats-badge">
              {filteredGraph.nodes.length} nodes · {filteredGraph.links.length} links
            </span>
          </div>

          <div className="graph-filter-box">
            <Search size={14} />
            <input
              type="text"
              placeholder="Filter notes..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>

          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="graph-modal-canvas-container" ref={containerRef}>
          <GraphCanvas
            nodes={filteredGraph.nodes}
            links={filteredGraph.links}
            activePath={activePath}
            onNodeClick={(path) => {
              onSelectNote(path);
              onClose();
            }}
            width={dimensions.width}
            height={dimensions.height}
            isDark={isDark}
            interactive={true}
          />
        </div>

        <div className="graph-modal-footer">
          <span className="graph-hint">
            Drag to pan · Scroll to zoom · Click node to open
          </span>
          {activePath && (
            <span className="graph-active-label">
              Active: <strong>{activePath}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
