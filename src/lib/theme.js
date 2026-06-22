// All visual tokens for the app. Single source of truth.
//
// Palette derived from the cyan/teal-on-slate reference UI.
// NOTE: token NAMES are kept stable (amber, green, blue...) so the rest of
// the app doesn't need rewiring. The VALUES are the new scheme:
//   - `amber`  = primary cyan accent (was orange) — wired as the app's primary
//   - surfaces = slate blue-grey
//   - `red`    = orange action accent from the reference
//   - `bookmark` = the yellow countdown badge color — intentionally preserved
export const C = {
  bg: '#0C1416',        // near-black with a teal undertone
  s1: '#121E22',        // card surface
  s2: '#18272C',        // raised surface / inputs
  s3: '#21353B',        // highest surface / track
  amber: '#5CC6CF',     // PRIMARY accent (cyan) — name kept for wiring
  green: '#52B7A6',     // teal-green
  blue: '#4FA6C4',      // deeper cyan-blue
  red: '#D5703E',       // orange action accent (from the '3' badge)
  purple: '#7FB4C9',    // muted steel-cyan (re-tinted away from violet)
  pink: '#86D6DA',      // pale aqua
  bookmark: '#C6A52E',  // yellow countdown badge — DO NOT restyle
  border: '#23373D',    // hairline on slate
  t1: '#EAF6F6',        // primary text, faint cyan-white
  t2: '#8FA6AB',        // secondary text
  t3: '#566A6F',        // tertiary / muted
};

// A spread across the hue wheel rather than shades of the cyan brand
// accent, so spaces/habits/kits are easy to tell apart at a glance.
// All muted enough to sit on the dark slate background.
export const SWATCHES = [
  C.amber,   // cyan (primary)
  C.green,   // teal-green
  C.blue,    // cyan-blue
  '#7C82E8', // indigo
  '#A878D8', // violet
  '#D86FB0', // magenta
  '#E2574C', // coral red
  C.red,     // orange
  '#E0A33F', // amber-gold
  C.bookmark, // yellow
  '#7FB861', // lime green
  '#6FA2B5', // steel
];

// Translucent fill of the primary accent (for active chips, etc.)
export const accentTint = 'rgba(92,198,207,0.14)';
export const accentStrong = 'rgba(92,198,207,0.95)';

export const fonts = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
input, textarea, select, button { font-family: inherit; color: inherit; }
input:focus, textarea:focus, select:focus { outline: none; }
.scroll::-webkit-scrollbar { display: none; }
.scroll { scrollbar-width: none; -ms-overflow-style: none; }
button { transition: transform 0.08s ease; }
button:active { transform: scale(0.96); }
.fade-in { animation: fadeIn 0.18s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes slideRight { from { transform: translateX(0); } to { transform: translateX(-80px); } }
`;

// Shared style atoms
export const card = {
  background: C.s1,
  border: `0.5px solid ${C.border}`,
  borderRadius: 16,
};

export const monoMicro = {
  fontSize: 11,
  fontFamily: 'DM Mono',
  color: C.t2,
};

export const sectionTitle = {
  fontSize: 11,
  color: C.t3,
  fontFamily: 'DM Mono',
  letterSpacing: 1,
  textTransform: 'uppercase',
};

export const screenTitle = {
  fontSize: 22,
  fontWeight: 500,
};

export const dot = (color, size = 6) => ({
  width: size,
  height: size,
  borderRadius: 100,
  background: color,
  display: 'inline-block',
  flexShrink: 0,
});

export const navBtn = {
  background: 'none',
  border: 'none',
  color: C.t2,
  fontSize: 14,
  cursor: 'pointer',
  padding: 0,
};

export const primaryBtn = {
  background: C.amber,
  border: 'none',
  color: C.bg,
  fontSize: 13,
  fontWeight: 600,
  padding: '8px 16px',
  borderRadius: 100,
  cursor: 'pointer',
};

export const ghostBtn = {
  background: C.s2,
  border: `0.5px solid ${C.border}`,
  color: C.t1,
  fontSize: 13,
  padding: '8px 16px',
  borderRadius: 100,
  cursor: 'pointer',
};

export const inp = {
  width: '100%',
  padding: '10px 12px',
  background: C.s2,
  border: `0.5px solid ${C.border}`,
  borderRadius: 12,
  color: C.t1,
  fontSize: 14,
};

export const sectionLabel = {
  fontSize: 10,
  color: C.t3,
  fontFamily: 'DM Mono',
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: 8,
};

export const cardListStyle = {
  background: C.s1,
  border: `0.5px solid ${C.border}`,
  borderRadius: 16,
  marginBottom: 16,
  overflow: 'hidden',
};

export const rowStyle = {
  padding: '13px 14px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 14,
};

export const screenPad = { padding: '24px 20px 8px' };
