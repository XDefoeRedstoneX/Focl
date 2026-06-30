import { useState } from 'react';
import { C, card, screenPad, monoMicro, dot } from '../lib/theme.js';
import { todayISO, weekISO, weekDaysFrom, fmtTime, agendaForDay } from '../lib/helpers.js';

// Calendar/agenda: a week strip to pick a day, and a timeline merging that
// day's events and scheduled tasks. Tapping a row opens the item for edit.
export function Plan({ tasks, events, spaces, classes = [], openEdit, setScreen }) {
  const today = todayISO();
  const [selected, setSelected] = useState(today);
  const week = weekISO();
  const dayKeys = weekDaysFrom();

  const agenda = agendaForDay(tasks, events, selected, classes);
  const spaceColor = (id) => spaces.find(s => s.id === id)?.color || C.amber;

  const sel = new Date(selected + 'T00:00:00');
  const dayTitle = selected === today
    ? 'Today'
    : sel.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' });

  return (
    <div style={screenPad}>
      {/* Week strip */}
      <div className="scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
        {week.map((d, i) => {
          const isSel = d === selected;
          const isToday = d === today;
          const has = agendaForDay(tasks, events, d, classes).length > 0;
          const dateNum = new Date(d + 'T00:00:00').getDate();
          return (
            <button
              key={d}
              onClick={() => setSelected(d)}
              style={{
                width: 46, flexShrink: 0, padding: '10px 0 8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                borderRadius: 14, cursor: 'pointer',
                border: `0.5px solid ${isSel ? C.amber : C.border}`,
                background: isSel ? 'rgba(92,198,207,0.12)' : C.s1,
              }}
            >
              <span style={{
                fontSize: 10, fontFamily: 'DM Mono', textTransform: 'uppercase',
                color: isSel ? C.amber : C.t3,
              }}>{dayKeys[i]}</span>
              <span style={{
                fontSize: 16, fontWeight: 600, fontFamily: 'DM Mono',
                color: isSel ? C.t1 : (isToday ? C.amber : C.t2),
              }}>{dateNum}</span>
              <span style={{
                width: 4, height: 4, borderRadius: 100,
                background: has ? (isSel ? C.amber : C.t3) : 'transparent',
              }} />
            </button>
          );
        })}
      </div>

      {/* Day title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '20px 2px 14px' }}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{dayTitle}</span>
        <span style={monoMicro}>{agenda.length} item{agenda.length === 1 ? '' : 's'}</span>
      </div>

      {/* Agenda */}
      {agenda.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.t3 }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🌙</div>
          <div style={{ fontSize: 13 }}>Nothing scheduled. Enjoy the quiet.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {agenda.map(({ kind, item, time }) => {
            const color = spaceColor(item.spaceId);
            const isEvent = kind === 'event';
            const isClass = kind === 'class';
            const meta = isEvent
              ? `${fmtTime(item.startDatetime.slice(11, 16))} – ${fmtTime(item.endDatetime.slice(11, 16))}`
              : isClass
                ? `${fmtTime(item.start)} – ${fmtTime(item.end)}${item.location ? ` · ${item.location}` : ''}`
                : (item.priority || 'task');
            const label = isEvent ? 'Event' : isClass ? 'Class' : 'Task';
            // Classes are edited in the Settings schedule editor, not the
            // add/edit sheet that tasks and events use.
            const onClick = isClass ? () => setScreen?.('classes') : () => openEdit(item, kind);
            return (
              <div key={`${kind}-${item.id}`} style={{ display: 'flex', gap: 12 }}>
                {/* Time gutter */}
                <div style={{ width: 52, textAlign: 'right', flexShrink: 0, paddingTop: 13 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'DM Mono', color: time ? C.t2 : C.t3 }}>
                    {time ? fmtTime(time) : '—'}
                  </span>
                </div>
                {/* Card */}
                <button
                  onClick={onClick}
                  style={{
                    ...card, flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer',
                    padding: '12px 14px', borderLeft: `3px solid ${color}`, color: C.t1,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{
                      fontSize: 9, fontFamily: 'DM Mono', textTransform: 'uppercase',
                      padding: '2px 6px', borderRadius: 5,
                      background: `${color}1c`, color,
                    }}>{label}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, ...monoMicro }}>
                      {!isEvent && !isClass && <span style={dot(color)} />}{meta}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
