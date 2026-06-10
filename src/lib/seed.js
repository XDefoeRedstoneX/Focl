// First-run state: completely empty.
//
// Focl deliberately ships no sample data. If storage ever comes back
// empty (fresh install, app-data clear), the app must start blank
// rather than flood the user's lists with seeds — especially right
// before they restore a backup.

export const EMPTY_PLAN = {
  Mon: null, Tue: null, Wed: null, Thu: null, Fri: null, Sat: null, Sun: null,
  linkedHabitId: null,
};

export const DEFAULTS = {
  spaces: [],
  tasks: [],
  events: [],
  habits: [],
  kits: [],
  plan: EMPTY_PLAN,
  sessions: [],
  settings: null, // App fills with DEFAULT_SETTINGS
  archive: [],    // Past weekly snapshots
};
