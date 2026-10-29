import React, { useRef, useEffect, useCallback } from 'react';

/**
 * Ultra-High Performance HTML5 2D Canvas Force-Directed Node Graph
 * - 0% idle CPU usage (simulation cools down and stops when equilibrium is reached)
 * - Retina / High-DPI crisp rendering
 * - Pan, zoom, node drag, click to navigate, hover highlighting
 * - Viewport bounds culling for text rendering
 */
export function GraphCanvas({
  nodes = [],
  links = [],
  activePath = null,
  onNodeClick = null,
  onNodeHover = null,
  width = 600,
  height = 400,
  isDark = true,
  interactive = true,
}) {
  const canvasRef = useRef(null);

  // Simulation state
  const simNodesRef = useRef([]);
  const simLinksRef = useRef([]);
  const animFrameRef = useRef(null);
  const alphaRef = useRef(1);
  const isRunningRef = useRef(false);

  // Transform (pan & zoom)
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const hoveredNodeRef = useRef(null);
  const draggedNodeRef = useRef(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Colors per style.md (Notion Design System)
  const colors = isDark
    ? {
        bg: '#191919',
        node: '#615D59',
        nodeActive: '#0075DE',
        nodeHover: '#097FE8',
        nodeConnected: '#27918D',
        link: 'rgba(255, 255, 255, 0.12)',
        linkActive: 'rgba(0, 117, 222, 0.8)',
        text: 'rgba(255, 255, 255, 0.92)',
        textActive: '#FFFFFF',
        textDim: '#6B6B6B',
      }
    : {
        bg: '#FFFFFF',
        node: '#A39E98',
        nodeActive: '#0075DE',
        nodeHover: '#097FE8',
        nodeConnected: '#27918D',
        link: 'rgba(0, 0, 0, 0.08)',
        linkActive: 'rgba(0, 117, 222, 0.75)',
        text: 'rgba(0, 0, 0, 0.898)',
        textActive: '#000000',
        textDim: '#A39E98',
      };

  // Wake up simulation loop
  const wakeSimulation = useCallback(() => {
    alphaRef.current = Math.max(alphaRef.current, 0.3);
    if (!isRunningRef.current) {
      isRunningRef.current = true;
      runTick();
    }
  }, []);

  // Initialize or update node positions when graph data changes
  useEffect(() => {
    const existingMap = new Map(simNodesRef.current.map((n) => [n.id, n]));

    const cx = width / 2;
    const cy = height / 2;

    simNodesRef.current = nodes.map((node, i) => {
      const existing = existingMap.get(node.id);
      if (existing) {
        return {
          ...existing,
          title: node.title,
          val: node.val || 6,
          inDegree: node.inDegree || 0,
          outDegree: node.outDegree || 0,
        };
      }

      // Initial placement in golden spiral or circle
      const angle = i * 2.39996; // Golden angle
      const radius = 30 + Math.sqrt(i) * 28;
      return {
        id: node.id,
        path: node.path,
        title: node.title,
        val: node.val || 6,
        inDegree: node.inDegree || 0,
        outDegree: node.outDegree || 0,
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 10,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 10,
        vx: 0,
        vy: 0,
      };
    });

    const nodeIndex = new Map(simNodesRef.current.map((n) => [n.id, n]));
    simLinksRef.current = links
      .map((l) => ({
        source: nodeIndex.get(l.source),
        target: nodeIndex.get(l.target),
      }))
      .filter((l) => l.source && l.target);

    // Initial alpha burst to organize
    alphaRef.current = 1;
    wakeSimulation();
  }, [nodes, links, width, height, wakeSimulation]);

  // Main physics tick & draw
  const runTick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      isRunningRef.current = false;
      return;
    }

    const ctx = canvas.getContext('2d');
    const simNodes = simNodesRef.current;
    const simLinks = simLinksRef.current;
    const nodeCount = simNodes.length;

    // 1. Force Simulation Steps (only if alpha > 0.003)
    if (alphaRef.current > 0.003) {
      const alpha = alphaRef.current;
      const cx = width / 2;
      const cy = height / 2;
      const repulsionK = Math.min(2400, 1200 + nodeCount * 30);
      const linkDist = 70;
      const linkStrength = 0.04;

      // Many-body repulsion (O(N^2) optimized with distance squared)
      for (let i = 0; i < nodeCount; i++) {
        const a = simNodes[i];
        for (let j = i + 1; j < nodeCount; j++) {
          const b = simNodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distSq = dx * dx + dy * dy;
          if (distSq < 1) {
            dx = (Math.random() - 0.5) * 2;
            dy = (Math.random() - 0.5) * 2;
            distSq = dx * dx + dy * dy;
          }

          if (distSq < 60000) {
            const dist = Math.sqrt(distSq);
            const force = (repulsionK / distSq) * alpha;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (a !== draggedNodeRef.current) {
              a.vx -= fx;
              a.vy -= fy;
            }
            if (b !== draggedNodeRef.current) {
              b.vx += fx;
              b.vy += fy;
            }
          }
        }
      }

      // Link attraction (Hooke's law)
      for (let i = 0; i < simLinks.length; i++) {
        const link = simLinks[i];
        const a = link.source;
        const b = link.target;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const delta = (dist - linkDist) * linkStrength * alpha;
        const fx = (dx / dist) * delta;
        const fy = (dy / dist) * delta;

        if (a !== draggedNodeRef.current) {
          a.vx += fx;
          a.vy += fy;
        }
        if (b !== draggedNodeRef.current) {
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Center gravity & velocity dampening
      const gravity = 0.015 * alpha;
      const friction = 0.78;

      for (let i = 0; i < nodeCount; i++) {
        const n = simNodes[i];
        if (n === draggedNodeRef.current) continue;

        n.vx += (cx - n.x) * gravity;
        n.vy += (cy - n.y) * gravity;

        n.vx *= friction;
        n.vy *= friction;

        n.x += n.vx;
        n.y += n.vy;
      }

      // Decay alpha
      alphaRef.current *= 0.965;
    } else {
      alphaRef.current = 0;
    }

    // 2. High-Performance Canvas Rendering
    const dpr = window.devicePixelRatio || 1;
    const t = transformRef.current;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply DPR & camera transforms
    ctx.scale(dpr, dpr);
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    const hovered = hoveredNodeRef.current;
    const connectedSet = new Set();
    if (hovered) {
      connectedSet.add(hovered.id);
      for (const link of simLinks) {
        if (link.source.id === hovered.id) connectedSet.add(link.target.id);
        if (link.target.id === hovered.id) connectedSet.add(link.source.id);
      }
    }

    // A. Render Links
    ctx.lineWidth = 1 / t.k;
    for (let i = 0; i < simLinks.length; i++) {
      const link = simLinks[i];
      const isConnected =
        hovered && (link.source.id === hovered.id || link.target.id === hovered.id);
      const isRelatedToActive =
        activePath && (link.source.id === activePath || link.target.id === activePath);

      ctx.strokeStyle = isConnected
        ? colors.linkActive
        : isRelatedToActive
          ? colors.linkActive
          : hovered
            ? 'rgba(79, 88, 117, 0.12)'
            : colors.link;

      ctx.beginPath();
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
      ctx.stroke();
    }

    // B. Render Nodes
    for (let i = 0; i < nodeCount; i++) {
      const n = simNodes[i];
      const isActive = activePath && n.id === activePath;
      const isHovered = hovered && n.id === hovered.id;
      const isConnected = connectedSet.has(n.id);
      const radius = Math.max(4, n.val || 6);

      // Node circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);

      if (isActive) {
        ctx.fillStyle = colors.nodeActive;
      } else if (isHovered) {
        ctx.fillStyle = colors.nodeHover;
      } else if (isConnected) {
        ctx.fillStyle = colors.nodeConnected;
      } else if (hovered && !isConnected) {
        ctx.fillStyle = 'rgba(79, 88, 117, 0.2)';
      } else {
        ctx.fillStyle = colors.node;
      }
      ctx.fill();

      // Active glowing ring
      if (isActive) {
        ctx.lineWidth = 2.5 / t.k;
        ctx.strokeStyle = colors.nodeActive;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Labels (cull if zoomed far out unless active or hovered)
      if (t.k > 0.6 || isActive || isHovered) {
        ctx.font = `${Math.max(10, 11 / t.k)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        if (isActive || isHovered) {
          ctx.fillStyle = colors.textActive;
          ctx.font = `bold ${Math.max(11, 12 / t.k)}px sans-serif`;
        } else if (hovered && !isConnected) {
          ctx.fillStyle = colors.textDim;
        } else {
          ctx.fillStyle = colors.text;
        }

        ctx.fillText(n.title, n.x, n.y + radius + 4);
      }
    }

    ctx.restore();

    // Keep running if alpha is active
    if (alphaRef.current > 0.003 || draggedNodeRef.current) {
      animFrameRef.current = requestAnimationFrame(runTick);
    } else {
      isRunningRef.current = false;
    }
  }, [width, height, activePath, colors]);

  // Keep canvas sharp on resize / DPR change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    wakeSimulation();
  }, [width, height, wakeSimulation]);

  // Coordinate conversion helper: client mouse pos -> world pos
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const t = transformRef.current;
    return {
      x: (mouseX - t.x) / t.k,
      y: (mouseY - t.y) / t.k,
      rawX: e.clientX,
      rawY: e.clientY,
    };
  };

  // Find node under cursor
  const findNodeAt = (pos) => {
    const nodes = simNodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const radius = Math.max(6, (n.val || 6) + 4);
      const dx = pos.x - n.x;
      const dy = pos.y - n.y;
      if (dx * dx + dy * dy <= radius * radius) {
        return n;
      }
    }
    return null;
  };

  // Mouse interaction handlers
  const handleMouseDown = (e) => {
    if (!interactive) return;
    const pos = getMousePos(e);
    const node = findNodeAt(pos);

    if (node) {
      draggedNodeRef.current = node;
      wakeSimulation();
    } else {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - transformRef.current.x,
        y: e.clientY - transformRef.current.y,
      };
    }
  };

  const handleMouseMove = (e) => {
    if (!interactive) return;
    const pos = getMousePos(e);

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = pos.x;
      draggedNodeRef.current.y = pos.y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      wakeSimulation();
      return;
    }

    if (isPanningRef.current) {
      transformRef.current.x = e.clientX - panStartRef.current.x;
      transformRef.current.y = e.clientY - panStartRef.current.y;
      wakeSimulation();
      return;
    }

    // Hover detection
    const node = findNodeAt(pos);
    if (node !== hoveredNodeRef.current) {
      hoveredNodeRef.current = node;
      canvasRef.current.style.cursor = node ? 'pointer' : 'grab';
      onNodeHover?.(node, pos);
      wakeSimulation();
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current = null;
      wakeSimulation();
    }
    isPanningRef.current = false;
  };

  const handleClick = (e) => {
    if (!interactive) return;
    const pos = getMousePos(e);
    const node = findNodeAt(pos);
    if (node && onNodeClick) {
      onNodeClick(node.path);
    }
  };

  const handleWheel = (e) => {
    if (!interactive) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const t = transformRef.current;
    const newK = Math.min(3.5, Math.max(0.2, t.k * zoomFactor));

    // Zoom centered on cursor
    t.x = mouseX - (mouseX - t.x) * (newK / t.k);
    t.y = mouseY - (mouseY - t.y) * (newK / t.k);
    t.k = newK;

    wakeSimulation();
  };

  // Center on active note
  const centerOnNode = useCallback(
    (targetPath) => {
      if (!targetPath) return;
      const node = simNodesRef.current.find((n) => n.id === targetPath);
      if (node) {
        const t = transformRef.current;
        t.x = width / 2 - node.x * t.k;
        t.y = height / 2 - node.y * t.k;
        wakeSimulation();
      }
    },
    [width, height, wakeSimulation]
  );

  // Center when active path changes
  useEffect(() => {
    if (activePath) {
      centerOnNode(activePath);
    }
  }, [activePath, centerOnNode]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        if (hoveredNodeRef.current) {
          hoveredNodeRef.current = null;
          onNodeHover?.(null, null);
          wakeSimulation();
        }
      }}
      onClick={handleClick}
      onWheel={handleWheel}
      style={{
        display: 'block',
        width: `${width}px`,
        height: `${height}px`,
        cursor: 'grab',
        touchAction: 'none',
      }}
    />
  );
}
