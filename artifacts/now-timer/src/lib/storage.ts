export interface TimerSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  hideTimer: boolean;
  soundType: 'bell' | 'chime' | 'soft';
  soundVolume: number;
  escalationSpeed: 'slow' | 'normal' | 'fast';
}

export const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  hideTimer: true,
  soundType: 'bell',
  soundVolume: 0.7,
  escalationSpeed: 'normal',
};

const SETTINGS_KEY = 'now-timer-settings';

export function loadSettings(): TimerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: TimerSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
