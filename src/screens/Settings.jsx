import { useState } from 'react';
import pkg from '../../package.json';
import { C, card, screenTitle, screenPad, sectionLabel, rowStyle } from '../lib/theme.js';
import { Toggle, Confirm, Chip } from '../components/ui.jsx';
import { exportLocal, exportShare, pickAndReadJSON } from '../lib/fileio.js';
import { testNotification } from '../lib/notifications.js';

/**
 * Settings - real preferences. Replaces the old Profile screen.
 */
export function Settings({ settings, updateSettings, state, importState, resetAll, stats, setScreen, showToast }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [lastExportPath, setLastExportPath] = useState(null);

  const buildPayload = () => ({
    version: 2,
    exportedAt: new Date().toISOString(),
    data: state,
    settings,
  });

  const doExportLocal = async () => {
    const res = await exportLocal(buildPayload());
    if (res.success) {
      setLastExportPath(res.path);
      showToast?.(res.native ? `Saved to ${res.path}` : 'Downloaded');
    } else {
      alert(`Export failed: ${res.error || 'unknown error'}`);
    }
  };

  const doExportShare = async () => {
    const res = await exportShare(buildPayload());
    if (res.success && !res.canceled) {
      showToast?.('Shared!');
    } else if (!res.canceled && res.error) {
      alert(`Share failed: ${res.error}`);
    }
  };

  const doImport = async () => {
    try {
      const parsed = await pickAndReadJSON();
      importState(parsed); // validates; throws on unusable files
      if (parsed.settings && typeof parsed.settings === 'object') {
        updateSettings(parsed.settings);
      }
    } catch (err) {
      alert(`Could not import: ${err.message}`);
    }
  };

  const doTestNotif = async () => {
    const result = await testNotification();
    const msg = {
      'scheduled': 'Test scheduled — watch for it in ~8 seconds',
      'no-permission': 'Permission denied. Enable notifications for Focl in system settings.',
      'not-native': 'Only works in the installed app, not the browser.',
    }[result] || `Failed: ${result}`;
    showToast?.(msg);
  };

  return (
    <div style={screenPad}>
      <div style={screenTitle}>Settings</div>
      <div style={{ fontSize: 12, color: C.t2, marginTop: 4, marginBottom: 20 }}>
        Preferences & data
      </div>

      {/* Quick links */}
      <div style={sectionLabel}>Manage</div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 20 }}>
        <Row label="Spaces" sub={`${state.spaces.length} space${state.spaces.length === 1 ? '' : 's'}`} onClick={() => setScreen('spaces')} />
      </div>

      {/* Auto-cleanup */}
      <div style={sectionLabel}>Auto-cleanup</div>
      <div style={{ ...card, padding: 14, marginBottom: 8 }}>
        <div style={{ fontSize: 14, marginBottom: 4 }}>Delete completed items after</div>
        <div style={{ fontSize: 11, color: C.t2, marginBottom: 12 }}>
          Completed tasks and past events are removed automatically. Habits and spaces are never touched.
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            [0, 'Never'],
            [1, '1 day'],
            [3, '3 days'],
            [7, '7 days'],
            [14, '14 days'],
            [30, '30 days'],
          ].map(([n, label]) => (
            <Chip
              key={n}
              active={settings.autoDeleteCompletedDays === n}
              onClick={() => updateSettings({ autoDeleteCompletedDays: n })}
            >{label}</Chip>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.t3, marginBottom: 20, padding: '0 4px' }}>
        Runs once per day when you open the app.
      </div>

      {/* Display */}
      <div style={sectionLabel}>Display</div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 20 }}>
        <div style={rowStyle}>
          <div>
            <div style={{ fontSize: 14 }}>Show overdue tasks</div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Above today's tasks</div>
          </div>
          <Toggle
            on={settings.showOverdue}
            onChange={v => updateSettings({ showOverdue: v })}
          />
        </div>
        <div style={{ ...rowStyle, borderTop: `0.5px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize: 14 }}>Haptic feedback</div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Vibrate on checkmark</div>
          </div>
          <Toggle
            on={settings.hapticFeedback}
            onChange={v => updateSettings({ hapticFeedback: v })}
          />
        </div>
        <div style={{ ...rowStyle, borderTop: `0.5px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize: 14 }}>Week starts on</div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>For analytics & weekly view</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['monday', 'sunday'].map(d => (
              <button
                key={d}
                onClick={() => updateSettings({ weekStartsOn: d })}
                style={{
                  padding: '6px 12px', borderRadius: 100, border: 'none',
                  background: settings.weekStartsOn === d ? C.amber : C.s2,
                  color: settings.weekStartsOn === d ? C.bg : C.t2,
                  fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  textTransform: 'capitalize', fontFamily: 'DM Mono',
                }}
              >{d.slice(0, 3)}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div style={sectionLabel}>Notifications</div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 20 }}>
        <Row
          label="Send a test notification"
          sub="Fires in ~8 seconds if everything's set up"
          onClick={doTestNotif}
        />
      </div>

      {/* At a glance */}
      <div style={sectionLabel}>At a glance</div>
      <div style={{ ...card, padding: 14, marginBottom: 20 }}>
        <StatLine label="Tasks" total={stats.tasks} sub={`${stats.tasksDone} done`} />
        <Divider />
        <StatLine label="Events" total={stats.events} sub={`${stats.recurringEvents} recurring`} />
        <Divider />
        <StatLine label="Habits" total={stats.habits} sub={`${stats.completionsAll} completions`} />
        <Divider />
        <StatLine label="Best streak" total={stats.bestStreak} sub="days" />
      </div>

      {/* Data */}
      <div style={sectionLabel}>Data</div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: 8 }}>
        <Row
          label="Save backup to phone"
          sub="Writes to Documents/Focl folder"
          onClick={doExportLocal}
        />
        <Row
          label="Send to Drive / share…"
          sub="Pops Android's share sheet"
          onClick={doExportShare}
          borderTop
        />
        <Row
          label="Import backup"
          sub="Pick a JSON file to restore from"
          onClick={doImport}
          borderTop
        />
        <Row
          label="Reset all data"
          sub="Start over — cannot be undone"
          onClick={() => setConfirmReset(true)}
          borderTop
          danger
        />
      </div>
      {lastExportPath && (
        <div style={{
          fontSize: 11, color: C.green, fontFamily: 'DM Mono',
          padding: '4px 4px 20px', wordBreak: 'break-all',
        }}>
          ✓ Last saved: {lastExportPath}
        </div>
      )}
      {!lastExportPath && (
        <div style={{ height: 20 }} />
      )}

      <div style={{ fontSize: 10, color: C.t3, textAlign: 'center', padding: '20px 0', fontFamily: 'DM Mono' }}>
        Focl · personal build · v{pkg.version}
      </div>

      {confirmReset && (
        <Confirm
          title="Reset everything?"
          message="All tasks, events, habits and spaces will be deleted permanently. Make sure you've exported a backup first."
          danger
          onConfirm={() => { resetAll(); setConfirmReset(false); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}

function Row({ label, sub, onClick, borderTop, danger }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px',
        borderTop: borderTop ? `0.5px solid ${C.border}` : 'none',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 14, cursor: onClick ? 'pointer' : 'default',
        color: danger ? C.red : C.t1,
      }}
    >
      <div>
        <div>{label}</div>
        <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{sub}</div>
      </div>
      {onClick && <span style={{ color: C.t3 }}>›</span>}
    </div>
  );
}

function StatLine({ label, total, sub }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '4px 0',
    }}>
      <span style={{ fontSize: 13, color: C.t2 }}>{label}</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
        <span style={{ fontSize: 18, fontFamily: 'DM Mono' }}>{total}</span>
        <span style={{ fontSize: 11, color: C.t3, fontFamily: 'DM Mono' }}>{sub}</span>
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.border, opacity: 0.5, margin: '4px 0' }} />;
}
