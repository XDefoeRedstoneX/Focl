import React, { useState, useMemo } from 'react';
import { C, card, monoMicro, sectionTitle, screenTitle, dot, inp, screenPad } from '../lib/theme.js';
import { todayISO, fmtDate, fmtTime, getDayKey, isHabitDueOn, weekISO } from '../lib/helpers.js';
import { Chip, Section, Empty } from '../components/ui.jsx';
import { SwipeRow } from '../components/SwipeRow.jsx';
import { RowMenu } from '../components/RowMenu.jsx';

export function Home({
  tasks, events, habits, spaces, filter, setFilter,
  homeTab, setHomeTab, toggleTask, toggleHabitDay,
  setScreen, openEdit, quickAddTask, deleteTask, deleteEvent,
  settings,
}) {
  const today = todayISO();
  const [search, setSearch] = useState('');
  const [quick, setQuick] = useState('');

  const matches = (s) => !search.trim() || s.toLowerCase().includes(search.toLowerCase().trim());

  const filteredBySpace = filter === 'all'
    ? { t: tasks, e: events }
    : { t: tasks.filter(x => x.spaceId === filter), e: events.filter(x => x.spaceId === filter) };

  const dueToday = filteredBySpace.t.filter(t => t.deadline === today && matches(t.name));
  const upcoming = filteredBySpace.t
    .filter(t => t.deadline > today && matches(t.name))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const overdue = filteredBySpace.t
    .filter(t => !t.done && t.deadline < today && matches(t.name))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const todayEvents = filteredBySpace.e.filter(
    e => e.startDatetime.startsWith(today) && matches(e.name)
  );

  const totalToday = dueToday.length;
  const doneToday = dueToday.filter(t => t.done).length;

  const submitQuick = () => {
    const name = quick.trim();
    if (!name) return;
    quickAddTask(name, filter !== 'all' ? filter : '');
    setQuick('');
  };

  return (
    <div style={screenPad}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div>
          <div style={sectionTitle}>Today</div>
          <div style={{ ...screenTitle, marginTop: 4 }}>{fmtDate(today)}</div>
        </div>
        <div style={monoMicro}>{doneToday}/{totalToday} done</div>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search tasks, events…"
        style={{ ...inp, marginTop: 14, fontSize: 13 }}
      />

      {/* Space filter chips */}
      <div className="scroll" style={{
        display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', paddingBottom: 4,
      }}>
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
        {spaces.map(s => (
          <Chip
            key={s.id}
            active={filter === s.id}
            color={s.color}
            onClick={() => setFilter(s.id)}
          >{s.name}</Chip>
        ))}
        <button
          onClick={() => setScreen('spaces')}
          style={{
            padding: '7px 14px', borderRadius: 100,
            border: `0.5px dashed ${C.border}`, background: 'transparent',
            color: C.t3, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >+ Manage</button>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 24, marginTop: 20, borderBottom: `0.5px solid ${C.border}` }}>
        {['tasks', 'events'].map(t => (
          <button
            key={t}
            onClick={() => setHomeTab(t)}
            style={{
              background: 'none', border: 'none', padding: '0 0 10px',
              fontSize: 14, fontWeight: 500,
              color: homeTab === t ? C.t1 : C.t3,
              borderBottom: homeTab === t ? `2px solid ${C.amber}` : '2px solid transparent',
              textTransform: 'capitalize', cursor: 'pointer',
            }}
          >{t}</button>
        ))}
      </div>

      {homeTab === 'tasks' ? (
        <>
          {/* Quick add */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input
              value={quick}
              onChange={e => setQuick(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitQuick()}
              placeholder="+ Quick task…"
              style={{ ...inp, fontSize: 13 }}
            />
            {quick.trim() && (
              <button
                onClick={submitQuick}
                style={{
                  background: C.amber, color: C.bg, border: 'none',
                  padding: '0 16px', borderRadius: 12,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >Add</button>
            )}
          </div>

          {settings?.showOverdue !== false && overdue.length > 0 && (
            <Section title="Overdue" count={overdue.length}>
              {overdue.map(t => (
                <TaskRow
                  key={t.id} task={t} spaces={spaces} overdue
                  onToggle={toggleTask} onDelete={deleteTask} onEdit={openEdit}
                />
              ))}
            </Section>
          )}

          <Section title="Due today" count={dueToday.length}>
            {dueToday.length === 0
              ? <Empty>{search ? 'No matches' : 'Nothing due today'}</Empty>
              : dueToday.map(t => (
                <TaskRow
                  key={t.id} task={t} spaces={spaces}
                  onToggle={toggleTask} onDelete={deleteTask} onEdit={openEdit}
                />
              ))
            }
          </Section>

          <Section title="Upcoming" count={upcoming.length}>
            {upcoming.length === 0
              ? <Empty>{search ? 'No matches' : 'Nothing upcoming'}</Empty>
              : upcoming.slice(0, 12).map(t => (
                <TaskRow
                  key={t.id} task={t} spaces={spaces}
                  onToggle={toggleTask} onDelete={deleteTask} onEdit={openEdit}
                />
              ))
            }
          </Section>
        </>
      ) : (
        <Section title="Today's events" count={todayEvents.length}>
          {todayEvents.length === 0
            ? <Empty>{search ? 'No matches' : 'No events today'}</Empty>
            : todayEvents.map(e => {
              const isOver = new Date(e.endDatetime) < new Date();
              return (
                <SwipeRow
                  key={e.id}
                  onTap={() => openEdit(e, 'event')}
                  disabled={!isOver}
                  actions={[
                    { label: 'Edit', color: C.blue, onClick: () => openEdit(e, 'event') },
                    { label: 'Delete', color: C.red, onClick: () => deleteEvent(e.id) },
                  ]}
                >
                  <EventCard
                    ev={e}
                    spaces={spaces}
                    onEdit={() => openEdit(e, 'event')}
                    onDelete={() => deleteEvent(e.id)}
                  />
                </SwipeRow>
              );
            })
          }
        </Section>
      )}

      <HabitStrip habits={habits} spaces={spaces} toggle={toggleHabitDay} setScreen={setScreen} />

      <StatsCard tasks={tasks} habits={habits} setScreen={setScreen} />
    </div>
  );
}

const TaskRow = React.memo(function TaskRow({ task, spaces, onToggle, onDelete, onEdit, overdue }) {
  const sp = spaces.find(s => s.id === task.spaceId);
  const prioColor = { high: C.red, medium: C.amber, low: C.t3 }[task.priority];
  return (
    <SwipeRow
      onTap={() => onEdit(task, 'task')}
      disabled={!task.done}
      actions={[
        { label: 'Edit', color: C.blue, onClick: () => onEdit(task, 'task') },
        { label: 'Delete', color: C.red, onClick: () => onDelete(task.id) },
      ]}
    >
      <div style={{
        ...card,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        borderLeft: overdue ? `2px solid ${C.red}` : undefined,
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          style={{
            width: 20, height: 20, borderRadius: 6,
            border: `1.5px solid ${task.done ? C.amber : C.t3}`,
            background: task.done ? C.amber : 'transparent',
            flexShrink: 0, cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {task.done && <span style={{ color: C.bg, fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14,
            textDecoration: task.done ? 'line-through' : 'none',
            color: task.done ? C.t3 : C.t1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{task.name}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
            {sp && <><span style={dot(sp.color)} /><span style={{ fontSize: 11, color: C.t2 }}>{sp.name}</span></>}
            <span style={{
              fontSize: 10, fontFamily: 'DM Mono',
              color: prioColor, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>{task.priority}</span>
            {task.recurrence && task.recurrence !== 'none' && (
              <span style={{ fontSize: 11, color: C.t3 }}>↻</span>
            )}
          </div>
        </div>
        <RowMenu actions={[
          { label: 'Edit', onClick: () => onEdit(task, 'task') },
          { label: 'Delete', color: C.red, onClick: () => onDelete(task.id) },
        ]} />
      </div>
    </SwipeRow>
  );
});

const EventCard = React.memo(function EventCard({ ev, spaces, onEdit, onDelete }) {
  const sp = spaces.find(s => s.id === ev.spaceId);
  const color = sp?.color || C.amber;
  const start = ev.startDatetime.split('T')[1];
  const end = ev.endDatetime.split('T')[1];
  const recurLabel = {
    none: 'One-time', daily: 'Every day', weekdays: 'Weekdays',
    weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month',
    custom: `Every ${ev.customDays.join(' / ')}`,
  }[ev.recurrence];

  return (
    <div style={{
      ...card,
      padding: '14px 14px 14px 16px',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{ev.name}</div>
          <div style={{ ...monoMicro, marginTop: 4 }}>{fmtTime(start)} – {fmtTime(end)}</div>
        </div>
        {onEdit && onDelete && (
          <RowMenu actions={[
            { label: 'Edit', onClick: onEdit },
            { label: 'Delete', color: C.red, onClick: onDelete },
          ]} />
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {sp && (
          <span style={{ fontSize: 11, color: C.t2, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={dot(color)} />{sp.name}
          </span>
        )}
        <span style={{ fontSize: 11, color: C.t3 }}>•</span>
        <span style={{ fontSize: 11, color: C.t2 }}>{recurLabel}</span>
        {ev.notifications.length > 0 && (
          <>
            <span style={{ fontSize: 11, color: C.t3 }}>•</span>
            <span style={{ fontSize: 11, color: C.t2 }}>🔔 {ev.notifications[0].timing}</span>
          </>
        )}
      </div>
    </div>
  );
});

function HabitStrip({ habits, spaces, toggle, setScreen }) {
  const today = todayISO();
  const dKey = getDayKey(new Date());
  const todayHabits = habits.filter(h => isHabitDueOn(h, today));
  const doneCount = todayHabits.filter(h => h.completions.includes(today)).length;
  const pct = todayHabits.length ? Math.round((doneCount / todayHabits.length) * 100) : 0;

  return (
    <div style={{ ...card, marginTop: 24, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={sectionTitle}>Habits today</div>
        <button
          onClick={() => setScreen('habits')}
          style={{ background: 'none', border: 'none', color: C.amber, fontSize: 12, cursor: 'pointer', padding: 0 }}
        >View all →</button>
      </div>

      {todayHabits.length === 0 ? (
        <div style={{ fontSize: 12, color: C.t3, padding: '8px 0' }}>No habits scheduled today</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {todayHabits.map(h => {
              const done = h.completions.includes(today);
              return (
                <button
                  key={h.id}
                  onClick={() => toggle(h.id, today)}
                  style={{
                    padding: '5px 10px', borderRadius: 100,
                    border: `0.5px solid ${done ? h.color : C.border}`,
                    background: done ? `${h.color}22` : C.s2,
                    color: done ? h.color : C.t2,
                    fontSize: 11, cursor: 'pointer',
                  }}
                >{done ? '✓ ' : ''}{h.name}</button>
              );
            })}
          </div>
          <div style={{ height: 4, background: C.s3, borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: C.amber, transition: 'width 0.3s' }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 8,
            fontSize: 10, fontFamily: 'DM Mono', color: C.t3,
          }}>
            <span>{doneCount} of {todayHabits.length}</span><span>{pct}%</span>
          </div>
        </>
      )}
    </div>
  );
}

function StatsCard({ tasks, habits, setScreen }) {
  const week = weekISO();
  const doneThisWeek = tasks.filter(t => t.done && week.includes(t.deadline)).length;
  const slots = habits.length * 7;
  const filled = habits.reduce((a, h) => a + week.filter(d => h.completions.includes(d)).length, 0);
  const pct = slots ? Math.round((filled / slots) * 100) : 0;

  return (
    <button
      onClick={() => setScreen('analytics')}
      style={{
        ...card, width: '100%', marginTop: 12, padding: 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        cursor: 'pointer', color: C.t1, textAlign: 'left',
      }}
    >
      <span style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
        <span style={sectionTitle}>This week</span>
        <span style={{ fontSize: 13, fontFamily: 'DM Mono' }}>{doneThisWeek} <span style={{ color: C.t3, fontSize: 11 }}>tasks</span></span>
        <span style={{ fontSize: 13, fontFamily: 'DM Mono' }}>{pct}% <span style={{ color: C.t3, fontSize: 11 }}>habits</span></span>
      </span>
      <span style={{ color: C.amber, fontSize: 12 }}>Stats →</span>
    </button>
  );
}
