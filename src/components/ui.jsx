import React from 'react';
import { C, card, sectionTitle, inp, accentTint, accentStrong } from '../lib/theme.js';
import { weekDays } from '../lib/helpers.js';

export function Chip({ active, color, children, onClick, size = 'md' }) {
  const pad = size === 'sm' ? '5px 10px' : '7px 14px';
  const fs = size === 'sm' ? 11 : 12;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: pad,
        borderRadius: 100,
        border: `0.5px solid ${active ? C.amber : C.border}`,
        background: active ? accentTint : C.s1,
        color: active ? C.amber : C.t2,
        fontSize: fs,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {color && <span style={{ width: 6, height: 6, borderRadius: 100, background: color }} />}
      {children}
    </button>
  );
}

export function Section({ title, count, action, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={sectionTitle}>{title}</div>
        {action ? action : (count !== undefined && <div style={{ ...sectionTitle, color: C.t3 }}>{count}</div>)}
      </div>
      {children}
    </div>
  );
}

export function Empty({ children }) {
  return (
    <div style={{ padding: '20px 0', color: C.t3, fontSize: 13, textAlign: 'center' }}>
      {children}
    </div>
  );
}

export function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 100,
        background: on ? C.amber : C.s3,
        border: 'none', position: 'relative', cursor: 'pointer', padding: 0,
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: on ? 22 : 2,
          width: 20, height: 20, borderRadius: 100, background: C.t1,
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14, flex: 1 }}>
      <div style={{
        fontSize: 10, color: C.t3, fontFamily: 'DM Mono',
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
      }}>{label}</div>
      {children}
    </div>
  );
}

export function DayPicker({ days, setDays }) {
  const toggle = (d) => setDays(days.includes(d) ? days.filter(x => x !== d) : [...days, d]);
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
      {weekDays.map(d => (
        <button
          key={d}
          onClick={() => toggle(d)}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 10,
            border: `0.5px solid ${days.includes(d) ? C.amber : C.border}`,
            background: days.includes(d) ? accentTint : C.s1,
            color: days.includes(d) ? C.amber : C.t2,
            fontSize: 11, cursor: 'pointer', fontFamily: 'DM Mono',
          }}
        >{d[0]}</button>
      ))}
    </div>
  );
}

export function Toast({ message = 'Saved!' }) {
  return (
    <div
      className="fade-in"
      style={{
        position: 'absolute', inset: 0,
        background: accentStrong,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: C.bg, zIndex: 10,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>✦</div>
      <div style={{ fontSize: 22, fontWeight: 500 }}>{message}</div>
    </div>
  );
}

export function Stat({ label, value, suffix }) {
  return (
    <div style={{ ...card, padding: 12 }}>
      <div style={{ ...sectionTitle, fontSize: 9 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, marginTop: 6, fontFamily: 'DM Mono' }}>
        {value}<span style={{ fontSize: 12, color: C.t3 }}>{suffix}</span>
      </div>
    </div>
  );
}

// Confirmation modal for destructive actions
export function Confirm({ title, message, onConfirm, onCancel, danger }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 20, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="fade-in"
        style={{ ...card, padding: 20, width: '100%', maxWidth: 300 }}
      >
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.t2, marginBottom: 16 }}>{message}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: 10, background: C.s2,
            border: `0.5px solid ${C.border}`, borderRadius: 100,
            color: C.t1, fontSize: 13, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: 10, background: danger ? C.red : C.amber,
            border: 'none', borderRadius: 100,
            color: C.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
