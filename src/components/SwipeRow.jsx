import { useState, useRef } from 'react';
import { C } from '../lib/theme.js';

/**
 * SwipeRow: wraps a row in a touch-swipe gesture revealing action buttons.
 * Actions are passed as an array of {label, color, onClick}.
 * On desktop, long-press (right-click) also reveals.
 */
export function SwipeRow({ children, actions = [], onTap, disabled = false }) {
  const [offset, setOffset] = useState(0);
  // isDragging mirrors dragging.current for rendering (transition on/off);
  // the ref stays the source of truth inside move handlers.
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(false);

  const actionWidth = actions.length * 72;
  const maxOffset = -actionWidth;

  const onPointerDown = (e) => {
    if (disabled) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    startX.current = x;
    startOffset.current = offset;
    dragging.current = true;
    setIsDragging(true);
    moved.current = false;
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = x - startX.current;
    if (Math.abs(dx) > 5) moved.current = true;
    let next = startOffset.current + dx;
    if (next > 0) next = 0;
    if (next < maxOffset - 20) next = maxOffset - 20;
    setOffset(next);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    // snap
    if (offset < maxOffset / 2) setOffset(maxOffset);
    else setOffset(0);
  };

  const handleClick = (e) => {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
      return;
    }
    if (offset !== 0) {
      setOffset(0);
      return;
    }
    if (onTap) onTap(e);
  };

  const close = () => setOffset(0);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, marginBottom: 8 }}>
      {/* Actions revealed behind */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0,
        display: 'flex', alignItems: 'stretch',
      }}>
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); close(); a.onClick(); }}
            style={{
              width: 72, border: 'none',
              background: a.color || C.red,
              color: C.t1, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', padding: 0,
            }}
          >{a.label}</button>
        ))}
      </div>

      {/* Foreground row, swipeable */}
      <div
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        onMouseDown={onPointerDown}
        onMouseMove={(e) => dragging.current && onPointerMove(e)}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onClick={handleClick}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.22s',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}
