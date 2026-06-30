import { useState, useEffect, useMemo, useReducer, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { C, fonts } from './lib/theme.js';
import { todayISO, newId, setWeekStart, greeting, dateKicker } from './lib/helpers.js';
import { loadState, saveStateField } from './lib/storage.js';
import { DEFAULTS } from './lib/seed.js';
import { initNotifications, resyncAll, scheduleItem, cancelItem, classReminderItem } from './lib/notifications.js';
import { setHapticsEnabled, tapLight, tapMedium } from './lib/haptics.js';
import {
  reducer, initialState, DEFAULT_SETTINGS, PERSISTED_KEYS,
  sanitizeImport, isSessionComplete,
} from './state/store.js';
import { runDailyMaintenance } from './state/maintenance.js';

import { BottomNav } from './components/BottomNav.jsx';
import { Header } from './components/Header.jsx';
import { Toast } from './components/ui.jsx';
import { Home } from './screens/Home.jsx';
import { Plan } from './screens/Plan.jsx';
import { Habits } from './screens/Habits.jsx';
import { AddEdit } from './screens/AddEdit.jsx';
import { Notif } from './screens/Notif.jsx';
import { Spaces } from './screens/Spaces.jsx';
import { Settings } from './screens/Settings.jsx';
import { Analytics } from './screens/Analytics.jsx';
import { Workout } from './screens/Workout.jsx';
import { Classes } from './screens/Classes.jsx';

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
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState('home');
  const screenRef = useRef(screen);
  useEffect(() => { screenRef.current = screen; }, [screen]);
  const [draft, setDraft] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState(null);

  const { spaces, tasks, events, habits, settings, archive, kits, plan, sessions, classes } = state;

  // Initial load: hydrate, run daily maintenance (pure), then re-arm every
  // reminder. The full resync (rather than only rolled tasks) repairs items
  // saved before notification permission was granted and alarms dropped by
  // reboots or OEM battery managers.
  useEffect(() => {
    (async () => {
      const s = await loadState(DEFAULTS);
      s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
      // weekISO must respect the user's week start before archiving runs
      setWeekStart(s.settings.weekStartsOn);

      const { state: next } = runDailyMaintenance(s);

      initNotifications()
        .then(() => resyncAll(next.tasks, next.events, next.classes))
        .catch(() => {});

      dispatch({ type: 'load', state: next });
      setLoaded(true);
    })();
  }, []);

  // Persist whichever slices changed. The first pass after load saves
  // everything so maintenance results survive a restart.
  const persistedRef = useRef(null);
  useEffect(() => {
    if (!loaded) return;
    const prev = persistedRef.current;
    for (const k of PERSISTED_KEYS) {
      if (!prev || prev[k] !== state[k]) saveStateField(k, state[k]);
    }
    persistedRef.current = state;
  }, [state, loaded]);

  // Mirror user settings into the helper modules.
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
          if (s === 'classes') { setScreen('settings'); return; }
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
    const task = tasks.find(t => t.id === id);
    dispatch({ type: 'task/toggle', id });
    // A one-off task's reminder is sticky until the task is done: completing
    // clears it, un-completing re-arms it. Recurring tasks are left alone —
    // their repeating schedule must keep firing for future occurrences.
    const oneOff = !task?.recurrence || task.recurrence === 'none';
    if (task?.notifications?.length && oneOff) {
      if (task.done) scheduleItem({ ...task, done: false }, 'task').catch(() => {});
      else cancelItem(id).catch(() => {});
    }
  };

  const deleteTask = (id) => {
    cancelItem(id).catch(() => {});
    dispatch({ type: 'task/delete', id });
  };

  const deleteEvent = (id) => {
    cancelItem(id).catch(() => {});
    dispatch({ type: 'event/delete', id });
  };

  const deleteHabit = (id) => dispatch({ type: 'habit/delete', id });

  const toggleHabitDay = (id, dateISO) => {
    tapLight();
    dispatch({ type: 'habit/toggleDay', id, date: dateISO });
  };

  const quickAddTask = (name, spaceId) => {
    tapMedium();
    dispatch({
      type: 'task/add',
      task: {
        id: newId(), name, notes: '', spaceId, priority: 'medium',
        deadline: todayISO(), done: false,
        recurrence: 'none', customDays: [],
        notifications: [],
        createdAt: new Date().toISOString(),
      },
    });
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
        dispatch({
          type: 'task/update', id: draft.id,
          patch: {
            name: draft.name, notes: draft.notes, spaceId: draft.spaceId,
            priority: draft.priority, deadline: draft.deadline,
            recurrence: draft.recurrence, customDays: draft.customDays,
            notifications: notifs,
          },
        });
        const next = { ...draft, notifications: notifs, done: false };
        cancelItem(draft.id).then(() => scheduleItem(next, 'task')).catch(() => {});
      } else {
        const t = {
          id: newId(), name: draft.name, notes: draft.notes, spaceId: draft.spaceId,
          priority: draft.priority, deadline: draft.deadline, done: false,
          recurrence: draft.recurrence || 'none',
          customDays: draft.customDays || [],
          notifications: notifs, createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'task/add', task: t });
        scheduleItem(t, 'task').catch(() => {});
      }
    } else if (draft.type === 'event') {
      const startDatetime = `${draft.date}T${draft.startTime}`;
      const endDatetime = `${draft.date}T${draft.endTime}`;
      if (editMode && draft.id) {
        dispatch({
          type: 'event/update', id: draft.id,
          patch: {
            name: draft.name, notes: draft.notes, spaceId: draft.spaceId,
            startDatetime, endDatetime, recurrence: draft.recurrence,
            customDays: draft.customDays, notifications: notifs,
          },
        });
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
        dispatch({ type: 'event/add', event: e });
        scheduleItem(e, 'event').catch(() => {});
      }
    } else { // habit
      if (editMode && draft.id) {
        dispatch({
          type: 'habit/update', id: draft.id,
          patch: {
            name: draft.name, spaceId: draft.spaceId,
            frequency: draft.frequency, customDays: draft.customDays,
            color: draft.color, goalDays: +draft.goalDays || 30,
          },
        });
      } else {
        dispatch({
          type: 'habit/add',
          habit: {
            id: newId(), name: draft.name, spaceId: draft.spaceId,
            color: draft.color, frequency: draft.frequency,
            customDays: draft.customDays,
            streakCurrent: 0, streakBest: 0,
            goalDays: +draft.goalDays || 30, completions: [],
            createdAt: new Date().toISOString(),
          },
        });
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

  // === Spaces handlers ===

  const saveSpace = (space) =>
    dispatch({ type: 'space/save', space: { ...space, id: space.id || newId() } });

  const deleteSpace = (id) => dispatch({ type: 'space/delete', id });

  // === Class schedule handlers ===

  const saveClass = (cls) => {
    tapMedium();
    const full = { ...cls, id: cls.id || newId() };
    dispatch({ type: 'class/save', class: full });
    // Re-arm the class's reminder from scratch (covers edits that change the
    // day/time/timing or toggle it off).
    cancelItem(full.id)
      .then(() => scheduleItem(classReminderItem(full), 'event'))
      .catch(() => {});
  };

  const deleteClass = (id) => {
    cancelItem(id).catch(() => {});
    dispatch({ type: 'class/delete', id });
  };

  // === Workout handlers ===

  const saveKit = (kit) => {
    tapMedium();
    dispatch({ type: 'kit/save', kit });
  };

  const deleteKit = (id) => dispatch({ type: 'kit/delete', id });

  const updatePlan = (partial) => dispatch({ type: 'plan/update', partial });

  const upsertSession = (sess) => {
    // Stronger haptic when this update completes the whole session
    const existing = sessions.find(s => s.date === sess.date);
    const merged = existing ? { ...existing, ...sess } : sess;
    const kit = kits.find(k => k.id === merged.kitId);
    const completesNow = !!kit && kit.exercises.length > 0 &&
      isSessionComplete(kit, merged.ex) &&
      !(existing && isSessionComplete(kit, existing.ex));
    if (completesNow) tapMedium(); else tapLight();

    dispatch({ type: 'session/upsert', session: sess, id: newId() });
  };

  // Settings & data actions
  const updateSettings = (partial) => dispatch({ type: 'settings/update', partial });

  const importState = (raw) => {
    const payload = sanitizeImport(raw); // throws on unusable files
    dispatch({ type: 'import', payload });
    setToast({ message: 'Imported!' });
  };

  const resetAll = () => {
    dispatch({ type: 'reset' });
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

  // Shared header copy per screen. Sub-screens (add/notif/spaces) carry
  // their own top bars, so they get no shared header (null).
  const headerFor = (s) => ({
    home: { kicker: dateKicker(), title: greeting() },
    plan: { kicker: 'This week', title: 'Plan' },
    habits: { kicker: 'Daily rituals', title: 'Habits' },
    workout: { kicker: kits.length ? kits.map(k => k.name).join(' / ') : 'Workout', title: 'Train' },
    analytics: { kicker: 'This week', title: 'Insights' },
    settings: { kicker: 'Preferences & data', title: 'Settings' },
  }[s] || null);
  const header = headerFor(screen);

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
            {header && (
              <Header kicker={header.kicker} title={header.title} screen={screen} setScreen={setScreen} />
            )}
            <div key={screen} className="fade-in">
            {screen === 'home' && (
              <Home
                tasks={tasks} events={events} habits={habits} spaces={spaces}
                settings={settings} classes={classes}
                toggleTask={toggleTask} toggleHabitDay={toggleHabitDay}
                deleteTask={deleteTask} openEdit={openEdit}
                quickAddTask={quickAddTask} setScreen={setScreen}
              />
            )}
            {screen === 'plan' && (
              <Plan
                tasks={tasks} events={events} spaces={spaces} classes={classes}
                openEdit={openEdit} setScreen={setScreen}
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
                spaces={spaces} saveSpace={saveSpace} deleteSpace={deleteSpace}
                tasks={tasks} habits={habits}
                setScreen={setScreen}
              />
            )}
            {screen === 'classes' && (
              <Classes
                classes={classes} spaces={spaces}
                saveClass={saveClass} deleteClass={deleteClass}
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
                state={{ spaces, tasks, events, habits, kits, plan, sessions, classes, dayPlans: state.dayPlans, blockTemplates: state.blockTemplates, dayTemplates: state.dayTemplates }}
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
