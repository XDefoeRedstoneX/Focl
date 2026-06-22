import { C } from '../lib/theme.js';

// Today · Plan · (+) · Habits · Train. Insights and Settings live in the
// Header, not here. The FAB opens the full AddEdit screen.
export function BottomNav({ screen, setScreen, openAdd }) {
  const item = (key, label, icon) => {
    const active = screen === key;
    return (
      <button
        key={key}
        onClick={() => setScreen(key)}
        style={{
          flex: 1, background: 'none', border: 'none',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 4, padding: '8px 0',
          cursor: 'pointer',
          color: active ? C.amber : C.t3,
        }}
      >
        <span style={{ fontSize: 19, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: 9, fontFamily: 'DM Mono', letterSpacing: 0.5 }}>{label}</span>
      </button>
    );
  };

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'rgba(13,22,25,0.94)', backdropFilter: 'blur(12px)',
      borderTop: `0.5px solid ${C.border}`,
      display: 'flex', alignItems: 'center',
      padding: '4px 6px calc(4px + env(safe-area-inset-bottom))',
      height: 'calc(78px + env(safe-area-inset-bottom))',
    }}>
      {item('home', 'Today', '◐')}
      {item('plan', 'Plan', '▦')}
      <button
        onClick={() => openAdd(screen === 'habits' ? 'habit' : 'task')}
        aria-label="Add"
        style={{
          width: 54, height: 54, borderRadius: 100,
          background: C.amber, border: 'none', color: C.bg,
          fontSize: 28, fontWeight: 300, cursor: 'pointer',
          margin: '-24px 6px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
          boxShadow: `0 0 0 4px ${C.bg}, 0 6px 18px rgba(92,198,207,0.35)`,
        }}
      >+</button>
      {item('habits', 'Habits', '◇')}
      {item('workout', 'Train', '◭')}
    </div>
  );
}
