import { C } from '../lib/theme.js';

// Shared top bar: kicker + title on the left, Insights + Settings icon
// buttons on the right. Rendered above the scrolling screen body for the
// primary nav destinations (not the AddEdit/Notif sub-screens).
export function Header({ kicker, title, screen, setScreen }) {
  const insightsActive = screen === 'analytics';
  const settingsActive = screen === 'settings' || screen === 'spaces';

  const iconBtn = (active) => ({
    width: 38, height: 38, borderRadius: 12,
    border: `0.5px solid ${C.border}`,
    background: active ? 'rgba(92,198,207,0.12)' : C.s1,
    cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div style={{
      padding: '22px 20px 6px', display: 'flex',
      alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontFamily: 'DM Mono', letterSpacing: 1.5,
          textTransform: 'uppercase', color: C.t3,
        }}>{kicker}</div>
        <div style={{
          fontSize: 25, fontWeight: 600, letterSpacing: -0.4,
          marginTop: 4, lineHeight: 1.1,
        }}>{title}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, paddingTop: 2 }}>
        <button
          onClick={() => setScreen('analytics')}
          aria-label="Insights"
          style={{ ...iconBtn(insightsActive), gap: 2.5, alignItems: 'flex-end', padding: '11px 0 12px' }}
        >
          {[7, 13, 10].map((h, i) => (
            <span key={i} style={{
              width: 3, height: h, borderRadius: 1,
              background: insightsActive ? C.amber : C.t2,
            }} />
          ))}
        </button>
        <button
          onClick={() => setScreen('settings')}
          aria-label="Settings"
          style={{ ...iconBtn(settingsActive), color: settingsActive ? C.amber : C.t2, fontSize: 17, lineHeight: 1 }}
        >⚙</button>
      </div>
    </div>
  );
}
