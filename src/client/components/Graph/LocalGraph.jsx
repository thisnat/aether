import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { GitFork, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { GraphCanvas } from './GraphCanvas';

export function LocalGraph({
  graphData,
  activePath,
  onSelectNote,
  onOpenGlobalGraph,
  isDark = true,
  theme = 'tabula',
}) {
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef(null);
  const roRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 220 });

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

  // Callback ref guarantees measurement and ResizeObserver setup the moment the DOM element mounts
  const setContainerNode = useCallback((node) => {
    containerRef.current = node;
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }

    if (node) {
      const updateSize = () => {
        const w = node.clientWidth;
        if (w > 0) {
          setDimensions((prev) => (prev.width === w ? prev : { width: w, height: 220 }));
        }
      };

      updateSize();

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.floor(entry.contentRect.width);
          if (w > 0) {
            setDimensions((prev) => (prev.width === w ? prev : { width: w, height: 220 }));
          }
        }
      });

      observer.observe(node);
      roRef.current = observer;
    }
  }, []);

  // Ensure size is accurate when toggling collapsed
  useEffect(() => {
    if (!collapsed && containerRef.current) {
      const w = containerRef.current.clientWidth;
      if (w > 0) {
        setDimensions((prev) => (prev.width === w ? prev : { width: w, height: 220 }));
      }
    }
  }, [collapsed]);

  useEffect(() => {
    return () => {
      if (roRef.current) {
        roRef.current.disconnect();
      }
    };
  }, []);

  if (!activePath || localGraph.nodes.length <= 1) {
    // Only show if there are references / neighbors or user wants graph
    return null;
  }

  return (
    <div className="local-graph-container" ref={setContainerNode}>
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
            theme={theme}
            interactive={true}
          />
        </div>
      )}
    </div>
  );
}
