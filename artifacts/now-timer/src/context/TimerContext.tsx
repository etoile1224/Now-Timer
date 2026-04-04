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
}

interface TimerActions {
  start: () => void;
  stop: () => void;
  dismiss: () => void;
  snooze: () => void;
  updateSettings: (partial: Partial<TimerSettings>) => void;
}

const TimerContext = createContext<(TimerState & TimerActions) | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TimerSettings>(loadSettings);
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [sessionCount, setSessionCount] = useState(0);
  const [endTimeMs, setEndTimeMs] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(settings.workDuration * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(settings.workDuration * 60);
  const [isLongBreak, setIsLongBreak] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertedRef = useRef(false);

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
      alertedRef.current = false;
    },
    [],
  );

  const fireNowAlert = useCallback(
    (currentSettings: TimerSettings) => {
      if (alertedRef.current) return;
      alertedRef.current = true;
      playAlert(currentSettings.soundType, currentSettings.soundVolume);
    },
    [],
  );

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
          fireNowAlert(settings);
          setPhase('nowAlert');
        } else if (phase === 'breaking') {
          fireNowAlert(settings);
          setPhase('returnAlert');
        }
      }
    }, 500);

    return clearInterval_;
  }, [phase, endTimeMs, settings, clearInterval_, fireNowAlert]);

  const progress =
    totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;

  const start = useCallback(() => {
    unlockAudio();
    const dur = settings.workDuration * 60;
    transitionTo('focusing', dur);
  }, [settings, transitionTo]);

  const stop = useCallback(() => {
    clearInterval_();
    setPhase('idle');
    setEndTimeMs(null);
    setRemainingSeconds(settings.workDuration * 60);
    setTotalSeconds(settings.workDuration * 60);
  }, [settings, clearInterval_]);

  const dismiss = useCallback(() => {
    const newCount = phase === 'nowAlert' ? sessionCount + 1 : sessionCount;
    if (phase === 'nowAlert') {
      setSessionCount(newCount);
      const long = newCount % settings.longBreakInterval === 0;
      setIsLongBreak(long);
      const breakDur = long
        ? settings.longBreakDuration * 60
        : settings.shortBreakDuration * 60;
      transitionTo('breaking', breakDur);
    } else if (phase === 'returnAlert') {
      transitionTo('focusing', settings.workDuration * 60);
    }
  }, [phase, sessionCount, settings, transitionTo]);

  const snooze = useCallback(() => {
    const snoozeSeconds = 5 * 60;
    transitionTo(phase, snoozeSeconds);
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
        start,
        stop,
        dismiss,
        snooze,
        updateSettings,
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
