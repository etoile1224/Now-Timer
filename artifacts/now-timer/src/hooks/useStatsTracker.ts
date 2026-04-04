import { useEffect, useRef } from 'react';
import { useTimer } from '@/context/TimerContext';
import {
  addSession,
  addNowReaction,
  todayStr,
} from '@/lib/statsStorage';

export interface ReactionEvent {
  reactionMs: number;
  dismissed: boolean;
}

interface UseStatsTrackerOptions {
  onReaction?: (ev: ReactionEvent) => void;
}

export function useStatsTracker(opts?: UseStatsTrackerOptions) {
  const { phase, ignoreLevel } = useTimer();
  const prevPhaseRef = useRef(phase);
  const prevIgnoreLevelRef = useRef(ignoreLevel);
  const alertStartRef = useRef<number | null>(null);

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const prevIgnore = prevIgnoreLevelRef.current;
    prevPhaseRef.current = phase;
    prevIgnoreLevelRef.current = ignoreLevel;

    const enteringAlert =
      (phase === 'nowAlert' || phase === 'returnAlert') &&
      (prevPhase === 'focusing' || prevPhase === 'breaking');

    if (enteringAlert && ignoreLevel === 1) {
      alertStartRef.current = Date.now();
    }

    const workDone = phase === 'breaking' && prevPhase === 'nowAlert';
    const breakDone = phase === 'focusing' && prevPhase === 'returnAlert';

    if (workDone) {
      const date = todayStr();
      addSession({ date, completedAt: Date.now(), type: 'work' });

      if (alertStartRef.current !== null) {
        const alertedAt = alertStartRef.current;
        const reactedAt = Date.now();
        const reactionMs = reactedAt - alertedAt;
        const dismissed = prevIgnore <= 1;
        addNowReaction({ date, alertedAt, reactedAt, reactionMs, dismissed });
        opts?.onReaction?.({ reactionMs, dismissed });
        alertStartRef.current = null;
      }
    }

    if (breakDone) {
      addSession({ date: todayStr(), completedAt: Date.now(), type: 'break' });
    }
  });
}
