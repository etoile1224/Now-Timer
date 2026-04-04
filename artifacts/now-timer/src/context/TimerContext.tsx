import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { loadSettings, saveSettings, TimerSettings } from '@/lib/storage';
import { playAlert, unlockAudio } from '@/lib/sounds';

export type TimerPhase =
  | 'idle'
  | 'focusing'
  | 'nowAlert'
  | 'breaking'
  | 'returnAlert';

export interface TimerState {
  phase: TimerPhase;
  sessionCount: number;
  progress: number;
  remainingSeconds: number;
  totalSeconds: number;
  settings: TimerSettings;
  isLongBreak: boolean;
  devMode: boolean;
  ignoreLevel: number;
}

interface TimerActions {
  start: () => void;
  stop: () => void;
  dismiss: () => void;
  snooze: () => void;
  updateSettings: (partial: Partial<TimerSettings>) => void;
  toggleDevMode: () => void;
}

const TimerContext = createContext<(TimerState & TimerActions) | null>(null);

const DEV_SECONDS = 5;

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TimerSettings>(loadSettings);
  const [phase, setPhase] = useState<TimerPhase>('focusing');
  const [sessionCount, setSessionCount] = useState(0);
  const [isLongBreak, setIsLongBreak] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [ignoreLevel, setIgnoreLevel] = useState(0);
  const devModeRef = useRef(false);
  const ignoreLevelRef = useRef(0);

  const initDuration = settings.workDuration * 60;
  const [endTimeMs, setEndTimeMs] = useState<number>(
    Date.now() + initDuration * 1000,
  );
  const [totalSeconds, setTotalSeconds] = useState(initDuration);
  const [remainingSeconds, setRemainingSeconds] = useState(initDuration);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveWorkDur = useCallback(
    () => (devModeRef.current ? DEV_SECONDS : settings.workDuration * 60),
    [settings.workDuration],
  );
  const effectiveShortBreak = useCallback(
    () => (devModeRef.current ? DEV_SECONDS : settings.shortBreakDuration * 60),
    [settings.shortBreakDuration],
  );
  const effectiveLongBreak = useCallback(
    () => (devModeRef.current ? DEV_SECONDS : settings.longBreakDuration * 60),
    [settings.longBreakDuration],
  );

  const clearInterval_ = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const transitionTo = useCallback(
    (nextPhase: TimerPhase, durationSeconds: number) => {
      const end = Date.now() + durationSeconds * 1000;
      setPhase(nextPhase);
      setEndTimeMs(end);
      setTotalSeconds(durationSeconds);
      setRemainingSeconds(durationSeconds);
    },
    [],
  );

  const bumpIgnoreLevel = useCallback(() => {
    ignoreLevelRef.current += 1;
    setIgnoreLevel(ignoreLevelRef.current);
    return ignoreLevelRef.current;
  }, []);

  const resetIgnoreLevel = useCallback(() => {
    ignoreLevelRef.current = 0;
    setIgnoreLevel(0);
  }, []);

  useEffect(() => {
    clearInterval_();
    if (phase === 'idle' || endTimeMs === null) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((endTimeMs - now) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval_();

        if (phase === 'focusing') {
          // First time NOW! fires — level 1
          ignoreLevelRef.current = 1;
          setIgnoreLevel(1);
          playAlert(settings.soundType, settings.soundVolume);
          setPhase('nowAlert');

        } else if (phase === 'breaking') {
          // Return alert — level 1
          ignoreLevelRef.current = 1;
          setIgnoreLevel(1);
          playAlert(settings.soundType, settings.soundVolume);
          setPhase('returnAlert');

        } else if (phase === 'nowAlert' || phase === 'returnAlert') {
          // User ignored → bump level, re-alert
          const lv = bumpIgnoreLevel();
          playAlert(settings.soundType, Math.min(1, settings.soundVolume + lv * 0.1));
          // Keep same phase — trigger re-render by resetting endTime briefly
          // We set endTimeMs via transitionTo only when snooze is used;
          // here we just re-fire the alert. setPhase to same value won't re-render,
          // so we force a re-alert state update via a small timestamp push.
          setPhase((prev) => prev); // no-op but signals intent
        }
      }
    }, 250);

    return clearInterval_;
  }, [phase, endTimeMs, settings, clearInterval_, bumpIgnoreLevel]);

  const progress =
    totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;

  const start = useCallback(() => {
    unlockAudio();
    resetIgnoreLevel();
    transitionTo('focusing', effectiveWorkDur());
  }, [effectiveWorkDur, transitionTo, resetIgnoreLevel]);

  const stop = useCallback(() => {
    clearInterval_();
    resetIgnoreLevel();
    setPhase('idle');
    setRemainingSeconds(settings.workDuration * 60);
    setTotalSeconds(settings.workDuration * 60);
  }, [settings, clearInterval_, resetIgnoreLevel]);

  const dismiss = useCallback(() => {
    resetIgnoreLevel();
    if (phase === 'nowAlert') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      const long = newCount % settings.longBreakInterval === 0;
      setIsLongBreak(long);
      const breakDur = long ? effectiveLongBreak() : effectiveShortBreak();
      transitionTo('breaking', breakDur);
    } else if (phase === 'returnAlert') {
      transitionTo('focusing', effectiveWorkDur());
    }
  }, [
    phase,
    sessionCount,
    settings,
    effectiveWorkDur,
    effectiveShortBreak,
    effectiveLongBreak,
    transitionTo,
    resetIgnoreLevel,
  ]);

  const snooze = useCallback(() => {
    const snoozeDur = devModeRef.current ? DEV_SECONDS : 5 * 60;
    if (phase === 'nowAlert') {
      transitionTo('focusing', snoozeDur);
    } else if (phase === 'returnAlert') {
      transitionTo('breaking', snoozeDur);
    }
  }, [phase, transitionTo]);

  const updateSettings = useCallback(
    (partial: Partial<TimerSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  const toggleDevMode = useCallback(() => {
    setDevMode((prev) => {
      const next = !prev;
      devModeRef.current = next;
      return next;
    });
  }, []);

  return (
    <TimerContext.Provider
      value={{
        phase,
        sessionCount,
        progress,
        remainingSeconds,
        totalSeconds,
        settings,
        isLongBreak,
        devMode,
        ignoreLevel,
        start,
        stop,
        dismiss,
        snooze,
        updateSettings,
        toggleDevMode,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerState & TimerActions {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used inside TimerProvider');
  return ctx;
}
