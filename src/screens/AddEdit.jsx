import React from 'react';
import { C, card, navBtn, primaryBtn, inp, screenPad, SWATCHES } from '../lib/theme.js';
import { todayISO, addDays, fmtTime } from '../lib/helpers.js';
import { Field, Chip, DayPicker } from '../components/ui.jsx';

const RECUR_OPTS = [
  ['none', 'Does not repeat'],
  ['daily', 'Every day'],
  ['weekdays', 'Every weekday'],
  ['weekly', 'Every week'],
  ['biweekly', 'Every 2 weeks'],
  ['monthly', 'Every month'],
  ['custom', 'Custom…'],
];

export function AddEdit({ draft, setDraft, spaces, saveDraft, setScreen, isEdit, deleteCurrent }) {
  const upd = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const notifLabel = draft.notifEnabled
    ? `${draft.notifTiming} at ${fmtTime(draft.notifTime)}`
    : 'Off';

  return (
    <div style={screenPad}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => setScreen('home')} style={navBtn}>← Cancel</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {isEdit && (
            <button
              onClick={deleteCurrent}
              style={{ ...navBtn, color: C.red }}
            >Delete</button>
          )}
          <button onClick={saveDraft} style={primaryBtn}>{isEdit ? 'Update' : 'Save'}</button>
        </div>
      </div>

      {/* Type toggle - hidden in edit mode (you can't change type after creation) */}
      {!isEdit && (
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: C.s1, border: `0.5px solid ${C.border}`,
          borderRadius: 100, marginBottom: 20,
        }}>
          {['task', 'event', 'habit'].map(t => (
            <button
              key={t}
              onClick={() => upd('type', t)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 100, border: 'none',
                background: draft.type === t ? C.amber : 'transparent',
                color: draft.type === t ? C.bg : C.t2,
                fontSize: 12, fontWeight: 500, textTransform: 'capitalize', cursor: 'pointer',
              }}
            >{t}</button>
          ))}
        </div>
      )}

      {isEdit && (
        <div style={{ fontSize: 11, color: C.t3, fontFamily: 'DM Mono', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>
          Editing {draft.type}
        </div>
      )}

      <Field label="Name">
        <input
          value={draft.name}
          onChange={e => upd('name', e.target.value)}
          placeholder={`What's the ${draft.type}?`}
          style={inp}
          autoFocus={!isEdit}
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={draft.notes}
          onChange={e => upd('notes', e.target.value)}
          placeholder="Optional details"
          rows={2}
          style={{ ...inp, resize: 'none' }}
        />
      </Field>

      <Field label="Space">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip active={draft.spaceId === ''} onClick={() => upd('spaceId', '')}>None</Chip>
          {spaces.map(s => (
            <Chip
              key={s.id}
              active={draft.spaceId === s.id}
              color={s.color}
              onClick={() => upd('spaceId', s.id)}
            >{s.name}</Chip>
          ))}
        </div>
      </Field>

      {draft.type === 'task' && (
        <>
          <Field label="Deadline">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip active={draft.deadline === todayISO()} onClick={() => upd('deadline', todayISO())}>Today</Chip>
              <Chip active={draft.deadline === addDays(1)} onClick={() => upd('deadline', addDays(1))}>Tomorrow</Chip>
              <Chip active={draft.deadline === addDays(7)} onClick={() => upd('deadline', addDays(7))}>This week</Chip>
              <input
                type="date"
                value={draft.deadline}
                onChange={e => upd('deadline', e.target.value)}
                style={{ ...inp, width: 'auto', padding: '7px 10px', fontSize: 12 }}
              />
            </div>
          </Field>

          <Field label="Priority">
            <div style={{ display: 'flex', gap: 6 }}>
              {['high', 'medium', 'low'].map(p => (
                <Chip
                  key={p}
                  active={draft.priority === p}
                  onClick={() => upd('priority', p)}
                >{p[0].toUpperCase() + p.slice(1)}</Chip>
              ))}
            </div>
          </Field>

          <Field label="Repeat">
            <select
              value={draft.recurrence}
              onChange={e => upd('recurrence', e.target.value)}
              style={inp}
            >
              {RECUR_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>

          {draft.recurrence === 'custom' && (
            <DayPicker days={draft.customDays} setDays={v => upd('customDays', v)} />
          )}
        </>
      )}

      {draft.type === 'event' && (
        <>
          <Field label="Date">
            <input
              type="date"
              value={draft.date}
              onChange={e => upd('date', e.target.value)}
              style={inp}
            />
          </Field>

          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Start">
              <input type="time" value={draft.startTime} onChange={e => upd('startTime', e.target.value)} style={inp} />
            </Field>
            <Field label="End">
              <input type="time" value={draft.endTime} onChange={e => upd('endTime', e.target.value)} style={inp} />
            </Field>
          </div>

          <Field label="Recurrence">
            <select
              value={draft.recurrence}
              onChange={e => upd('recurrence', e.target.value)}
              style={inp}
            >
              {RECUR_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>

          {draft.recurrence === 'custom' && (
            <DayPicker days={draft.customDays} setDays={v => upd('customDays', v)} />
          )}
        </>
      )}

      {draft.type === 'habit' && (
        <>
          <Field label="Frequency">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[['daily', 'Daily'], ['weekdays', 'Weekdays'], ['3x', '3× per week'], ['custom', 'Custom']].map(([v, l]) => (
                <Chip
                  key={v}
                  active={draft.frequency === v}
                  onClick={() => upd('frequency', v)}
                >{l}</Chip>
              ))}
            </div>
          </Field>

          {draft.frequency === 'custom' && (
            <DayPicker days={draft.customDays} setDays={v => upd('customDays', v)} />
          )}

          <Field label="Color">
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 8, marginBottom: 10,
            }}>
              {SWATCHES.map(c => (
                <button
                  key={c}
                  onClick={() => upd('color', c)}
                  style={{
                    aspectRatio: '1 / 1', borderRadius: 100,
                    background: c,
                    border: draft.color === c ? `2px solid ${C.t1}` : `0.5px solid ${C.border}`,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                width: 24, height: 24, borderRadius: 100,
                background: draft.color, flexShrink: 0,
                border: `0.5px solid ${C.border}`,
              }} />
              <input
                type="text"
                value={draft.color}
                onChange={e => {
                  const v = e.target.value.trim();
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v) || v === '') upd('color', v);
                }}
                placeholder="#RRGGBB"
                style={{ ...inp, fontFamily: 'DM Mono', fontSize: 12 }}
              />
              <input
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/.test(draft.color) ? draft.color : C.amber}
                onChange={e => upd('color', e.target.value)}
                style={{
                  width: 40, height: 40, padding: 0,
                  border: `0.5px solid ${C.border}`, borderRadius: 8,
                  background: 'transparent', cursor: 'pointer',
                }}
              />
            </div>
          </Field>

          <Field label="Goal (days)">
            <input
              type="number"
              value={draft.goalDays}
              onChange={e => upd('goalDays', e.target.value)}
              style={inp}
            />
          </Field>
        </>
      )}

      <button
        onClick={() => setScreen('notif')}
        style={{
          ...card, width: '100%', padding: '14px 16px', marginTop: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', color: C.t1,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          🔔 <span style={{ fontSize: 14 }}>Notifications</span>
        </span>
        <span style={{ fontSize: 12, color: C.t2 }}>{notifLabel} ›</span>
      </button>
    </div>
  );
}
