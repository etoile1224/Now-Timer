import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Vibration } from 'react-native';
import { loadSettings, saveSettings, type TimerSettings } from '@/lib/timerSettings';
import { playAlert, stopAlert } from '@/lib/sounds';
import {
  scheduleTimerNotification,
  cancelAllTimerNotifications,
} from '@/lib/pushNotifications';

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
  const [phase, setPhase] = useState<TimerPhase>('idle');
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

  const escalationSeconds = useCallback(() => {
    if (devModeRef.current) return DEV_SECONDS;
    switch (settings.escalationSpeed) {
      case 'slow': return 60;
      case 'fast': return 15;
      default: return 30;
    }
  }, [settings.escalationSpeed]);

  // ── Background local notifications ──────────────────
  // 백그라운드 알림 전략:
  //  - focusing 진입 시: 종료 시점에 work-end (NOW! Lv1) + work-lv2 + work-lv3 예약
  //  - breaking 진입 시: 종료 시점에 break-end + break-lv2 + break-lv3 예약
  //  - nowAlert/returnAlert: 이미 사운드/오버레이가 떴으므로 추가 예약 없음
  //  - 모든 phase 전환 직전에 기존 예약 전부 취소 (race-free)
  const scheduleBackgroundAlertsForPhase = useCallback(
    (nextPhase: TimerPhase, durationSeconds: number) => {
      void cancelAllTimerNotifications().then(() => {
        const esc = escalationSeconds();
        if (nextPhase === 'focusing') {
          void scheduleTimerNotification('work-end', durationSeconds);
          void scheduleTimerNotification('work-lv2', durationSeconds + esc);
          void scheduleTimerNotification('work-lv3', durationSeconds + esc * 2);
        } else if (nextPhase === 'breaking') {
          void scheduleTimerNotification('break-end', durationSeconds);
          void scheduleTimerNotification('break-lv2', durationSeconds + esc);
          void scheduleTimerNotification('break-lv3', durationSeconds + esc * 2);
        }
      });
    },
    [escalationSeconds],
  );

  const transitionTo = useCallback(
    (nextPhase: TimerPhase, durationSeconds: number) => {
      const end = Date.now() + durationSeconds * 1000;
      setPhase(nextPhase);
      setEndTimeMs(end);
      setTotalSeconds(durationSeconds);
      setRemainingSeconds(durationSeconds);
      scheduleBackgroundAlertsForPhase(nextPhase, durationSeconds);
    },
    [scheduleBackgroundAlertsForPhase],
  );

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
          ignoreLevelRef.current = 1;
          setIgnoreLevel(1);
          void playAlert(settings.soundType, settings.soundVolume, 1);
          Vibration.vibrate(500);
          const nextEnd = Date.now() + escalationSeconds() * 1000;
          setEndTimeMs(nextEnd);
          setTotalSeconds(escalationSeconds());
          setRemainingSeconds(escalationSeconds());
          setPhase('nowAlert');

        } else if (phase === 'breaking') {
          ignoreLevelRef.current = 1;
          setIgnoreLevel(1);
          void playAlert(settings.soundType, settings.soundVolume, 1);
          Vibration.vibrate(500);
          const nextEnd = Date.now() + escalationSeconds() * 1000;
          setEndTimeMs(nextEnd);
          setTotalSeconds(escalationSeconds());
          setRemainingSeconds(escalationSeconds());
          setPhase('returnAlert');

        } else if (phase === 'nowAlert' || phase === 'returnAlert') {
          ignoreLevelRef.current += 1;
          setIgnoreLevel(ignoreLevelRef.current);
          const soundLevel = Math.min(3, ignoreLevelRef.current);
          void playAlert(settings.soundType, settings.soundVolume, soundLevel);
          // 레벨 올라갈수록 진동 강하게
          if (soundLevel >= 3) {
            Vibration.vibrate([0, 300, 100, 300, 100, 500]);
          } else {
            Vibration.vibrate([0, 200, 100, 400]);
          }
          const nextEnd = Date.now() + escalationSeconds() * 1000;
          setEndTimeMs(nextEnd);
          setTotalSeconds(escalationSeconds());
          setRemainingSeconds(escalationSeconds());
        }
      }
    }, 250);

    return clearInterval_;
  }, [phase, endTimeMs, settings, clearInterval_, escalationSeconds]);

  const progress =
    totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;

  const start = useCallback(() => {
    resetIgnoreLevel();
    transitionTo('focusing', effectiveWorkDur());
  }, [effectiveWorkDur, transitionTo, resetIgnoreLevel]);

  const stop = useCallback(() => {
    clearInterval_();
    void stopAlert();
    void cancelAllTimerNotifications();
    resetIgnoreLevel();
    setPhase('idle');
    setRemainingSeconds(settings.workDuration * 60);
    setTotalSeconds(settings.workDuration * 60);
  }, [settings, clearInterval_, resetIgnoreLevel]);

  const dismiss = useCallback(() => {
    void stopAlert();
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
    void stopAlert();
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
