import { useState, useMemo } from 'react';
import { C, card, screenTitle, screenPad, sectionTitle, sectionLabel, dot, monoMicro, accentTint } from '../lib/theme.js';
import { weekDaysFrom, weekISO } from '../lib/helpers.js';

/**
 * Analytics: current week's stats + archived past weeks.
 *
 * Props:
 *   tasks, events, habits, spaces (current data)
 *   archive: [{ weekStart: 'YYYY-MM-DD', snapshot: {...} }] (past weeks)
 */
export function Analytics({ tasks, events, habits, spaces, archive }) {
  const [activeWeek, setActiveWeek] = useState('current');

  const allWeeks = useMemo(() => {
    const current = computeCurrentWeek({ tasks, events, habits, spaces });
    return [current, ...archive].slice(0, 12); // cap at 12 weeks back
  }, [tasks, events, habits, spaces, archive]);

  const active = activeWeek === 'current'
    ? allWeeks[0]
    : allWeeks.find(w => w.weekStart === activeWeek) || allWeeks[0];

  return (
    <div style={screenPad}>
      <div style={screenTitle}>Analytics</div>
      <div style={{ fontSize: 12, color: C.t2, marginTop: 4, marginBottom: 20 }}>
        Weekly snapshot · {active.label}
      </div>

      {/* Week selector */}
      {allWeeks.length > 1 && (
        <div className="scroll" style={{
          display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 20,
        }}>
          {allWeeks.map(w => (
            <button
              key={w.weekStart}
              onClick={() => setActiveWeek(w.isCurrent ? 'current' : w.weekStart)}
              style={{
                padding: '6px 12px', borderRadius: 100,
                border: `0.5px solid ${active.weekStart === w.weekStart ? C.amber : C.border}`,
                background: active.weekStart === w.weekStart ? accentTint : C.s1,
                color: active.weekStart === w.weekStart ? C.amber : C.t2,
                fontSize: 11, fontFamily: 'DM Mono',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >{w.shortLabel}</button>
          ))}
        </div>
      )}

      <Headline data={active} />
      <DayBars data={active} />
      <HabitBreakdown data={active} habits={habits} />
      <SpaceBreakdown data={active} spaces={spaces} />
      <Insights data={active} />
    </div>
  );
}

// ----- Computation -----

function computeCurrentWeek({ tasks, events, habits, spaces }) {
  const week = weekISO();
  const weekStart = week[0];

  // task completions this week (by deadline matching or done in week range)
  const taskCompletions = tasks.filter(t => t.done && week.includes(t.deadline));
  const tasksDueThisWeek = tasks.filter(t => week.includes(t.deadline));
  const completionRate = tasksDueThisWeek.length
    ? Math.round((taskCompletions.length / tasksDueThisWeek.length) * 100)
    : 0;

  // habit completions
  const habitDone = habits.reduce((s, h) =>
    s + week.filter(d => h.completions.includes(d)).length, 0);
  const habitSlots = habits.length * 7;
  const habitPct = habitSlots ? Math.round((habitDone / habitSlots) * 100) : 0;

  // per-day breakdown
  const byDay = week.map((d, i) => {
    const tasksDone = tasks.filter(t => t.done && t.deadline === d).length;
    const habitsDone = habits.filter(h => h.completions.includes(d)).length;
    return {
      date: d, dayKey: weekDaysFrom()[i],
      tasksDone, habitsDone,
      total: tasksDone + habitsDone,
    };
  });

  // per-habit breakdown
  const perHabit = habits.map(h => ({
    id: h.id, name: h.name, color: h.color,
    done: week.filter(d => h.completions.includes(d)).length,
    target: countHabitTargetsInWeek(h),
  }));

  // per-space breakdown
  const perSpace = spaces.map(sp => {
    const sTasks = tasks.filter(t => t.spaceId === sp.id);
    const sHabits = habits.filter(h => h.spaceId === sp.id);
    const tDone = sTasks.filter(t => t.done && week.includes(t.deadline)).length;
    const hDone = sHabits.reduce((s, h) =>
      s + week.filter(d => h.completions.includes(d)).length, 0);
    return {
      id: sp.id, name: sp.name, color: sp.color,
      tasks: tDone, habits: hDone, total: tDone + hDone,
    };
  });

  return {
    isCurrent: true,
    weekStart,
    label: `Week of ${formatWeek(week)}`,
    shortLabel: 'This week',
    tasksCompleted: taskCompletions.length,
    tasksTotal: tasksDueThisWeek.length,
    completionRate,
    habitsCompleted: habitDone,
    habitSlots, habitPct,
    eventsCount: events.filter(e => {
      if (e.recurrence === 'none') return week.includes(e.startDatetime.slice(0, 10));
      if (e.recurrence === 'daily') return true;
      if (e.recurrence === 'weekdays') return true;
      if (e.recurrence === 'weekly') return true;
      if (e.recurrence === 'custom') return e.customDays.length > 0;
      return false;
    }).length,
    byDay,
    perHabit,
    perSpace,
  };
}

function countHabitTargetsInWeek(h) {
  if (h.frequency === 'daily') return 7;
  if (h.frequency === 'weekdays') return 5;
  if (h.frequency === '3x') return 3;
  return h.customDays.length;
}

function formatWeek(week) {
  const start = new Date(week[0] + 'T00:00:00');
  const end = new Date(week[6] + 'T00:00:00');
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

// ----- Subcomponents -----

function Headline({ data }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
      <BigStat
        label="Tasks done"
        value={data.tasksCompleted}
        sub={`of ${data.tasksTotal} · ${data.completionRate}%`}
        accent={C.amber}
      />
      <BigStat
        label="Habits"
        value={`${data.habitPct}%`}
        sub={`${data.habitsCompleted} / ${data.habitSlots}`}
        accent={C.green}
      />
    </div>
  );
}

function BigStat({ label, value, sub, accent }) {
  return (
    <div style={{ ...card, padding: 14 }}>
      <div style={{ ...sectionTitle, fontSize: 9 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 500, marginTop: 8, fontFamily: 'DM Mono', color: accent }}>
        {value}
      </div>
      <div style={{ ...monoMicro, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function DayBars({ data }) {
  const max = Math.max(1, ...data.byDay.map(d => d.total));

  return (
    <div style={{ ...card, padding: 16, marginBottom: 16 }}>
      <div style={{ ...sectionLabel, marginBottom: 16 }}>By day</div>
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', gap: 6,
        height: 120,
      }}>
        {data.byDay.map(d => {
          return (
            <div key={d.date} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 6,
              height: '100%',
            }}>
              <div style={{
                width: '100%', flex: 1,
                display: 'flex', flexDirection: 'column-reverse',
                gap: 2,
              }}>
                {d.total > 0 && (
                  <>
                    <div style={{
                      width: '100%',
                      height: `${(d.tasksDone / max) * 100}%`,
                      background: C.amber,
                      borderRadius: '4px 4px 0 0',
                      minHeight: d.tasksDone > 0 ? 4 : 0,
                    }} />
                    <div style={{
                      width: '100%',
                      height: `${(d.habitsDone / max) * 100}%`,
                      background: C.green,
                      minHeight: d.habitsDone > 0 ? 4 : 0,
                    }} />
                  </>
                )}
              </div>
              <span style={{ fontSize: 9, fontFamily: 'DM Mono', color: C.t3 }}>
                {d.dayKey[0]}
              </span>
              <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: C.t2 }}>
                {d.total}
              </span>
            </div>
          );
        })}
      </div>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 12 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.t2 }}>
        <span style={dot(C.amber, 8)} />Tasks
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.t2 }}>
        <span style={dot(C.green, 8)} />Habits
      </span>
    </div>
  );
}

function HabitBreakdown({ data }) {
  const items = [...data.perHabit].sort((a, b) => b.done - a.done).slice(0, 8);
  if (items.length === 0) return null;

  return (
    <div style={{ ...card, padding: 16, marginBottom: 16 }}>
      <div style={{ ...sectionLabel, marginBottom: 12 }}>Habits this week</div>
      {items.map(h => {
        const pct = h.target ? Math.min(100, Math.round((h.done / h.target) * 100)) : 0;
        return (
          <div key={h.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={dot(h.color, 8)} />{h.name}
              </span>
              <span style={{ ...monoMicro }}>{h.done}/{h.target || '–'}</span>
            </div>
            <div style={{ height: 4, background: C.s3, borderRadius: 100, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: h.color, transition: 'width 0.3s',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SpaceBreakdown({ data }) {
  const items = data.perSpace.filter(s => s.total > 0);
  if (items.length === 0) return null;

  const total = items.reduce((s, x) => s + x.total, 0);

  return (
    <div style={{ ...card, padding: 16, marginBottom: 16 }}>
      <div style={{ ...sectionLabel, marginBottom: 12 }}>By space</div>
      {items.map(sp => {
        const pct = Math.round((sp.total / total) * 100);
        return (
          <div key={sp.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={dot(sp.color, 8)} />{sp.name}
              </span>
              <span style={monoMicro}>{sp.tasks}t · {sp.habits}h</span>
            </div>
            <div style={{ height: 4, background: C.s3, borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: sp.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Insights({ data }) {
  const insights = [];

  // Best day
  const bestDay = [...data.byDay].sort((a, b) => b.total - a.total)[0];
  if (bestDay && bestDay.total > 0) {
    insights.push(`📈 Most productive: ${bestDay.dayKey} (${bestDay.total} done)`);
  }

  // Worst day
  const worstDay = [...data.byDay]
    .filter(d => new Date(d.date) <= new Date()) // only past days
    .sort((a, b) => a.total - b.total)[0];
  if (worstDay && bestDay && worstDay.dayKey !== bestDay.dayKey && worstDay.total === 0) {
    insights.push(`🪨 Quiet day: ${worstDay.dayKey}`);
  }

  // Top habit
  const topHabit = [...data.perHabit].sort((a, b) => b.done - a.done)[0];
  if (topHabit && topHabit.done > 0) {
    insights.push(`🔥 Top habit: ${topHabit.name} (${topHabit.done} days)`);
  }

  // Completion rate flag
  if (data.completionRate >= 80 && data.tasksTotal > 0) {
    insights.push(`✨ Strong week — ${data.completionRate}% task completion`);
  } else if (data.completionRate < 30 && data.tasksTotal >= 5) {
    insights.push(`💭 ${data.tasksTotal - data.tasksCompleted} task${data.tasksTotal - data.tasksCompleted === 1 ? '' : 's'} left`);
  }

  if (insights.length === 0) return null;

  return (
    <div style={{ ...card, padding: 16, marginBottom: 16 }}>
      <div style={{ ...sectionLabel, marginBottom: 12 }}>Insights</div>
      {insights.map((i, idx) => (
        <div key={idx} style={{
          fontSize: 13, color: C.t1, marginBottom: 8,
          paddingBottom: 8,
          borderBottom: idx < insights.length - 1 ? `0.5px solid ${C.border}` : 'none',
        }}>{i}</div>
      ))}
    </div>
  );
}
