import { useState, useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { C, fonts } from './lib/theme.js';
import { todayISO, newId, computeStreak, weekISO, weekDaysFrom, setWeekStart, nextOccurrence } from './lib/helpers.js';
import { loadState, saveStateField } from './lib/storage.js';
import { DEFAULTS } from './lib/seed.js';
import { scheduleItem, cancelItem } from './lib/notifications.js';
import { setHapticsEnabled, tapLight, tapMedium } from './lib/haptics.js';

import { BottomNav } from './components/BottomNav.jsx';
import { Toast } from './components/ui.jsx';
import { Home } from './screens/Home.jsx';
import { Habits } from './screens/Habits.jsx';
import { AddEdit } from './screens/AddEdit.jsx';
import { Notif } from './screens/Notif.jsx';
import { Spaces } from './screens/Spaces.jsx';
import { Settings } from './screens/Settings.jsx';
import { Analytics } from './screens/Analytics.jsx';
import { Workout } from './screens/Workout.jsx';

const DEFAULT_SETTINGS = {
  autoDeleteCompletedDays: 7,
  weekStartsOn: 'monday',
  showOverdue: true,
  hapticFeedback: true,
  lastArchivedWeek: null, // YYYY-MM-DD of the week-start of the last archived week
  lastCleanupDate: null,  // YYYY-MM-DD when cleanup last ran
  lastRollDate: null,     // YYYY-MM-DD when recurring tasks last rolled forward
};

const blankDraft = (type = 'task') => ({
  id: null,
  type,
  name: '',
  notes: '',
  spaceId: '',
  priority: 'medium',
  deadline: todayISO(),
  date: todayISO(),
  startTime: '09:00',
  endTime: '10:00',
  recurrence: 'none',
  customDays: [],
  frequency: 'daily',
  goalDays: 30,
  color: C.green,
  notifications: [],
  notifEnabled: false,
  notifTiming: '10min',
  notifTime: '09:00',
  alsoDay: false,
  alsoWeek: false,
});

// Reverse-load a stored item back into a draft for editing
function itemToDraft(item, type) {
  const base = blankDraft(type);
  if (type === 'task') {
    const n = item.notifications?.[0];
    return {
      ...base, id: item.id, type, name: item.name, notes: item.notes,
      spaceId: item.spaceId, priority: item.priority, deadline: item.deadline,
      recurrence: item.recurrence || 'none',
      customDays: item.customDays || [],
      notifEnabled: !!n, notifTiming: n?.timing || base.notifTiming, notifTime: n?.time || base.notifTime,
    };
  }
  if (type === 'event') {
    const n = item.notifications?.[0];
    const [date, startTime] = item.startDatetime.split('T');
    const [, endTime] = item.endDatetime.split('T');
    return {
      ...base, id: item.id, type, name: item.name, notes: item.notes,
      spaceId: item.spaceId, date, startTime, endTime,
      recurrence: item.recurrence, customDays: item.customDays || [],
      notifEnabled: !!n, notifTiming: n?.timing || base.notifTiming, notifTime: n?.time || base.notifTime,
    };
  }
  // habit
  return {
    ...base, id: item.id, type, name: item.name, notes: '',
    spaceId: item.spaceId, frequency: item.frequency,
    customDays: item.customDays || [],
    color: item.color, goalDays: item.goalDays,
  };
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState('home');
  const screenRef = useRef(screen);
  useEffect(() => { screenRef.current = screen; }, [screen]);
  const [spaces, setSpaces] = useState(DEFAULTS.spaces);
  const [tasks, setTasks] = useState(DEFAULTS.tasks);
  const [events, setEvents] = useState(DEFAULTS.events);
  const [habits, setHabits] = useState(DEFAULTS.habits);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [archive, setArchive] = useState([]);
  const [kits, setKits] = useState(DEFAULTS.kits);
  const [plan, setPlan] = useState(DEFAULTS.plan);
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [homeTab, setHomeTab] = useState('tasks');
  const [draft, setDraft] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState(null);

  // Initial load
  useEffect(() => {
    (async () => {
      const s = await loadState(DEFAULTS);
      setSpaces(s.spaces);
      setTasks(s.tasks);
      setEvents(s.events);
      setHabits(s.habits);
      setSettings({ ...DEFAULT_SETTINGS, ...(s.settings || {}) });
      setArchive(s.archive || []);
      setKits(s.kits || []);
      setPlan(s.plan || {});
      setSessions(s.sessions || []);
      setLoaded(true);
    })();
  }, []);

  // Persist on change (debounced trivially via per-key save)
  useEffect(() => { if (loaded) saveStateField('spaces', spaces); }, [spaces, loaded]);
  useEffect(() => { if (loaded) saveStateField('tasks', tasks); }, [tasks, loaded]);
  useEffect(() => { if (loaded) saveStateField('events', events); }, [events, loaded]);
  useEffect(() => { if (loaded) saveStateField('habits', habits); }, [habits, loaded]);
  useEffect(() => { if (loaded) saveStateField('settings', settings); }, [settings, loaded]);
  useEffect(() => { if (loaded) saveStateField('archive', archive); }, [archive, loaded]);
  useEffect(() => { if (loaded) saveStateField('kits', kits); }, [kits, loaded]);
  useEffect(() => { if (loaded) saveStateField('plan', plan); }, [plan, loaded]);
  useEffect(() => { if (loaded) saveStateField('sessions', sessions); }, [sessions, loaded]);

  // Mirror user settings into the helper modules. Declared before the
  // daily-maintenance effect below so week-start is applied before
  // weekISO() is used for archiving.
  useEffect(() => { setWeekStart(settings.weekStartsOn); }, [settings.weekStartsOn]);
  useEffect(() => { setHapticsEnabled(settings.hapticFeedback); }, [settings.hapticFeedback]);

  // Hardware back button: navigate within app instead of exiting.
  // Registered ONCE; reads current screen from a ref to avoid stale closures.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle;
    let lastBackPress = 0;

    // Set the status bar to match the dark theme
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#0C1416' }).catch(() => {});

    (async () => {
      try {
        handle = await CapApp.addListener('backButton', () => {
          const s = screenRef.current;

          if (s === 'notif') { setScreen('add'); return; }
          if (s === 'add') { setScreen('home'); return; }
          if (s === 'spaces') { setScreen('settings'); return; }
          if (s !== 'home') { setScreen('home'); return; }

          // On home: double-press to exit
          const now = Date.now();
          if (now - lastBackPress < 2000) {
            CapApp.exitApp();
          } else {
            lastBackPress = now;
            setToast({ message: 'Press back again to exit' });
          }
        });
      } catch (e) {
        console.error('Back button registration failed:', e);
      }
    })();

    return () => {
      if (handle && handle.remove) handle.remove();
    };
  }, []);

  // Run cleanup + weekly archive once when loaded (and once per day).
  // These state writes are one-shot daily maintenance, not render-coupled
  // sync — TODO: fold them into the load path during the reducer refactor.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!loaded) return;
    const today = todayISO();

    // 1. Auto-cleanup completed items
    // 0. Roll recurring tasks forward. Runs at the day boundary so a task
    //    you checked off stays visibly done all day, then becomes the next
    //    occurrence (unchecked) the following morning. Missed recurring
    //    tasks also advance instead of piling up as overdue.
    if (settings.lastRollDate !== today) {
      setTasks(ts => ts.map(t => {
        if (!t.recurrence || t.recurrence === 'none') return t;
        if (t.deadline >= today) return t; // due today/future — leave alone
        // advance deadline until it lands on today or later
        let next = t.deadline;
        for (let i = 0; i < 62 && next < today; i++) {
          const n = nextOccurrence(t.recurrence, t.customDays, next);
          if (!n) break;
          next = n;
        }
        if (next === t.deadline) return t;
        const rolled = { ...t, deadline: next, done: false };
        // reschedule its notification for the new date
        cancelItem(t.id)
          .then(() => scheduleItem(rolled, 'task'))
          .catch(() => {});
        return rolled;
      }));
      setSettings(s => ({ ...s, lastRollDate: today }));
    }

    // 1. Auto-cleanup completed items (never touches recurring tasks/events)
    if (settings.autoDeleteCompletedDays > 0 && settings.lastCleanupDate !== today) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - settings.autoDeleteCompletedDays);
      const cutoffISO = cutoff.toISOString().slice(0, 10);

      // Tasks: completed, non-recurring & deadline before cutoff
      setTasks(ts => ts.filter(t =>
        !(t.done && t.deadline < cutoffISO && (!t.recurrence || t.recurrence === 'none'))
      ));
      // Events: non-recurring & before cutoff
      setEvents(es => es.filter(e =>
        !(e.recurrence === 'none' && e.startDatetime.slice(0, 10) < cutoffISO)
      ));

      setSettings(s => ({ ...s, lastCleanupDate: today }));
    }

    // 2. Weekly archive: archive last week if not already
    const thisMonday = weekISO()[0];
    if (settings.lastArchivedWeek !== thisMonday) {
      // Archive the *previous* week (so it goes into archive after Monday rolls over)
      const prevWeekStart = new Date(thisMonday + 'T00:00:00');
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevMonday = prevWeekStart.toISOString().slice(0, 10);

      // Only archive if we actually have data and prev week is in past
      const alreadyArchived = archive.some(a => a.weekStart === prevMonday);
      if (!alreadyArchived && settings.lastArchivedWeek !== null) {
        // Build a snapshot of stats for that prev week
        const snapshot = buildWeekSnapshot(prevMonday, tasks, events, habits, spaces);
        setArchive(a => [snapshot, ...a].slice(0, 52)); // keep up to 1 year
      }

      setSettings(s => ({ ...s, lastArchivedWeek: thisMonday }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => {
      setToast(null);
      if (toast.thenGoHome) setScreen('home');
    }, 1200);
    return () => clearTimeout(t);
  }, [toast]);

  // === Mutations ===

  const toggleTask = (id) => {
    tapLight();
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id) => {
    cancelItem(id).catch(() => {});
    setTasks(ts => ts.filter(t => t.id !== id));
  };

  const deleteEvent = (id) => {
    cancelItem(id).catch(() => {});
    setEvents(es => es.filter(e => e.id !== id));
  };

  const deleteHabit = (id) => setHabits(hs => hs.filter(h => h.id !== id));

  const toggleHabitDay = (hid, dateISO) => {
    tapLight();
    setHabits(hs => hs.map(h => {
      if (h.id !== hid) return h;
      const has = h.completions.includes(dateISO);
      const completions = has
        ? h.completions.filter(d => d !== dateISO)
        : [...h.completions, dateISO];
      const streakCurrent = computeStreak(completions, h.frequency, h.customDays);
      const streakBest = Math.max(h.streakBest, streakCurrent);
      return { ...h, completions, streakCurrent, streakBest };
    }));
  };

  const quickAddTask = (name, spaceId) => {
    tapMedium();
    const t = {
      id: newId(), name, notes: '', spaceId, priority: 'medium',
      deadline: todayISO(), done: false,
      recurrence: 'none', customDays: [],
      notifications: [],
      createdAt: new Date().toISOString(),
    };
    setTasks(ts => [...ts, t]);
    setToast({ message: 'Added!' });
  };

  const openAdd = (type = 'task') => {
    tapMedium();
    setDraft(blankDraft(type));
    setEditMode(false);
    setScreen('add');
  };

  const openEdit = (item, type) => {
    setDraft(itemToDraft(item, type));
    setEditMode(true);
    setScreen('add');
  };

  const buildNotifs = (d) =>
    d.notifEnabled ? [{ timing: d.notifTiming, time: d.notifTime }] : [];

  const saveDraft = () => {
    if (!draft.name.trim()) return;
    const notifs = buildNotifs(draft);

    if (draft.type === 'task') {
      if (editMode && draft.id) {
        const next = { ...draft, notifications: notifs, done: false };
        setTasks(ts => ts.map(t => t.id === draft.id
          ? { ...t, name: draft.name, notes: draft.notes, spaceId: draft.spaceId,
              priority: draft.priority, deadline: draft.deadline,
              recurrence: draft.recurrence, customDays: draft.customDays,
              notifications: notifs }
          : t));
        cancelItem(draft.id).then(() => scheduleItem(next, 'task')).catch(() => {});
      } else {
        const t = {
          id: newId(), name: draft.name, notes: draft.notes, spaceId: draft.spaceId,
          priority: draft.priority, deadline: draft.deadline, done: false,
          recurrence: draft.recurrence || 'none',
          customDays: draft.customDays || [],
          notifications: notifs, createdAt: new Date().toISOString(),
        };
        setTasks(ts => [...ts, t]);
        scheduleItem(t, 'task').catch(() => {});
      }
    } else if (draft.type === 'event') {
      const startDatetime = `${draft.date}T${draft.startTime}`;
      const endDatetime = `${draft.date}T${draft.endTime}`;
      if (editMode && draft.id) {
        setEvents(es => es.map(e => e.id === draft.id
          ? { ...e, name: draft.name, notes: draft.notes, spaceId: draft.spaceId,
              startDatetime, endDatetime, recurrence: draft.recurrence,
              customDays: draft.customDays, notifications: notifs }
          : e));
        cancelItem(draft.id)
          .then(() => scheduleItem({ id: draft.id, name: draft.name, notes: draft.notes, startDatetime, notifications: notifs }, 'event'))
          .catch(() => {});
      } else {
        const e = {
          id: newId(), name: draft.name, notes: draft.notes, spaceId: draft.spaceId,
          startDatetime, endDatetime, recurrence: draft.recurrence,
          customDays: draft.customDays, notifications: notifs,
          createdAt: new Date().toISOString(),
        };
        setEvents(es => [...es, e]);
        scheduleItem(e, 'event').catch(() => {});
      }
    } else { // habit
      if (editMode && draft.id) {
        setHabits(hs => hs.map(h => h.id === draft.id
          ? { ...h, name: draft.name, spaceId: draft.spaceId,
              frequency: draft.frequency, customDays: draft.customDays,
              color: draft.color, goalDays: +draft.goalDays || 30 }
          : h));
      } else {
        const h = {
          id: newId(), name: draft.name, spaceId: draft.spaceId,
          color: draft.color, frequency: draft.frequency,
          customDays: draft.customDays,
          streakCurrent: 0, streakBest: 0,
          goalDays: +draft.goalDays || 30, completions: [],
          createdAt: new Date().toISOString(),
        };
        setHabits(hs => [...hs, h]);
      }
    }

    tapMedium();
    setToast({ message: editMode ? 'Updated!' : 'Saved!', thenGoHome: true });
  };

  const deleteCurrent = () => {
    if (!draft?.id) return;
    if (draft.type === 'task') deleteTask(draft.id);
    else if (draft.type === 'event') deleteEvent(draft.id);
    else if (draft.type === 'habit') deleteHabit(draft.id);
    setScreen('home');
  };

  // === Workout handlers ===

  const saveKit = (kit) => {
    tapMedium();
    setKits(ks => ks.some(k => k.id === kit.id)
      ? ks.map(k => k.id === kit.id ? kit : k)
      : [...ks, kit]);
  };

  const deleteKit = (id) => {
    setKits(ks => ks.filter(k => k.id !== id));
    // clear any plan days pointing at it
    setPlan(pl => {
      const next = { ...pl };
      for (const k of Object.keys(next)) if (next[k] === id) next[k] = null;
      return next;
    });
  };

  const updatePlan = (partial) => setPlan(pl => ({ ...pl, ...partial }));

  const upsertSession = (sess) => {
    setSessions(ss => {
      const existing = ss.find(s => s.date === sess.date);
      const merged = existing
        ? { ...existing, ...sess }
        : { id: newId(), ...sess };
      const next = existing
        ? ss.map(s => s.date === sess.date ? merged : s)
        : [...ss, merged];

      // completion detection: all sets of all exercises in the kit done
      const kit = kits.find(k => k.id === merged.kitId);
      if (kit && kit.exercises.length) {
        const total = kit.exercises.reduce((a, e) => a + e.sets, 0);
        const done = kit.exercises.reduce((a, e) => a + Math.min(merged.ex?.[e.id]?.done || 0, e.sets), 0);
        const wasComplete = existing && kit.exercises.reduce((a, e) => a + Math.min(existing.ex?.[e.id]?.done || 0, e.sets), 0) >= total;
        if (done >= total && !wasComplete) {
          tapMedium();
          // auto-check linked habit for the day (only if not already checked)
          if (plan.linkedHabitId) {
            const h = habits.find(x => x.id === plan.linkedHabitId);
            if (h && !h.completions.includes(sess.date)) toggleHabitDay(h.id, sess.date);
          }
        } else {
          tapLight();
        }
      }
      return next;
    });
  };

  // Settings & data actions
  const updateSettings = (partial) => setSettings(s => ({ ...s, ...partial }));

  const importState = (payload) => {
    if (payload.spaces) setSpaces(payload.spaces);
    if (payload.tasks) setTasks(payload.tasks);
    if (payload.events) setEvents(payload.events);
    if (payload.habits) setHabits(payload.habits);
    if (payload.kits) setKits(payload.kits);
    if (payload.plan) setPlan(payload.plan);
    if (payload.sessions) setSessions(payload.sessions);
    setToast({ message: 'Imported!' });
  };
  const resetAll = () => {
    setSpaces(DEFAULTS.spaces);
    setTasks(DEFAULTS.tasks);
    setEvents(DEFAULTS.events);
    setHabits(DEFAULTS.habits);
    setArchive([]);
    setKits(DEFAULTS.kits);
    setPlan(DEFAULTS.plan);
    setSessions([]);
    setSettings(DEFAULT_SETTINGS);
    setToast({ message: 'Reset complete' });
  };

  const stats = useMemo(() => ({
    tasks: tasks.length,
    tasksDone: tasks.filter(t => t.done).length,
    events: events.length,
    recurringEvents: events.filter(e => e.recurrence !== 'none').length,
    habits: habits.length,
    completionsAll: habits.reduce((s, h) => s + h.completions.length, 0),
    bestStreak: Math.max(0, ...habits.map(h => h.streakBest || 0)),
  }), [tasks, events, habits]);

  return (
    <>
      <style>{fonts}</style>
      <div style={{
        minHeight: '100dvh', height: '100dvh',
        display: 'flex', alignItems: 'stretch', justifyContent: 'center',
        background: C.bg,
      }}>
        <div style={{
          width: '100%',
          background: C.bg, overflow: 'hidden', position: 'relative',
          color: C.t1, display: 'flex', flexDirection: 'column',
        }}>
          <div className="scroll" style={{
            flex: 1, overflowY: 'auto',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 80,
          }}>
            <div key={screen} className="fade-in">
            {screen === 'home' && (
              <Home
                tasks={tasks} events={events} habits={habits} spaces={spaces}
                filter={filter} setFilter={setFilter}
                homeTab={homeTab} setHomeTab={setHomeTab}
                toggleTask={toggleTask} toggleHabitDay={toggleHabitDay}
                setScreen={setScreen} openEdit={openEdit}
                quickAddTask={quickAddTask}
                deleteTask={deleteTask} deleteEvent={deleteEvent}
                settings={settings}
              />
            )}
            {screen === 'habits' && (
              <Habits
                habits={habits} spaces={spaces}
                toggleHabitDay={toggleHabitDay}
                openEdit={openEdit} deleteHabit={deleteHabit}
              />
            )}
            {screen === 'add' && draft && (
              <AddEdit
                draft={draft} setDraft={setDraft} spaces={spaces}
                saveDraft={saveDraft} setScreen={setScreen}
                isEdit={editMode} deleteCurrent={deleteCurrent}
              />
            )}
            {screen === 'notif' && draft && (
              <Notif draft={draft} setDraft={setDraft} setScreen={setScreen} />
            )}
            {screen === 'spaces' && (
              <Spaces
                spaces={spaces} setSpaces={setSpaces}
                tasks={tasks} habits={habits}
                setScreen={setScreen}
              />
            )}
            {screen === 'workout' && (
              <Workout
                kits={kits} plan={plan} sessions={sessions} habits={habits}
                saveKit={saveKit} deleteKit={deleteKit}
                updatePlan={updatePlan} upsertSession={upsertSession}
              />
            )}
            {screen === 'analytics' && (
              <Analytics
                tasks={tasks} events={events}
                habits={habits} spaces={spaces}
                archive={archive}
              />
            )}
            {screen === 'settings' && (
              <Settings
                settings={settings}
                updateSettings={updateSettings}
                state={{ spaces, tasks, events, habits, kits, plan, sessions }}
                importState={importState}
                resetAll={resetAll}
                stats={stats}
                setScreen={setScreen}
                showToast={(message) => setToast({ message })}
              />
            )}
            </div>
          </div>

          <BottomNav screen={screen} setScreen={setScreen} openAdd={openAdd} />

          {toast && <Toast message={toast.message} />}
        </div>
      </div>
    </>
  );
}

// Build a snapshot of a past week for the archive
function buildWeekSnapshot(weekMonday, tasks, events, habits, spaces) {
  // Build the 7 day ISOs for that week
  const start = new Date(weekMonday + 'T00:00:00');
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const tasksDueThisWeek = tasks.filter(t => week.includes(t.deadline));
  const tasksCompleted = tasksDueThisWeek.filter(t => t.done);
  const habitDone = habits.reduce((s, h) =>
    s + week.filter(d => h.completions.includes(d)).length, 0);
  const habitSlots = habits.length * 7;
  const habitPct = habitSlots ? Math.round((habitDone / habitSlots) * 100) : 0;
  const completionRate = tasksDueThisWeek.length
    ? Math.round((tasksCompleted.length / tasksDueThisWeek.length) * 100)
    : 0;

  const formatRange = () => {
    const opts = { month: 'short', day: 'numeric' };
    return `${new Date(week[0] + 'T00:00:00').toLocaleDateString('en-US', opts)} – ${new Date(week[6] + 'T00:00:00').toLocaleDateString('en-US', opts)}`;
  };

  return {
    isCurrent: false,
    weekStart: weekMonday,
    label: `Week of ${formatRange()}`,
    shortLabel: new Date(weekMonday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tasksCompleted: tasksCompleted.length,
    tasksTotal: tasksDueThisWeek.length,
    completionRate,
    habitsCompleted: habitDone,
    habitSlots, habitPct,
    eventsCount: 0,
    byDay: week.map((d, i) => {
      const tDone = tasks.filter(t => t.done && t.deadline === d).length;
      const hDone = habits.filter(h => h.completions.includes(d)).length;
      return {
        date: d,
        dayKey: weekDaysFrom()[i],
        tasksDone: tDone, habitsDone: hDone,
        total: tDone + hDone,
      };
    }),
    perHabit: habits.map(h => ({
      id: h.id, name: h.name, color: h.color,
      done: week.filter(d => h.completions.includes(d)).length,
      target: h.frequency === 'daily' ? 7
            : h.frequency === 'weekdays' ? 5
            : h.frequency === '3x' ? 3
            : (h.customDays || []).length,
    })),
    perSpace: spaces.map(sp => {
      const sTasks = tasks.filter(t => t.spaceId === sp.id);
      const sHabits = habits.filter(h => h.spaceId === sp.id);
      const tDone = sTasks.filter(t => t.done && week.includes(t.deadline)).length;
      const hDone = sHabits.reduce((s, h) =>
        s + week.filter(d => h.completions.includes(d)).length, 0);
      return {
        id: sp.id, name: sp.name, color: sp.color,
        tasks: tDone, habits: hDone, total: tDone + hDone,
      };
    }),
  };
}
