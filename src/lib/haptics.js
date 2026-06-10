// Haptic feedback, gated by the user's setting.
// App.jsx calls setHapticsEnabled() when settings load/change.

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

let enabled = true;

export const setHapticsEnabled = (v) => { enabled = !!v; };

const canVibrate = () => enabled && Capacitor.isNativePlatform();

// Light tap — checkmarks, toggles, chips
export const tapLight = () => {
  if (!canVibrate()) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
};

// Medium tap — FAB, saves, destructive confirms
export const tapMedium = () => {
  if (!canVibrate()) return;
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
};
