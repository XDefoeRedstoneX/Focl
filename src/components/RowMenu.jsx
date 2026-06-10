import { useState, useEffect, useRef } from 'react';
import { C, card } from '../lib/theme.js';

/**
 * A visible ⋯ button on each row. Tapping it pops a small menu with actions.
 * Use INSTEAD of SwipeRow when you want the action to be obvious.
 *
 * actions: [{ label, color, onClick }]
 */
export function RowMenu({ actions, size = 28 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
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

      {open && (
        <div
          className="fade-in"
          style={{
            ...card,
            position: 'absolute', top: size + 4, right: 0,
            minWidth: 140, zIndex: 30,
            padding: 4, overflow: 'hidden',
          }}
        >
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
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
        </div>
      )}
    </div>
  );
}
