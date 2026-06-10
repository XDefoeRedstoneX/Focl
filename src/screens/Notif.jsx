import { C, navBtn, primaryBtn, inp, screenPad, sectionLabel, cardListStyle, rowStyle, card } from '../lib/theme.js';
import { Toggle } from '../components/ui.jsx';

const OPTS = [
  ['on-day', 'On the day'],
  ['10min', '10 min before'],
  ['30min', '30 min before'],
  ['1hour', '1 hour before'],
  ['1day', '1 day before'],
  ['custom', 'Custom time'],
];

export function Notif({ draft, setDraft, setScreen }) {
  const upd = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const [h, m] = draft.notifTime.split(':');
  const hour12 = ((+h + 11) % 12) + 1;
  const ampm = +h < 12 ? 'AM' : 'PM';

  const setTime = (nH, nM, nA) => {
    const hh = nA === 'PM' ? (nH === 12 ? 12 : nH + 12) : (nH === 12 ? 0 : nH);
    upd('notifTime', `${String(hh).padStart(2, '0')}:${String(nM).padStart(2, '0')}`);
  };

  return (
    <div style={screenPad}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => setScreen('add')} style={navBtn}>← Back</button>
        <button onClick={() => setScreen('add')} style={primaryBtn}>Save</button>
      </div>

      <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 20 }}>Notifications</div>

      <div style={{ ...rowStyle, ...card, marginBottom: 16 }}>
        <span>Enable reminders</span>
        <Toggle on={draft.notifEnabled} onChange={v => upd('notifEnabled', v)} />
      </div>

      {draft.notifEnabled && (
        <>
          <div style={sectionLabel}>Remind me</div>
          <div style={cardListStyle}>
            {OPTS.map(([v, l], i) => (
              <button
                key={v}
                onClick={() => upd('notifTiming', v)}
                style={{
                  width: '100%', padding: '13px 14px',
                  background: 'none', border: 'none',
                  borderTop: i > 0 ? `0.5px solid ${C.border}` : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  color: C.t1, fontSize: 14, cursor: 'pointer',
                }}
              >
                <span>{l}</span>
                {draft.notifTiming === v && <span style={{ color: C.amber, fontWeight: 600 }}>✓</span>}
              </button>
            ))}
          </div>

          <div style={sectionLabel}>Time</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              type="number" min="1" max="12" value={hour12}
              onChange={e => setTime(+e.target.value || 12, +m, ampm)}
              style={{ ...inp, textAlign: 'center', fontFamily: 'DM Mono' }}
            />
            <input
              type="number" min="0" max="59" value={+m}
              onChange={e => setTime(hour12, +e.target.value || 0, ampm)}
              style={{ ...inp, textAlign: 'center', fontFamily: 'DM Mono' }}
            />
            <select
              value={ampm}
              onChange={e => setTime(hour12, +m, e.target.value)}
              style={{ ...inp, width: 80 }}
            >
              <option>AM</option><option>PM</option>
            </select>
          </div>

          <div style={sectionLabel}>Also remind me</div>
          <div style={cardListStyle}>
            <div style={rowStyle}>
              <span>1 day before</span>
              <Toggle on={draft.alsoDay} onChange={v => upd('alsoDay', v)} />
            </div>
            <div style={{ ...rowStyle, borderTop: `0.5px solid ${C.border}` }}>
              <span>1 week before</span>
              <Toggle on={draft.alsoWeek} onChange={v => upd('alsoWeek', v)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
