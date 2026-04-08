import { getItem, setItem } from './storage';

export type SoundType = 'ember';
export type EscalationSpeed = 'slow' | 'normal' | 'fast';

export interface TimerSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  hideTimer: boolean;
  soundType: SoundType;
  soundVolume: number;
  escalationSpeed: EscalationSpeed;
  doNotDisturb: boolean;
}

export const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  hideTimer: true,
  soundType: 'ember',
  soundVolume: 0.7,
  escalationSpeed: 'normal',
  doNotDisturb: false,
};

const SETTINGS_KEY = 'now-timer-settings';

export function loadSettings(): TimerSettings {
  try {
    const raw = getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: TimerSettings): void {
  setItem(SETTINGS_KEY, JSON.stringify(settings));
}
