import React, { useRef } from 'react';

export function PaneResizer({ onResize }) {
  const isResizingRef = useRef(false);

  const handleMouseDown = () => {
    isResizingRef.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      onResize?.(e.clientX);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return <div className="pane-resizer" onMouseDown={handleMouseDown} />;
}
