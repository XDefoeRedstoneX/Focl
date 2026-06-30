import { useState } from 'react';
import { C, card, monoMicro, sectionTitle, dot, inp } from '../lib/theme.js';
import { todayISO, fmtTime, isHabitDueOn, eventOccursOn, classOccursOn, isPlanningWindow } from '../lib/helpers.js';

const RING_CIRCUMFERENCE = 2 * Math.PI * 52; // r = 52

export function Home({
  tasks, events, habits, spaces, settings, classes = [],
  toggleTask, toggleHabitDay, deleteTask, openEdit,
  quickAddTask, setScreen, onPlanTomorrow,
  dayPlans = [], onOpenTodayPlan, toggleBlock,
}) {
  const today = todayISO();
  const [quick, setQuick] = useState('');

  const todaysPlan = dayPlans.find(p => p.date === today);
  const planBlocks = (todaysPlan?.blocks || []).slice().sort((a, b) => a.start.localeCompare(b.start));

  const planningOpen = settings?.dayPlannerEnabled !== false
    && !!settings?.planningWindow
    && isPlanningWindow(new Date(), settings.planningWindow);

  // Today's tasks + due habits drive the momentum ring.
  const dueToday = tasks
    .filter(t => t.deadline === today)
    .sort((a, b) => Number(a.done) - Number(b.done));
  const overdue = tasks
    .filter(t => !t.done && t.deadline < today)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const habitsToday = habits.filter(h => isHabitDueOn(h, today));

  const tasksDone = dueToday.filter(t => t.done).length;
  const habitsDone = habitsToday.filter(h => h.completions.includes(today)).length;
  const total = dueToday.length + habitsToday.length;
  const done = tasksDone + habitsDone;
  const remaining = total - done;
  const pct = total ? Math.round((done / total) * 100) : 100;
  const ringOffset = RING_CIRCUMFERENCE * (1 - pct / 100);

  const bestStreak = Math.max(0, ...habits.map(h => h.streakBest || 0));

  const upNext = nextUpItem(events, classes, today);

  const submitQuick = () => {
    const name = quick.trim();
    if (!name) return;
    quickAddTask(name, '');
    setQuick('');
  };

  return (
    <div style={{ padding: '8px 20px 8px' }}>
      {/* Momentum hero */}
      <div style={{
        background: 'linear-gradient(150deg, #16262B 0%, #111d21 100%)',
        border: `0.5px solid ${C.border}`, borderRadius: 22, padding: 20,
        display: 'flex', alignItems: 'center', gap: 20,
        boxShadow: '0 8px 28px rgba(0,0,0,0.28)',
      }}>
        <div style={{ position: 'relative', width: 124, height: 124, flexShrink: 0 }}>
          <svg width="124" height="124" viewBox="0 0 124 124">
            <circle cx="62" cy="62" r="52" fill="none" stroke={C.s3} strokeWidth="11" />
            <circle
              cx="62" cy="62" r="52" fill="none" stroke={C.amber} strokeWidth="11"
              strokeLinecap="round" strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              style={{
                transition: 'stroke-dashoffset .65s cubic-bezier(.34,1.2,.4,1)',
                transform: 'rotate(-90deg)', transformOrigin: '62px 62px',
              }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 600, fontFamily: 'DM Mono', lineHeight: 1, letterSpacing: -1 }}>
              {pct}<span style={{ fontSize: 14, color: C.t2 }}>%</span>
            </div>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: C.t3, marginTop: 4, letterSpacing: 0.5 }}>
              {done} / {total}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>
            {remaining > 0 ? `${remaining} to go today` : 'All done — nice.'}
          </div>
          <div style={{ fontSize: 12.5, color: C.t2, marginTop: 3, lineHeight: 1.35 }}>
            {total === 0 ? 'Nothing scheduled yet.' : `${done} done · ${dueToday.length} tasks, ${habitsToday.length} habits`}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
            padding: '5px 11px 5px 9px', borderRadius: 100,
            background: 'rgba(198,165,46,0.14)', border: `0.5px solid rgba(198,165,46,0.4)`,
          }}>
            <span style={{ fontSize: 13 }}>🔥</span>
            <span style={{ fontSize: 12, fontFamily: 'DM Mono', color: C.bookmark, fontWeight: 500 }}>
              {bestStreak} day streak
            </span>
          </div>
        </div>
      </div>

      {/* Today's plan: the locked timeline, as a checkable list */}
      {planBlocks.length > 0 && (
        <TodayPlanCard
          blocks={planBlocks} spaces={spaces}
          onToggle={(id) => toggleBlock?.(today, id)}
          onOpen={onOpenTodayPlan}
        />
      )}

      {/* Planning-window CTA: only appears during the nightly window */}
      {planningOpen && onPlanTomorrow && (
        <button
          onClick={onPlanTomorrow}
          style={{
            width: '100%', textAlign: 'left', cursor: 'pointer', marginTop: 14,
            display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px',
            borderRadius: 18, background: 'rgba(92,198,207,0.10)',
            border: `0.5px solid ${C.amber}66`, borderLeft: `3px solid ${C.amber}`,
          }}
        >
          <span style={{ fontSize: 20 }}>🌙</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: C.amber, textTransform: 'uppercase', letterSpacing: 1 }}>Planning time</div>
            <div style={{ fontSize: 14.5, fontWeight: 500, marginTop: 3 }}>Build tomorrow</div>
          </div>
          <span style={{ color: C.amber, fontSize: 18 }}>→</span>
        </button>
      )}

      {/* Up next */}
      {upNext && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 13, marginTop: 14,
          padding: '14px 16px', borderRadius: 18, background: C.s1,
          border: `0.5px solid ${C.border}`,
          borderLeft: `3px solid ${spaces.find(s => s.id === upNext.spaceId)?.color || C.amber}`,
        }}>
          <div style={{ textAlign: 'center', minWidth: 46 }}>
            <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'DM Mono', letterSpacing: -0.3 }}>{upNext.timeLabel}</div>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: C.t3, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{upNext.ampm}</div>
          </div>
          <div style={{ width: 0.5, alignSelf: 'stretch', background: C.border }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: C.t3, textTransform: 'uppercase', letterSpacing: 1 }}>Up next · {upNext.inLabel}</div>
            <div style={{ fontSize: 14.5, fontWeight: 500, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{upNext.name}</div>
          </div>
        </div>
      )}

      {/* Quick add */}
      <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
        <input
          value={quick}
          onChange={e => setQuick(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitQuick()}
          placeholder="+  Add a task for today…"
          style={{ ...inp, fontSize: 13.5, borderRadius: 13 }}
        />
        {quick.trim() && (
          <button
            onClick={submitQuick}
            style={{ padding: '0 17px', borderRadius: 13, border: 'none', background: C.amber, color: C.bg, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
          >Add</button>
        )}
      </div>

      {/* Overdue */}
      {settings?.showOverdue !== false && overdue.length > 0 && (
        <>
          <SectionHead label="Overdue" labelColor={C.red} right={overdue.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {overdue.map(t => (
              <TaskRow key={t.id} task={t} spaces={spaces} overdue
                onToggle={toggleTask} onDelete={deleteTask} onEdit={openEdit} />
            ))}
          </div>
        </>
      )}

      {/* Due today */}
      <SectionHead label="Due today" right={`${tasksDone} / ${dueToday.length} done`} />
      {dueToday.length === 0 ? (
        <div style={{
          padding: '22px 0', textAlign: 'center', color: C.t3, fontSize: 13,
          border: `0.5px dashed ${C.border}`, borderRadius: 14,
        }}>All clear for today ✦</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dueToday.map(t => (
            <TaskRow key={t.id} task={t} spaces={spaces}
              onToggle={toggleTask} onDelete={deleteTask} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* Habit strip */}
      <HabitStrip habits={habitsToday} today={today} done={habitsDone} toggle={toggleHabitDay} setScreen={setScreen} />
    </div>
  );
}

function TodayPlanCard({ blocks, spaces, onToggle, onOpen }) {
  const done = blocks.filter(b => b.done).length;
  const spaceColor = (id) => spaces.find(s => s.id === id)?.color || C.blue;
  return (
    <div style={{ ...card, marginTop: 14, padding: 16, borderRadius: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={sectionTitle}>Today's plan</div>
        <button
          onClick={onOpen}
          style={{ background: 'none', border: 'none', color: C.amber, fontSize: 12, cursor: 'pointer', padding: 0 }}
        >{done} of {blocks.length} →</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {blocks.map(b => {
          const col = spaceColor(b.spaceId);
          return (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <button
                onClick={() => onToggle(b.id)}
                aria-label={b.done ? 'Mark not done' : 'Mark done'}
                style={{
                  width: 20, height: 20, flexShrink: 0, borderRadius: 6, padding: 0, cursor: 'pointer',
                  border: `1.5px solid ${b.done ? col : C.t3}`, background: b.done ? col : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{b.done && <span style={{ color: C.bg, fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}</button>
              <span style={{ width: 58, flexShrink: 0, fontSize: 11, fontFamily: 'DM Mono', color: C.t3 }}>{fmtTime(b.start)}</span>
              <span style={{
                flex: 1, minWidth: 0, fontSize: 13.5,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                textDecoration: b.done ? 'line-through' : 'none', color: b.done ? C.t3 : C.t1,
              }}>{b.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHead({ label, labelColor = C.t3, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 2px 10px' }}>
      <div style={{ ...sectionTitle, color: labelColor }}>{label}</div>
      <div style={monoMicro}>{right}</div>
    </div>
  );
}

function TaskRow({ task, spaces, overdue, onToggle, onDelete, onEdit }) {
  const sp = spaces.find(s => s.id === task.spaceId);
  const prioColor = { high: C.red, medium: C.amber, low: C.t3 }[task.priority] || C.t3;
  return (
    <div
      onClick={() => onEdit(task, 'task')}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px',
        background: C.s1, border: `0.5px solid ${C.border}`, borderRadius: 14,
        borderLeft: overdue ? `2px solid ${C.red}` : undefined, cursor: 'pointer',
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
        aria-label={task.done ? 'Mark not done' : 'Mark done'}
        style={{
          width: 22, height: 22, borderRadius: 7, flexShrink: 0, padding: 0, cursor: 'pointer',
          border: `1.5px solid ${task.done ? C.amber : C.t3}`,
          background: task.done ? C.amber : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}
      >
        {task.done && <span style={{ color: C.bg, fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14.5, fontWeight: 500,
          textDecoration: task.done ? 'line-through' : 'none',
          color: task.done ? C.t3 : C.t1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{task.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {sp && <><span style={dot(sp.color)} /><span style={{ fontSize: 11, color: C.t2 }}>{sp.name}</span></>}
          <span style={{
            fontSize: 9.5, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: 0.5,
            color: overdue ? C.red : prioColor,
          }}>{overdue ? overdueLabel(task.deadline) : task.priority}</span>
          {task.recurrence && task.recurrence !== 'none' && (
            <span style={{ fontSize: 11, color: C.t3 }}>↻</span>
          )}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
        aria-label="Delete"
        style={{ background: 'none', border: 'none', color: C.t3, fontSize: 17, cursor: 'pointer', padding: 4 }}
      >×</button>
    </div>
  );
}

function HabitStrip({ habits, today, done, toggle, setScreen }) {
  const pct = habits.length ? Math.round((done / habits.length) * 100) : 0;
  return (
    <div style={{ ...card, marginTop: 22, padding: 16, borderRadius: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={sectionTitle}>Habits today</div>
        <button
          onClick={() => setScreen('habits')}
          style={{ background: 'none', border: 'none', color: C.amber, fontSize: 12, cursor: 'pointer', padding: 0 }}
        >{done} of {habits.length} →</button>
      </div>
      {habits.length === 0 ? (
        <div style={{ fontSize: 12, color: C.t3, padding: '4px 0' }}>No habits scheduled today</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {habits.map(h => {
              const isDone = h.completions.includes(today);
              return (
                <button
                  key={h.id}
                  onClick={() => toggle(h.id, today)}
                  style={{
                    padding: '5px 10px', borderRadius: 100,
                    border: `0.5px solid ${isDone ? h.color : C.border}`,
                    background: isDone ? `${h.color}22` : C.s2,
                    color: isDone ? h.color : C.t2, fontSize: 11, cursor: 'pointer',
                  }}
                >{isDone ? '✓ ' : ''}{h.name}</button>
              );
            })}
          </div>
          <div style={{ height: 6, background: C.s3, borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: C.amber, transition: 'width .5s cubic-bezier(.34,1.2,.4,1)' }} />
          </div>
        </>
      )}
    </div>
  );
}

function overdueLabel(deadline) {
  const days = Math.round((new Date(todayISO() + 'T00:00:00') - new Date(deadline + 'T00:00:00')) / 86400000);
  if (days === 1) return 'Yesterday';
  return `${days}d overdue`;
}

// Next event or class occurring today whose start time is still ahead of now.
function nextUpItem(events, classes, today) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const candidates = [];
  for (const e of events) {
    if (!eventOccursOn(e, today)) continue;
    const time = e.startDatetime.slice(11, 16);
    const [h, m] = time.split(':').map(Number);
    candidates.push({ name: e.name, spaceId: e.spaceId, mins: h * 60 + m, time });
  }
  for (const c of classes) {
    if (!classOccursOn(c, today) || !c.start) continue;
    const [h, m] = c.start.split(':').map(Number);
    candidates.push({ name: c.name, spaceId: c.spaceId, mins: h * 60 + m, time: c.start });
  }
  const upcoming = candidates.filter(x => x.mins >= nowMin).sort((a, b) => a.mins - b.mins);
  if (!upcoming.length) return null;

  const { name, spaceId, mins, time } = upcoming[0];
  const delta = mins - nowMin;
  const inLabel = delta < 60 ? `in ${delta} min` : delta < 1440 ? `in ${Math.round(delta / 60)} h` : 'today';
  const [clock, ampm] = fmtTime(time).split(' '); // "9:30 AM"
  return { name, spaceId, timeLabel: clock, ampm, inLabel };
}
