import { useState } from 'react';
import { C, card, sectionTitle, screenTitle, dot, inp, screenPad, SWATCHES } from '../lib/theme.js';
import { weekISO } from '../lib/helpers.js';
import { Empty, Confirm } from '../components/ui.jsx';
import { SwipeRow } from '../components/SwipeRow.jsx';
import { RowMenu } from '../components/RowMenu.jsx';

export function Spaces({ spaces, saveSpace, deleteSpace, tasks, habits, setScreen }) {
  const week = weekISO();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(C.amber);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const startAdd = () => {
    setEditingId(null); setName(''); setColor(C.amber); setAdding(true);
  };
  const startEdit = (sp) => {
    setEditingId(sp.id); setName(sp.name); setColor(sp.color); setAdding(true);
  };
  const cancel = () => { setAdding(false); setEditingId(null); };
  const save = () => {
    if (!name.trim()) return;
    saveSpace({ id: editingId, name: name.trim(), color });
    cancel();
  };
  const remove = (id) => {
    deleteSpace(id);
    setConfirmDelete(null);
  };

  const statCell = (label, val) => (
    <div>
      <div style={{ ...sectionTitle, fontSize: 9 }}>{label}</div>
      <div style={{ fontSize: 16, fontFamily: 'DM Mono', marginTop: 2 }}>{val}</div>
    </div>
  );

  return (
    <div style={screenPad}>
      {setScreen && (
        <button
          onClick={() => setScreen('settings')}
          style={{
            background: 'none', border: 'none', color: C.t2,
            fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12,
          }}
        >← Back</button>
      )}
      <div style={screenTitle}>Spaces</div>
      <div style={{ fontSize: 12, color: C.t2, marginTop: 4, marginBottom: 20 }}>
        Organize by what they're for
      </div>

      {spaces.length === 0 && <Empty>No spaces yet</Empty>}

      {spaces.map(s => {
        const sTasks = tasks.filter(t => t.spaceId === s.id);
        const sHabits = habits.filter(h => h.spaceId === s.id);
        const slots = sHabits.length * 7;
        const filled = sHabits.reduce(
          (a, h) => a + week.filter(d => h.completions.includes(d)).length, 0
        );
        const pct = slots ? Math.round((filled / slots) * 100) : 0;

        return (
          <SwipeRow
            key={s.id}
            onTap={() => startEdit(s)}
            actions={[
              { label: 'Edit', color: C.blue, onClick: () => startEdit(s) },
              { label: 'Delete', color: C.red, onClick: () => setConfirmDelete(s) },
            ]}
          >
            <div style={{ ...card, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={dot(s.color, 12)} />
                <span style={{ fontSize: 16, fontWeight: 500, flex: 1 }}>{s.name}</span>
                <RowMenu actions={[
                  { label: 'Edit', onClick: () => startEdit(s) },
                  { label: 'Delete', color: C.red, onClick: () => setConfirmDelete(s) },
                ]} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                {statCell('Tasks', sTasks.length)}
                {statCell('Habits', sHabits.length)}
                {statCell('Week', `${pct}%`)}
              </div>
              <div style={{ height: 4, background: C.s3, borderRadius: 100, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: s.color }} />
              </div>
            </div>
          </SwipeRow>
        );
      })}

      {!adding ? (
        <button
          onClick={startAdd}
          style={{
            width: '100%', padding: 14, background: 'transparent',
            border: `0.5px dashed ${C.border}`, borderRadius: 16,
            color: C.t2, fontSize: 14, cursor: 'pointer', marginTop: 6,
          }}
        >+ New space</button>
      ) : (
        <div style={{ ...card, padding: 14, marginTop: 6 }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Space name"
            style={{ ...inp, marginBottom: 12 }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {SWATCHES.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 28, height: 28, borderRadius: 100, background: c,
                  border: color === c ? `2px solid ${C.t1}` : 'none', cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={cancel}
              style={{
                flex: 1, padding: 10, background: C.s2,
                border: `0.5px solid ${C.border}`, borderRadius: 100,
                color: C.t2, fontSize: 13, cursor: 'pointer',
              }}
            >Cancel</button>
            <button
              onClick={save}
              style={{
                flex: 1, padding: 10, background: C.amber,
                border: 'none', borderRadius: 100,
                color: C.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >{editingId ? 'Update' : 'Create'}</button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <Confirm
          title={`Delete "${confirmDelete.name}"?`}
          message="Tasks, events and habits in this space won't be deleted — they'll just lose their space label."
          danger
          onConfirm={() => remove(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
