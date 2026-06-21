import { useState, useMemo } from 'react';
import { C, card, sectionLabel, dot, monoMicro, inp, SWATCHES } from '../lib/theme.js';
import { todayISO, getDayKey, weekDaysFrom, newId } from '../lib/helpers.js';
import { Chip, Empty, Confirm } from '../components/ui.jsx';
import { RowMenu } from '../components/RowMenu.jsx';

/**
 * Workout tab. Three sub-views:
 *  Today — the session for today's planned kit (set dots + weight logging)
 *  Plan  — weekday -> kit mapping + linked habit
 *  Kits  — reusable exercise sets per training part
 */
export function Workout({ kits, plan, sessions, habits, saveKit, deleteKit, updatePlan, upsertSession }) {
  const [tab, setTab] = useState('today');

  return (
    <div style={{ padding: '8px 20px 8px' }}>
      <div style={{ display: 'flex', gap: 18, borderBottom: `0.5px solid ${C.border}` }}>
        {[['today', 'Today'], ['plan', 'Split'], ['kits', 'Kits']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none', padding: '0 0 10px',
            fontSize: 14, fontWeight: 500,
            color: tab === t ? C.t1 : C.t3,
            borderBottom: tab === t ? `2px solid ${C.amber}` : '2px solid transparent',
            cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'today' && <Today kits={kits} plan={plan} sessions={sessions} upsertSession={upsertSession} />}
      {tab === 'plan' && <Split kits={kits} plan={plan} habits={habits} updatePlan={updatePlan} />}
      {tab === 'kits' && <Kits kits={kits} saveKit={saveKit} deleteKit={deleteKit} />}
    </div>
  );
}

// ---------- Today ----------

function Today({ kits, plan, sessions, upsertSession }) {
  const today = todayISO();
  const dKey = getDayKey(new Date());
  const kit = kits.find(k => k.id === plan[dKey]);
  const session = sessions.find(s => s.date === today);

  // last logged weight per exercise (from the most recent prior session of this kit)
  const lastWeights = useMemo(() => {
    if (!kit) return {};
    const prior = [...sessions]
      .filter(s => s.kitId === kit.id && s.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));
    const out = {};
    for (const ex of kit.exercises) {
      for (const s of prior) {
        const w = s.ex?.[ex.id]?.weight;
        if (w != null && w !== '') { out[ex.id] = w; break; }
      }
    }
    return out;
  }, [kit, sessions, today]);

  if (!kit) {
    // Rest day — find next planned day
    const order = weekDaysFrom();
    const idx = order.indexOf(dKey);
    let nextDay = null, distance = 0;
    for (let i = 1; i <= 7; i++) {
      const d = order[(idx + i) % 7];
      if (plan[d]) { nextDay = d; distance = i; break; }
    }
    const nextKit = nextDay ? kits.find(k => k.id === plan[nextDay]) : null;
    return (
      <div style={{ ...card, marginTop: 20, padding: 24, textAlign: 'center', borderLeft: `3px solid ${C.bookmark}` }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🌙</div>
        <div style={{ fontSize: 16, fontWeight: 500 }}>Rest day</div>
        {nextKit ? (
          <div style={{ marginTop: 10, display: 'inline-block', padding: '5px 12px', borderRadius: 100,
            background: `${C.bookmark}22`, color: C.bookmark, fontSize: 12, fontFamily: 'DM Mono' }}>
            {nextKit.name} in {distance} day{distance > 1 ? 's' : ''}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.t3, marginTop: 8 }}>No workouts planned — set up your week in Plan</div>
        )}
      </div>
    );
  }

  const ex = session?.ex || {};
  const totalSets = kit.exercises.reduce((s, e) => s + e.sets, 0);
  const doneSets = kit.exercises.reduce((s, e) => s + Math.min(ex[e.id]?.done || 0, e.sets), 0);
  const complete = doneSets >= totalSets && totalSets > 0;

  const setDone = (exId, n) => {
    const cur = { ...(session?.ex || {}) };
    cur[exId] = { ...(cur[exId] || {}), done: n };
    upsertSession({ date: today, kitId: kit.id, ex: cur });
  };
  const setWeight = (exId, w) => {
    const cur = { ...(session?.ex || {}) };
    cur[exId] = { ...(cur[exId] || {}), weight: w };
    upsertSession({ date: today, kitId: kit.id, ex: cur });
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={dot(kit.color, 10)} />{kit.name} day
        </span>
        <span style={monoMicro}>{doneSets}/{totalSets} sets</span>
      </div>

      <div style={{ height: 4, background: C.s3, borderRadius: 100, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%`, height: '100%', background: kit.color, transition: 'width 0.3s' }} />
      </div>

      {kit.exercises.map(e => {
        const st = ex[e.id] || {};
        const done = Math.min(st.done || 0, e.sets);
        const allDone = done >= e.sets;
        return (
          <div key={e.id} style={{ ...card, padding: 14, marginBottom: 8, opacity: allDone ? 0.75 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 14, fontWeight: 500, textDecoration: allDone ? 'line-through' : 'none', color: allDone ? C.t3 : C.t1 }}>
                {e.name}
              </span>
              <span style={monoMicro}>{e.sets}×{e.reps}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {Array.from({ length: e.sets }, (_, i) => {
                  const filled = i < done;
                  return (
                    <button key={i}
                      onClick={() => setDone(e.id, filled && i === done - 1 ? i : i + 1)}
                      style={{
                        width: 32, height: 32, borderRadius: 100, padding: 0, cursor: 'pointer',
                        border: `1.5px solid ${filled ? kit.color : C.border}`,
                        background: filled ? kit.color : 'transparent',
                        color: filled ? C.bg : C.t3, fontSize: 12, fontFamily: 'DM Mono',
                        transition: 'all .15s',
                      }}
                    >{i + 1}</button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number" inputMode="decimal"
                  value={st.weight ?? ''}
                  placeholder={lastWeights[e.id] != null ? String(lastWeights[e.id]) : '—'}
                  onChange={ev => setWeight(e.id, ev.target.value)}
                  style={{ ...inp, width: 64, padding: '6px 8px', fontSize: 13, textAlign: 'center', fontFamily: 'DM Mono' }}
                />
                <span style={{ fontSize: 11, color: C.t3, fontFamily: 'DM Mono' }}>kg</span>
              </div>
            </div>
            {lastWeights[e.id] != null && (st.weight == null || st.weight === '') && (
              <div style={{ fontSize: 10, color: C.t3, fontFamily: 'DM Mono', marginTop: 6, textAlign: 'right' }}>
                last: {lastWeights[e.id]} kg
              </div>
            )}
          </div>
        );
      })}

      {complete && (
        <div className="fade-in" style={{ ...card, padding: 16, textAlign: 'center', borderLeft: `3px solid ${kit.color}`, marginTop: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: kit.color }}>✦ Session complete</div>
          <div style={{ fontSize: 11, color: C.t2, marginTop: 4 }}>Logged for {today}</div>
        </div>
      )}
    </div>
  );
}

// ---------- Split (weekly plan) ----------

function Split({ kits, plan, habits, updatePlan }) {
  const order = weekDaysFrom();
  return (
    <div style={{ marginTop: 16 }}>
      <div style={sectionLabel}>Weekly split</div>
      {order.map(day => {
        const kid = plan[day];
        return (
          <div key={day} style={{ ...card, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 38, fontSize: 12, fontFamily: 'DM Mono', color: C.t2 }}>{day}</span>
            <div className="scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1 }}>
              <Chip size="sm" active={!kid} onClick={() => updatePlan({ [day]: null })}>Rest</Chip>
              {kits.map(k => (
                <Chip key={k.id} size="sm" active={kid === k.id} color={k.color}
                  onClick={() => updatePlan({ [day]: k.id })}>{k.name}</Chip>
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ ...sectionLabel, marginTop: 20 }}>Linked habit</div>
      <div style={{ fontSize: 11, color: C.t3, marginBottom: 8 }}>
        Completing a session auto-checks this habit for the day.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Chip size="sm" active={!plan.linkedHabitId} onClick={() => updatePlan({ linkedHabitId: null })}>None</Chip>
        {habits.map(h => (
          <Chip key={h.id} size="sm" active={plan.linkedHabitId === h.id} color={h.color}
            onClick={() => updatePlan({ linkedHabitId: h.id })}>{h.name}</Chip>
        ))}
      </div>
    </div>
  );
}

// ---------- Kits ----------

function Kits({ kits, saveKit, deleteKit }) {
  const [editing, setEditing] = useState(null); // kit draft or null
  const [confirmDel, setConfirmDel] = useState(null);

  const startNew = () => setEditing({ id: null, name: '', color: C.amber, exercises: [] });
  const startEdit = (k) => setEditing(JSON.parse(JSON.stringify(k)));
  const upd = (patch) => setEditing(e => ({ ...e, ...patch }));
  const updEx = (i, patch) => setEditing(e => {
    const exercises = e.exercises.map((x, j) => j === i ? { ...x, ...patch } : x);
    return { ...e, exercises };
  });
  const addEx = () => setEditing(e => ({ ...e, exercises: [...e.exercises, { id: newId(), name: '', sets: 3, reps: 10 }] }));
  const rmEx = (i) => setEditing(e => ({ ...e, exercises: e.exercises.filter((_, j) => j !== i) }));
  const save = () => {
    if (!editing.name.trim()) return;
    const kit = { ...editing, id: editing.id || newId(), exercises: editing.exercises.filter(x => x.name.trim()) };
    saveKit(kit);
    setEditing(null);
  };

  if (editing) {
    return (
      <div style={{ marginTop: 16 }}>
        <input value={editing.name} onChange={e => upd({ name: e.target.value })}
          placeholder="Kit name (e.g. Push)" style={{ ...inp, marginBottom: 12 }} autoFocus={!editing.id} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {SWATCHES.slice(0, 6).map(c => (
            <button key={c} onClick={() => upd({ color: c })} style={{
              width: 28, height: 28, borderRadius: 100, background: c, cursor: 'pointer',
              border: editing.color === c ? `2px solid ${C.t1}` : `0.5px solid ${C.border}`,
            }} />
          ))}
        </div>

        <div style={sectionLabel}>Exercises</div>
        {editing.exercises.map((x, i) => (
          <div key={x.id} style={{ ...card, padding: 10, marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
            <input value={x.name} onChange={e => updEx(i, { name: e.target.value })}
              placeholder="Exercise" style={{ ...inp, flex: 1, padding: '8px 10px', fontSize: 13 }} />
            <input type="number" value={x.sets} onChange={e => updEx(i, { sets: Math.max(1, +e.target.value || 1) })}
              style={{ ...inp, width: 46, padding: '8px 4px', fontSize: 13, textAlign: 'center', fontFamily: 'DM Mono' }} />
            <span style={{ color: C.t3, fontSize: 12 }}>×</span>
            <input type="number" value={x.reps} onChange={e => updEx(i, { reps: Math.max(1, +e.target.value || 1) })}
              style={{ ...inp, width: 46, padding: '8px 4px', fontSize: 13, textAlign: 'center', fontFamily: 'DM Mono' }} />
            <button onClick={() => rmEx(i)} style={{
              background: 'none', border: 'none', color: C.red, fontSize: 16, cursor: 'pointer', padding: '0 2px',
            }}>×</button>
          </div>
        ))}
        <button onClick={addEx} style={{
          width: '100%', padding: 10, background: 'transparent', marginBottom: 16,
          border: `0.5px dashed ${C.border}`, borderRadius: 12, color: C.t2, fontSize: 13, cursor: 'pointer',
        }}>+ Add exercise</button>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditing(null)} style={{
            flex: 1, padding: 11, background: C.s2, border: `0.5px solid ${C.border}`,
            borderRadius: 100, color: C.t1, fontSize: 13, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={save} style={{
            flex: 1, padding: 11, background: C.amber, border: 'none',
            borderRadius: 100, color: C.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{editing.id ? 'Update kit' : 'Create kit'}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      {kits.length === 0 && <Empty>No kits yet — create one per training part</Empty>}
      {kits.map(k => (
        <div key={k.id} style={{ ...card, padding: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={dot(k.color, 10)} />
            <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{k.name}</span>
            <RowMenu actions={[
              { label: 'Edit', onClick: () => startEdit(k) },
              { label: 'Delete', color: C.red, onClick: () => setConfirmDel(k) },
            ]} />
          </div>
          <div style={{ fontSize: 12, color: C.t2, marginTop: 8 }}>
            {k.exercises.map(x => `${x.name} ${x.sets}×${x.reps}`).join(' · ') || 'No exercises'}
          </div>
        </div>
      ))}
      <button onClick={startNew} style={{
        width: '100%', padding: 14, background: 'transparent',
        border: `0.5px dashed ${C.border}`, borderRadius: 16,
        color: C.t2, fontSize: 14, cursor: 'pointer', marginTop: 6,
      }}>+ New kit</button>

      {confirmDel && (
        <Confirm
          title={`Delete "${confirmDel.name}"?`}
          message="Past session logs are kept; days planned with this kit become rest days."
          danger
          onConfirm={() => { deleteKit(confirmDel.id); setConfirmDel(null); }}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}
