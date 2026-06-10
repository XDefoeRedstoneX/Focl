import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { C, card } from '../lib/theme.js';

/**
 * A visible ⋯ button on each row. Tapping it pops a small menu with actions.
 * Use INSTEAD of SwipeRow when you want the action to be obvious.
 *
 * The menu renders in a portal: rows are often wrapped in SwipeRow, whose
 * overflow:hidden (needed to clip swipe actions) would clip an inline
 * dropdown into invisibility.
 *
 * actions: [{ label, color, onClick }]
 */
export function RowMenu({ actions, size = 28 }) {
  const [pos, setPos] = useState(null); // {top, right} when open
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const open = !!pos;

  const toggle = (e) => {
    e.stopPropagation();
    if (open) { setPos(null); return; }
    const r = btnRef.current.getBoundingClientRect();
    const estHeight = actions.length * 41 + 8;
    const fitsBelow = r.bottom + 4 + estHeight <= window.innerHeight;
    setPos({
      top: fitsBelow ? r.bottom + 4 : Math.max(8, r.top - estHeight - 4),
      right: Math.max(8, window.innerWidth - r.right),
    });
  };

  useEffect(() => {
    if (!open) return;
    const closeIfOutside = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      setPos(null);
    };
    const close = () => setPos(null);
    document.addEventListener('pointerdown', closeIfOutside);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <div style={{ flexShrink: 0 }}>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          width: size, height: size, borderRadius: 100,
          background: open ? C.s3 : 'transparent',
          border: 'none', color: C.t2,
          cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, lineHeight: 1,
        }}
        aria-label="More"
      >⋯</button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="fade-in"
          style={{
            ...card,
            position: 'fixed', top: pos.top, right: pos.right,
            minWidth: 140, zIndex: 100,
            padding: 4, overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          }}
        >
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setPos(null);
                a.onClick();
              }}
              style={{
                display: 'block', width: '100%',
                padding: '10px 14px', textAlign: 'left',
                background: 'transparent', border: 'none',
                color: a.color || C.t1,
                fontSize: 13, cursor: 'pointer', borderRadius: 8,
              }}
              onMouseOver={(e) => e.currentTarget.style.background = C.s2}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >{a.label}</button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
