import React, { useMemo, useRef, useState, useEffect } from 'react';
import { GitFork, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { GraphCanvas } from './GraphCanvas';

export function LocalGraph({
  graphData,
  activePath,
  onSelectNote,
  onOpenGlobalGraph,
  isDark = true,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 340, height: 220 });

  // Filter local graph: only the active node + 1st degree neighbors
  const localGraph = useMemo(() => {
    if (!graphData || !activePath) return { nodes: [], links: [] };

    const activeNode = graphData.nodes.find((n) => n.id === activePath);
    if (!activeNode) return { nodes: [], links: [] };

    const neighborIds = new Set([activePath]);
    const relevantLinks = [];

    for (const link of graphData.links) {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      if (sourceId === activePath) {
        neighborIds.add(targetId);
        relevantLinks.push({ source: sourceId, target: targetId });
      } else if (targetId === activePath) {
        neighborIds.add(sourceId);
        relevantLinks.push({ source: sourceId, target: targetId });
      }
    }

    const relevantNodes = graphData.nodes
      .filter((n) => neighborIds.has(n.id))
      .map((n) => ({
        ...n,
        val: n.id === activePath ? 10 : 6,
      }));

    return {
      nodes: relevantNodes,
      links: relevantLinks,
    };
  }, [graphData, activePath]);

  // Track container width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: Math.max(200, Math.floor(entry.contentRect.width)),
          height: 220,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [collapsed]);

  if (!activePath || localGraph.nodes.length <= 1) {
    // Only show if there are references / neighbors or user wants graph
    return null;
  }

  return (
    <div className="local-graph-container" ref={containerRef}>
      <div className="local-graph-header">
        <div className="local-graph-title" onClick={() => setCollapsed(!collapsed)}>
          <GitFork size={13} />
          <span>Local Graph ({localGraph.nodes.length} nodes)</span>
          {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </div>

        <button
          type="button"
          className="local-graph-expand-btn"
          onClick={onOpenGlobalGraph}
          title="Open Full Graph View"
        >
          <Maximize2 size={12} />
          <span>Expand</span>
        </button>
      </div>

      {!collapsed && (
        <div className="local-graph-canvas-wrapper">
          <GraphCanvas
            nodes={localGraph.nodes}
            links={localGraph.links}
            activePath={activePath}
            onNodeClick={onSelectNote}
            width={dimensions.width}
            height={dimensions.height}
            isDark={isDark}
            interactive={true}
          />
        </div>
      )}
    </div>
  );
}
