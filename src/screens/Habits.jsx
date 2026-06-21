import React from 'react';
import { C, card, sectionTitle, dot } from '../lib/theme.js';
import { todayISO, weekISO, weekDaysFrom, isHabitDueOn } from '../lib/helpers.js';
import { Stat, Empty } from '../components/ui.jsx';

const FREQ_LABEL = { daily: 'Daily', weekdays: 'Weekdays', '3x': '3× / week', custom: 'Custom' };

export function Habits({ habits, spaces, toggleHabitDay, openEdit }) {
  const week = weekISO();
  const today = todayISO();
  const dayKeys = weekDaysFrom();
  const bestStreak = Math.max(0, ...habits.map(h => h.streakBest || 0));
  const totalSlots = habits.length * 7;
  const filled = habits.reduce(
    (s, h) => s + week.filter(d => h.completions.includes(d)).length,
    0
  );
  const weekPct = totalSlots ? Math.round((filled / totalSlots) * 100) : 0;
  const lifetimeDone = habits.reduce((s, h) => s + h.completions.length, 0);

  return (
    <div style={{ padding: '8px 20px 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        <Stat label="Best streak" value={bestStreak} suffix="d" color={C.bookmark} />
        <Stat label="This week" value={weekPct} suffix="%" />
        <Stat label="Lifetime" value={lifetimeDone} suffix="" />
      </div>

      {habits.length === 0 && <Empty>No habits yet — tap + to add one</Empty>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habits.map(h => {
          const sp = spaces.find(s => s.id === h.spaceId);
          const doneToday = h.completions.includes(today);
          const dueToday = isHabitDueOn(h, today);
          const sub = [sp?.name, FREQ_LABEL[h.frequency] || h.frequency].filter(Boolean).join(' · ');

          return (
            <div
              key={h.id}
              onClick={() => openEdit(h, 'habit')}
              style={{ ...card, padding: 15, borderRadius: 18, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleHabitDay(h.id, today); }}
                  aria-label={doneToday ? 'Mark not done' : 'Mark done'}
                  style={{
                    width: 30, height: 30, borderRadius: 9,
                    border: `1.5px solid ${doneToday ? h.color : (dueToday ? C.t3 : C.border)}`,
                    background: doneToday ? h.color : 'transparent',
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: dueToday ? 1 : 0.5, transition: 'all .15s',
                  }}
                >
                  {doneToday && <span style={{ color: C.bg, fontSize: 15, fontWeight: 700 }}>✓</span>}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: C.t2, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={dot(h.color)} />{sub}
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 13, fontFamily: 'DM Mono',
                  color: h.streakCurrent > 7 ? C.bookmark : C.t2,
                }}>🔥 {h.streakCurrent}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                {week.map((d, i) => {
                  const done = h.completions.includes(d);
                  const isToday = d === today;
                  return (
                    <button
                      key={d}
                      onClick={(e) => { e.stopPropagation(); toggleHabitDay(h.id, d); }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 5, background: 'none', border: 'none', cursor: 'pointer',
                        padding: '4px 6px', margin: '-4px -2px',
                      }}
                    >
                      <span style={{ fontSize: 9, fontFamily: 'DM Mono', color: C.t3 }}>{dayKeys[i][0]}</span>
                      <span style={{
                        width: 15, height: 15, borderRadius: 100,
                        background: done ? h.color : C.s3,
                        border: isToday ? `1.5px solid ${C.amber}` : 'none',
                      }} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {habits.length > 0 && (
        <div style={{ ...card, marginTop: 20, padding: 14 }}>
          <div style={{ ...sectionTitle, marginBottom: 12 }}>Week overview</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 18px)', gap: 6, alignItems: 'center' }}>
            <span />
            {dayKeys.map(d => (
              <span key={d} style={{ fontSize: 9, fontFamily: 'DM Mono', color: C.t3, textAlign: 'center' }}>
                {d[0]}
              </span>
            ))}
            {habits.map(h => (
              <React.Fragment key={h.id}>
                <span style={{
                  fontSize: 11, color: C.t2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{h.name}</span>
                {week.map(d => (
                  <span
                    key={d}
                    style={{
                      width: 12, height: 12, borderRadius: 100,
                      background: h.completions.includes(d) ? h.color : C.s3,
                      justifySelf: 'center',
                    }}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
