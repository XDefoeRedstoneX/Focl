import React from 'react';
import { C } from '../lib/theme.js';

export function BottomNav({ screen, setScreen, openAdd }) {
  // Spaces lives under Settings tab visually — highlight Settings when on spaces
  const isActive = (key) =>
    screen === key || (key === 'settings' && screen === 'spaces');

  const item = (key, label, icon) => (
    <button
      key={key}
      onClick={() => setScreen(key)}
      style={{
        flex: 1, background: 'none', border: 'none',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 3, padding: '8px 0',
        cursor: 'pointer',
        color: isActive(key) ? C.amber : C.t3,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 9, fontFamily: 'DM Mono', letterSpacing: 0.5 }}>{label}</span>
    </button>
  );

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: C.s1, borderTop: `0.5px solid ${C.border}`,
      display: 'flex', alignItems: 'center',
      padding: '6px 8px calc(18px + env(safe-area-inset-bottom))',
      height: 80,
    }}>
      {item('home', 'Home', '◐')}
      {item('habits', 'Habits', '◇')}
      <button
        onClick={() => openAdd(screen === 'habits' ? 'habit' : 'task')}
        style={{
          width: 52, height: 52, borderRadius: 100,
          background: C.amber, border: 'none', color: C.bg,
          fontSize: 26, fontWeight: 300, cursor: 'pointer',
          margin: '-26px 4px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
          boxShadow: `0 0 0 3px ${C.bg}`,
        }}
      >+</button>
      {item('workout', 'Workout', '◭')}
      {item('settings', 'Settings', '⚙')}
    </div>
  );
}
