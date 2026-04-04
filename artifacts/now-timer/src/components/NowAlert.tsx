import { motion, AnimatePresence } from 'framer-motion';
import { useTimer } from '@/context/TimerContext';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface NowAlertProps {
  type: 'work' | 'return';
}

export function NowAlert({ type }: NowAlertProps) {
  const { dismiss, snooze, isLongBreak } = useTimer();

  const isWork = type === 'work';

  const bgClass = isWork
    ? 'bg-gradient-to-br from-yellow-400 to-yellow-500'
    : 'bg-gradient-to-br from-blue-500 to-blue-600';

  const mainText = isWork ? 'NOW!' : 'NOW!';
  const subText = isWork
    ? isLongBreak
      ? '긴 휴식 시간이에요! 잘 했어요 🎉'
      : '쉴 시간이에요 ☕'
    : '다시 집중할 시간이에요!';

  const dismissLabel = isWork
    ? '✓  확인 (쉬러 가기)'
    : '✓  확인 (집중 시작)';
  const snoozeLabel = isWork ? '5분 더...' : '5분 더...';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${bgClass}`}
    >
      <div className="flex flex-col items-center gap-8 px-8 text-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [1, 0.85, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          className="text-9xl font-black tracking-tight text-white drop-shadow-lg"
          style={{ fontFamily: 'inherit', letterSpacing: '-0.02em' }}
        >
          {mainText}
        </motion.div>

        <p className="text-2xl font-semibold text-white/90">{subText}</p>

        <div className="flex items-center gap-1 px-4 py-2 bg-white/20 rounded-full">
          <span className="text-sm text-white/80 font-medium">
            ♪ 알림음 재생 중
          </span>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={dismiss}
            className="w-full py-4 px-6 bg-white text-gray-900 font-bold text-lg rounded-2xl shadow-lg active:scale-95 transition-transform"
          >
            {dismissLabel}
          </button>
          <button
            onClick={snooze}
            className="w-full py-3 px-6 bg-white/20 text-white font-semibold text-base rounded-2xl border border-white/30 active:scale-95 transition-transform"
          >
            {snoozeLabel}
          </button>
        </div>

        <p className="text-sm text-white/60">
          무시하면 점점 더 강한 알림이 울려요
        </p>
      </div>
    </motion.div>
  );
}

export function BreakTimerBar({ remainingSeconds, totalSeconds }: { remainingSeconds: number; totalSeconds: number }) {
  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;
  return (
    <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-400 transition-all duration-1000"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
