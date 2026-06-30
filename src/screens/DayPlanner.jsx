import { useState } from 'react';
import { C, card, inp } from '../lib/theme.js';
import {
  newId, todayISO, fmtDate, hmToMin, minToHM, snapMin, blocksOverlap,
  classOccursOn, minutesUntilWindow,
} from '../lib/helpers.js';
import { Chip, Field, Confirm, Toggle } from '../components/ui.jsx';

const REMINDER_OPTS = [['on-day', 'At start'], ['10min', '10 min'], ['30min', '30 min'], ['1hour', '1 hour']];

// Timeline geometry. 06:00–24:00 on a 15-minute grid.
const DAY_START = 6 * 60;
const DAY_END = 24 * 60;
const PXPM = 1.4;          // pixels per minute
const SNAP = 15;
const MIN_DUR = 15;
const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const fmtMin = (min) => {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const ap = h < 12 ? 'AM' : 'PM';
  return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${ap}`;
};

const fmtCountdown = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

const blockColor = (kind, spaceColor) =>
  spaceColor || (kind === 'class' ? C.amber : kind === 'task' ? C.green : C.blue);

export function DayPlanner({
  date, mode, window, dayPlan, classes, tasks, spaces,
  blockTemplates, dayTemplates, planner,
}) {
  const editable = mode === 'edit';            // building tomorrow
  const isToday = date === todayISO();
  const [drag, setDrag] = useState(null);     // { id, start, end } in minutes, during a gesture
  const [editing, setEditing] = useState(null); // block being edited in the modal
  const [sheet, setSheet] = useState(null);    // 'palette' | 'templates' | null
  const [naming, setNaming] = useState(false);  // save-day-template name modal
  const [emergency, setEmergency] = useState(false);       // editing a locked plan
  const [confirmEmergency, setConfirmEmergency] = useState(false);
  const canEdit = editable || emergency;       // may mutate the timeline now
  const showChecks = mode === 'locked' && !emergency; // execute mode: check blocks off

  // Mutations route through the emergency-edit log when the plan is locked.
  const mutate = {
    update: (id, patch) => emergency
      ? planner.emergencyEdit(date, { kind: 'update', id, patch }, 'edited')
      : planner.updateBlock(date, id, patch),
    add: (block) => emergency
      ? planner.emergencyEdit(date, { kind: 'add', block }, 'added')
      : planner.addBlock(date, block),
    remove: (id) => emergency
      ? planner.emergencyEdit(date, { kind: 'remove', id }, 'removed')
      : planner.removeBlock(date, id),
  };

  const spaceColor = (id) => spaces.find(s => s.id === id)?.color;
  const userBlocks = dayPlan?.blocks || [];
  const classBlocks = classes
    .filter(c => classOccursOn(c, date))
    .map(c => ({
      id: `class:${c.id}`, title: c.name, start: c.start, end: c.end,
      kind: 'class', spaceId: c.spaceId, pinned: true,
    }));
  const allBlocks = [...classBlocks, ...userBlocks];

  // Effective times of a block (drag override wins while a gesture is live).
  const effective = (b) =>
    drag && drag.id === b.id ? { start: minToHM(drag.start), end: minToHM(drag.end) } : b;

  const overlapsOther = (b) => {
    const e = effective(b);
    return allBlocks.some(o => o.id !== b.id && blocksOverlap(e, effective(o)));
  };

  // --- drag to move / resize, snapping to the 15-min grid ---
  const beginDrag = (ev, block, kind) => {
    if (!canEdit || block.pinned) return;
    ev.stopPropagation();
    const startY = ev.clientY;
    const origStart = hmToMin(block.start);
    const origEnd = hmToMin(block.end);
    const dur = origEnd - origStart;
    let moved = false;
    let latest = { id: block.id, start: origStart, end: origEnd };

    const onMove = (e) => {
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 3) moved = true;
      const delta = snapMin(dy / PXPM);
      if (kind === 'move') {
        const s = clamp(origStart + delta, DAY_START, DAY_END - dur);
        latest = { id: block.id, start: s, end: s + dur };
      } else {
        const en = clamp(origEnd + delta, origStart + MIN_DUR, DAY_END);
        latest = { id: block.id, start: origStart, end: en };
      }
      setDrag(latest);
    };
    const onUp = () => {
      globalThis.removeEventListener('pointermove', onMove);
      globalThis.removeEventListener('pointerup', onUp);
      setDrag(null);
      if (moved) {
        mutate.update(block.id, { start: minToHM(latest.start), end: minToHM(latest.end) });
      } else {
        setEditing(block);
      }
    };
    globalThis.addEventListener('pointermove', onMove);
    globalThis.addEventListener('pointerup', onUp);
  };

  // --- adding blocks ---
  const findSlot = (durMin) => {
    for (let s = 8 * 60; s + durMin <= DAY_END; s += SNAP) {
      const cand = { start: minToHM(s), end: minToHM(s + durMin) };
      if (!allBlocks.some(b => blocksOverlap(cand, b))) return cand;
    }
    const s = clamp(DAY_END - durMin, DAY_START, DAY_END - durMin);
    return { start: minToHM(s), end: minToHM(s + durMin) };
  };
  const add = (partial, durMin = 60) =>
    mutate.add({ id: newId(), done: false, spaceId: '', ...findSlot(durMin), ...partial });

  const addCustom = (title) => { if (title.trim()) add({ title: title.trim(), kind: 'custom' }); };
  const addTask = (t) => add({ title: t.name, kind: 'task', refId: t.id, spaceId: t.spaceId });
  const addTemplate = (tpl) =>
    add({ title: tpl.title, kind: tpl.kind || 'custom', spaceId: tpl.spaceId || '', sourceTemplateId: tpl.id }, tpl.durationMin || 60);

  const applyDayTemplate = (tpl) => {
    planner.seedDay(date, (tpl.blocks || []).map(b => ({ ...b, id: newId(), done: false })));
    setSheet(null);
  };
  const saveDayTemplate = (name) => {
    if (!name.trim()) return;
    planner.saveDayTemplate({
      id: newId(), name: name.trim(),
      // eslint-disable-next-line no-unused-vars
      blocks: userBlocks.map(({ id, done, doneAt, ...rest }) => rest),
    });
    setNaming(false);
    setSheet(null);
  };
  const saveAsTemplate = (b) => {
    planner.saveBlockTemplate({
      id: newId(), title: b.title, kind: b.kind, spaceId: b.spaceId || '',
      durationMin: hmToMin(b.end) - hmToMin(b.start),
    });
  };

  const committed = dayPlan?.status === 'locked' || !!dayPlan?.committedAt;
  const incompleteTasks = tasks.filter(t => !t.done);

  return (
    <div style={{ padding: '6px 16px 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '4px 2px 12px' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{isToday ? "Today's plan" : 'Tomorrow'}</div>
          <div style={{ fontSize: 12, color: C.t2, marginTop: 2 }}>{fmtDate(date)}</div>
        </div>
        <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: C.t3, textAlign: 'right' }}>
          {userBlocks.length} block{userBlocks.length === 1 ? '' : 's'}
          {classBlocks.length > 0 && <> · {classBlocks.length} class{classBlocks.length === 1 ? '' : 'es'}</>}
        </div>
      </div>

      {/* Future day, not yet plannable */}
      {mode === 'readonly' && (
        <div style={{ ...card, padding: 16, marginBottom: 14, borderLeft: `3px solid ${C.bookmark}` }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>The planner opens at {fmtMin(hmToMin(window.start))}</div>
          <div style={{ fontSize: 12, color: C.t2, marginTop: 4 }}>
            Come back to build tomorrow. Opens in {fmtCountdown(minutesUntilWindow(new Date(), window))}.
          </div>
        </div>
      )}

      {/* Locked today with nothing planned */}
      {mode === 'locked' && userBlocks.length === 0 && !emergency && (
        <div style={{ ...card, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>No plan locked in for today</div>
          <div style={{ fontSize: 12, color: C.t2, marginTop: 4 }}>Build your day the night before to see it here.</div>
        </div>
      )}

      {/* Action row */}
      {(editable || emergency) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setSheet('palette')}
            style={{ flex: 1, padding: 11, borderRadius: 12, border: 'none', background: C.amber, color: C.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >+ Add block</button>
          {editable && (
            <button
              onClick={() => setSheet('templates')}
              style={{ padding: '11px 16px', borderRadius: 12, border: `0.5px solid ${C.border}`, background: C.s2, color: C.t1, fontSize: 13, cursor: 'pointer' }}
            >Templates</button>
          )}
          {emergency && (
            <button
              onClick={() => setEmergency(false)}
              style={{ padding: '11px 16px', borderRadius: 12, border: `0.5px solid ${C.border}`, background: C.s2, color: C.t1, fontSize: 13, cursor: 'pointer' }}
            >Done</button>
          )}
        </div>
      )}

      {/* Emergency entry / banner for a locked plan */}
      {mode === 'locked' && userBlocks.length > 0 && !emergency && (
        <button
          onClick={() => setConfirmEmergency(true)}
          style={{ width: '100%', padding: 11, marginBottom: 12, borderRadius: 12, border: `0.5px solid ${C.red}55`, background: 'transparent', color: C.red, fontSize: 13, cursor: 'pointer' }}
        >Emergency change</button>
      )}
      {emergency && (
        <div style={{ ...card, padding: '9px 12px', marginBottom: 12, borderLeft: `3px solid ${C.red}` }}>
          <span style={{ fontSize: 12, color: C.t2 }}>Emergency editing — every change is logged.</span>
        </div>
      )}

      {/* Timeline */}
      <div style={{ display: 'flex', gap: 8 }}>
        {/* Hour gutter */}
        <div style={{ width: 44, flexShrink: 0, position: 'relative', height: (DAY_END - DAY_START) * PXPM }}>
          {HOURS.map(h => (
            <div key={h} style={{ position: 'absolute', top: (h - DAY_START) * PXPM - 6, right: 6, fontSize: 9, fontFamily: 'DM Mono', color: C.t3 }}>
              {fmtMin(h)}
            </div>
          ))}
        </div>
        {/* Lane */}
        <div style={{ position: 'relative', flex: 1, height: (DAY_END - DAY_START) * PXPM, background: C.s1, borderRadius: 12, border: `0.5px solid ${C.border}`, overflow: 'hidden' }}>
          {HOURS.map(h => (
            <div key={h} style={{ position: 'absolute', left: 0, right: 0, top: (h - DAY_START) * PXPM, height: 0.5, background: C.border, opacity: 0.6 }} />
          ))}
          {allBlocks.map(b => {
            const e = effective(b);
            const top = (hmToMin(e.start) - DAY_START) * PXPM;
            const height = Math.max((hmToMin(e.end) - hmToMin(e.start)) * PXPM, 16);
            const col = blockColor(b.kind, spaceColor(b.spaceId));
            const bad = overlapsOther(b);
            return (
              <div
                key={b.id}
                onPointerDown={(ev) => beginDrag(ev, b, 'move')}
                style={{
                  position: 'absolute', top, left: 4, right: 4, height,
                  background: `${col}1f`, border: `0.5px solid ${col}66`, borderLeft: `3px solid ${col}`,
                  borderRadius: 8, padding: '4px 8px', overflow: 'hidden',
                  touchAction: b.pinned || !canEdit ? 'auto' : 'none',
                  cursor: b.pinned || !canEdit ? 'default' : 'grab',
                  boxShadow: bad ? `inset 0 0 0 1px ${C.red}` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {b.pinned && <span style={{ fontSize: 8 }}>📌</span>}
                  <span style={{ flex: 1, fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: b.done ? 'line-through' : 'none', color: b.done ? C.t3 : C.t1 }}>
                    {b.title}
                  </span>
                  {showChecks && !b.pinned && (
                    <button
                      onPointerDown={(ev) => ev.stopPropagation()}
                      onClick={(ev) => { ev.stopPropagation(); planner.toggleBlock(date, b.id); }}
                      aria-label={b.done ? 'Mark not done' : 'Mark done'}
                      style={{
                        width: 18, height: 18, flexShrink: 0, borderRadius: 6, padding: 0, cursor: 'pointer',
                        border: `1.5px solid ${b.done ? col : C.t3}`, background: b.done ? col : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >{b.done && <span style={{ color: C.bg, fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}</button>
                  )}
                </div>
                {height > 30 && (
                  <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: C.t2, marginTop: 2 }}>
                    {fmtMin(hmToMin(e.start))} – {fmtMin(hmToMin(e.end))}
                  </div>
                )}
                {/* Resize handle */}
                {canEdit && !b.pinned && (
                  <div
                    onPointerDown={(ev) => beginDrag(ev, b, 'resize')}
                    style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, cursor: 'ns-resize', touchAction: 'none' }}
                  >
                    <div style={{ width: 24, height: 3, borderRadius: 2, background: `${col}99`, margin: '6px auto 0' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Commit */}
      {editable && (
        <button
          onClick={() => planner.commitDay(date)}
          style={{
            width: '100%', marginTop: 14, padding: 13, borderRadius: 12, border: 'none',
            background: committed ? C.s2 : C.amber, color: committed ? C.green : C.bg,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >{committed ? '✓ Locked in — tap to update' : 'Lock in tomorrow'}</button>
      )}

      {/* Block editor */}
      {editing && (
        <BlockEditor
          block={userBlocks.find(b => b.id === editing.id) || editing}
          onChange={(patch) => mutate.update(editing.id, patch)}
          onRemove={() => { mutate.remove(editing.id); setEditing(null); }}
          onSaveTemplate={() => { saveAsTemplate(userBlocks.find(b => b.id === editing.id) || editing); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Palette */}
      {sheet === 'palette' && (
        <Palette
          tasks={incompleteTasks} templates={blockTemplates} spaces={spaces}
          onAddCustom={addCustom} onAddTask={addTask} onAddTemplate={addTemplate}
          onClose={() => setSheet(null)}
        />
      )}

      {/* Day templates */}
      {sheet === 'templates' && (
        <Sheet title="Day templates" onClose={() => setSheet(null)}>
          {dayTemplates.length === 0 && <div style={{ fontSize: 12, color: C.t3, padding: '8px 0' }}>No saved day templates yet.</div>}
          {dayTemplates.map(t => (
            <button key={t.id} onClick={() => applyDayTemplate(t)} style={rowBtn}>
              <span>{t.name}</span>
              <span style={{ fontSize: 11, color: C.t3, fontFamily: 'DM Mono' }}>{(t.blocks || []).length} blocks →</span>
            </button>
          ))}
          <button
            onClick={() => setNaming(true)}
            disabled={userBlocks.length === 0}
            style={{ ...rowBtn, color: userBlocks.length ? C.amber : C.t3, justifyContent: 'center' }}
          >+ Save tomorrow as a template</button>
        </Sheet>
      )}

      {naming && (
        <NameModal
          title="Name this day template"
          onSave={saveDayTemplate}
          onCancel={() => setNaming(false)}
        />
      )}

      {confirmEmergency && (
        <Confirm
          title="Make an emergency change?"
          message="Today's plan is locked. This change is recorded and counts toward your plan-discipline stats."
          onConfirm={() => { setEmergency(true); setConfirmEmergency(false); }}
          onCancel={() => setConfirmEmergency(false)}
        />
      )}
    </div>
  );
}

const rowBtn = {
  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 4px', background: 'none', border: 'none', borderBottom: `0.5px solid ${C.border}`,
  color: C.t1, fontSize: 14, cursor: 'pointer', textAlign: 'left',
};

function Sheet({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 20, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTop: `0.5px solid ${C.border}`, width: '100%', maxHeight: '70%', overflowY: 'auto', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.t3, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Palette({ tasks, templates, spaces, onAddCustom, onAddTask, onAddTemplate, onClose }) {
  const [title, setTitle] = useState('');
  const spaceColor = (id) => spaces.find(s => s.id === id)?.color;
  const submit = () => { onAddCustom(title); setTitle(''); onClose(); };
  return (
    <Sheet title="Add to tomorrow" onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Quick block — e.g. Deep work" style={{ ...inp, fontSize: 13 }} autoFocus
        />
        {title.trim() && (
          <button onClick={submit} style={{ padding: '0 16px', borderRadius: 12, border: 'none', background: C.amber, color: C.bg, fontWeight: 600, cursor: 'pointer' }}>Add</button>
        )}
      </div>

      {templates.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: C.t3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Templates</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {templates.map(t => (
              <Chip key={t.id} color={spaceColor(t.spaceId)} onClick={() => { onAddTemplate(t); onClose(); }}>{t.title}</Chip>
            ))}
          </div>
        </>
      )}

      <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: C.t3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tasks</div>
      {tasks.length === 0 ? (
        <div style={{ fontSize: 12, color: C.t3, padding: '4px 0 8px' }}>No open tasks to schedule.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
          {tasks.slice(0, 30).map(t => (
            <button key={t.id} onClick={() => { onAddTask(t); onClose(); }} style={{ ...rowBtn, borderBottom: 'none', background: C.s1, borderRadius: 10, padding: '10px 12px' }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
              <span style={{ color: spaceColor(t.spaceId) || C.t3, fontSize: 16 }}>+</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function BlockEditor({ block, onChange, onRemove, onClose, onSaveTemplate }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ ...card, padding: 18, width: '100%', maxWidth: 320 }}>
        <input value={block.title} onChange={e => onChange({ title: e.target.value })} placeholder="Block title" style={{ ...inp, marginBottom: 14 }} autoFocus />
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Start">
            <input type="time" value={block.start} onChange={e => onChange({ start: e.target.value })} style={inp} />
          </Field>
          <Field label="End">
            <input type="time" value={block.end} onChange={e => onChange({ end: e.target.value })} style={inp} />
          </Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: block.reminder ? 10 : 14 }}>
          <span style={{ fontSize: 13 }}>Reminder</span>
          <Toggle on={!!block.reminder} onChange={v => onChange({ reminder: v ? { timing: '10min' } : null })} />
        </div>
        {block.reminder && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {REMINDER_OPTS.map(([v, l]) => (
              <Chip key={v} active={block.reminder.timing === v} onClick={() => onChange({ reminder: { timing: v } })}>{l}</Chip>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={() => setConfirmRemove(true)} style={{ flex: 1, padding: 10, background: C.s2, border: `0.5px solid ${C.border}`, borderRadius: 100, color: C.red, fontSize: 13, cursor: 'pointer' }}>Remove</button>
          <button onClick={onSaveTemplate} style={{ flex: 1, padding: 10, background: C.s2, border: `0.5px solid ${C.border}`, borderRadius: 100, color: C.t1, fontSize: 13, cursor: 'pointer' }}>Save template</button>
          <button onClick={onClose} style={{ flex: 1, padding: 10, background: C.amber, border: 'none', borderRadius: 100, color: C.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Done</button>
        </div>
      </div>
      {confirmRemove && (
        <Confirm
          title="Remove this block?"
          message="It will be taken off tomorrow's timeline."
          danger
          onConfirm={onRemove}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  );
}

function NameModal({ title, onSave, onCancel }) {
  const [name, setName] = useState('');
  return (
    <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ ...card, padding: 18, width: '100%', maxWidth: 300 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{title}</div>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSave(name)} placeholder="e.g. Weekday" style={{ ...inp, marginBottom: 14 }} autoFocus />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 10, background: C.s2, border: `0.5px solid ${C.border}`, borderRadius: 100, color: C.t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onSave(name)} disabled={!name.trim()} style={{ flex: 1, padding: 10, background: name.trim() ? C.amber : C.s3, border: 'none', borderRadius: 100, color: name.trim() ? C.bg : C.t3, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  );
}
