import { useState } from 'react';
import { C, card, screenTitle, screenPad, inp, dot, sectionLabel } from '../lib/theme.js';
import { weekDays, fmtTime } from '../lib/helpers.js';
import { Empty, Confirm, Field, DayPicker, Toggle, Chip } from '../components/ui.jsx';

const WEEKS_OPTS = [['all', 'Every week'], ['odd', 'Odd weeks'], ['even', 'Even weeks']];
const REMINDER_OPTS = [['on-day', 'At start'], ['10min', '10 min'], ['30min', '30 min'], ['1hour', '1 hour']];

const blank = () => ({
  id: null, name: '', spaceId: '', days: [], start: '09:00', end: '10:00',
  location: '', weeks: 'all', active: true,
  reminderOn: false, reminderTiming: '10min',
});

export function Classes({ classes, spaces, saveClass, deleteClass, setScreen }) {
  const [form, setForm] = useState(null); // null = not editing
  const [confirmDelete, setConfirmDelete] = useState(null);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const spaceColor = (id) => spaces.find(s => s.id === id)?.color || C.amber;
  const sorted = [...classes].sort((a, b) => (a.start || '').localeCompare(b.start || ''));

  const startAdd = () => setForm(blank());
  const startEdit = (c) => setForm({
    id: c.id, name: c.name, spaceId: c.spaceId || '', days: c.days || [],
    start: c.start || '09:00', end: c.end || '10:00', location: c.location || '',
    weeks: c.weeks || 'all', active: c.active !== false,
    reminderOn: !!c.reminder, reminderTiming: c.reminder?.timing || '10min',
  });
  const cancel = () => setForm(null);

  const save = () => {
    if (!form.name.trim() || form.days.length === 0) return;
    saveClass({
      id: form.id,
      name: form.name.trim(),
      spaceId: form.spaceId,
      days: form.days,
      start: form.start,
      end: form.end,
      location: form.location.trim(),
      weeks: form.weeks,
      active: form.active,
      reminder: form.reminderOn ? { timing: form.reminderTiming } : null,
    });
    cancel();
  };

  const remove = (id) => { deleteClass(id); setConfirmDelete(null); };

  return (
    <div style={screenPad}>
      <button
        onClick={() => setScreen('settings')}
        style={{ background: 'none', border: 'none', color: C.t2, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}
      >← Back</button>
      <div style={screenTitle}>Class schedule</div>
      <div style={{ fontSize: 12, color: C.t2, marginTop: 4, marginBottom: 20 }}>
        Your recurring weekly timetable
      </div>

      {/* Weekly grid preview */}
      {classes.length > 0 && (
        <>
          <div style={sectionLabel}>This week</div>
          <div className="scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 18 }}>
            {weekDays.map(dk => {
              const dayClasses = sorted.filter(c => c.active !== false && (c.days || []).includes(dk));
              return (
                <div key={dk} style={{ width: 92, flexShrink: 0 }}>
                  <div style={{
                    fontSize: 10, fontFamily: 'DM Mono', textTransform: 'uppercase',
                    color: C.t3, letterSpacing: 1, textAlign: 'center', marginBottom: 6,
                  }}>{dk}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {dayClasses.length === 0
                      ? <div style={{ height: 4 }} />
                      : dayClasses.map(c => {
                        const col = spaceColor(c.spaceId);
                        return (
                          <button
                            key={c.id}
                            onClick={() => startEdit(c)}
                            style={{
                              textAlign: 'left', cursor: 'pointer', padding: '6px 8px',
                              borderRadius: 9, background: `${col}1c`,
                              border: `0.5px solid ${col}55`, borderLeft: `2px solid ${col}`,
                              color: C.t1,
                            }}
                          >
                            <div style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                            <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: C.t2, marginTop: 2 }}>{fmtTime(c.start)}</div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Class list */}
      {classes.length === 0 && !form && <Empty>No classes yet</Empty>}

      {!form && sorted.map(c => {
        const col = spaceColor(c.spaceId);
        const space = spaces.find(s => s.id === c.spaceId);
        return (
          <div
            key={c.id}
            onClick={() => startEdit(c)}
            style={{
              ...card, padding: 14, marginBottom: 8, cursor: 'pointer',
              borderLeft: `3px solid ${col}`, opacity: c.active === false ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{c.name}</span>
              {c.weeks && c.weeks !== 'all' && (
                <span style={{ fontSize: 9, fontFamily: 'DM Mono', textTransform: 'uppercase', color: C.t3 }}>{c.weeks}</span>
              )}
              {c.reminder && <span style={{ fontSize: 11, color: C.t3 }}>🔔</span>}
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }}
                aria-label="Delete"
                style={{ background: 'none', border: 'none', color: C.t3, fontSize: 17, cursor: 'pointer', padding: 4 }}
              >×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, ...{ fontSize: 11, color: C.t2 } }}>
              <span style={{ fontFamily: 'DM Mono' }}>{(c.days || []).join(' ')}</span>
              <span style={{ color: C.t3 }}>·</span>
              <span style={{ fontFamily: 'DM Mono' }}>{fmtTime(c.start)} – {fmtTime(c.end)}</span>
              {space && <><span style={dot(space.color)} /><span>{space.name}</span></>}
              {c.location && <span style={{ color: C.t3 }}>· {c.location}</span>}
            </div>
          </div>
        );
      })}

      {/* Add / edit form */}
      {!form ? (
        <button
          onClick={startAdd}
          style={{
            width: '100%', padding: 14, background: 'transparent',
            border: `0.5px dashed ${C.border}`, borderRadius: 16,
            color: C.t2, fontSize: 14, cursor: 'pointer', marginTop: 6,
          }}
        >+ New class</button>
      ) : (
        <div style={{ ...card, padding: 16, marginTop: 6 }}>
          <input
            value={form.name}
            onChange={e => upd('name', e.target.value)}
            placeholder="Class name"
            style={{ ...inp, marginBottom: 14 }}
            autoFocus
          />

          <Field label="Days">
            <DayPicker days={form.days} setDays={v => upd('days', v)} />
          </Field>

          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Start">
              <input type="time" value={form.start} onChange={e => upd('start', e.target.value)} style={inp} />
            </Field>
            <Field label="End">
              <input type="time" value={form.end} onChange={e => upd('end', e.target.value)} style={inp} />
            </Field>
          </div>

          <Field label="Space">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Chip active={!form.spaceId} onClick={() => upd('spaceId', '')}>None</Chip>
              {spaces.map(s => (
                <Chip key={s.id} active={form.spaceId === s.id} color={s.color} onClick={() => upd('spaceId', s.id)}>
                  {s.name}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Location (optional)">
            <input
              value={form.location}
              onChange={e => upd('location', e.target.value)}
              placeholder="Room, building…"
              style={inp}
            />
          </Field>

          <Field label="Repeats">
            <div style={{ display: 'flex', gap: 6 }}>
              {WEEKS_OPTS.map(([v, l]) => (
                <Chip key={v} active={form.weeks === v} onClick={() => upd('weeks', v)}>{l}</Chip>
              ))}
            </div>
          </Field>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.reminderOn ? 12 : 14 }}>
            <div style={{ fontSize: 13 }}>Reminder before class</div>
            <Toggle on={form.reminderOn} onChange={v => upd('reminderOn', v)} />
          </div>
          {form.reminderOn && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {REMINDER_OPTS.map(([v, l]) => (
                <Chip key={v} active={form.reminderTiming === v} onClick={() => upd('reminderTiming', v)}>{l}</Chip>
              ))}
            </div>
          )}

          {form.id && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13 }}>Active</div>
                <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Off keeps it without scheduling</div>
              </div>
              <Toggle on={form.active} onChange={v => upd('active', v)} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={cancel}
              style={{ flex: 1, padding: 10, background: C.s2, border: `0.5px solid ${C.border}`, borderRadius: 100, color: C.t2, fontSize: 13, cursor: 'pointer' }}
            >Cancel</button>
            <button
              onClick={save}
              disabled={!form.name.trim() || form.days.length === 0}
              style={{
                flex: 1, padding: 10, border: 'none', borderRadius: 100,
                background: (!form.name.trim() || form.days.length === 0) ? C.s3 : C.amber,
                color: (!form.name.trim() || form.days.length === 0) ? C.t3 : C.bg,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >{form.id ? 'Update' : 'Create'}</button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <Confirm
          title={`Delete "${confirmDelete.name}"?`}
          message="This class will be removed from your timetable and any reminders cancelled."
          danger
          onConfirm={() => remove(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
