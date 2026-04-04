import { motion, AnimatePresence } from 'framer-motion';
import { useTimer } from '@/context/TimerContext';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface LevelConfig {
  bg: string;
  accent: string;
  badge: string;
  badgeText: string;
  label: string;
  pulse: string;
}

function getLevelConfig(level: number): LevelConfig {
  if (level <= 1) {
    return {
      bg: 'bg-gradient-to-br from-yellow-400 to-yellow-500',
      accent: 'text-yellow-900',
      badge: 'bg-yellow-300 border-yellow-200',
      badgeText: 'text-yellow-900',
      label: '첫 번째 알림',
      pulse: 'animate-[now-pulse_1.4s_ease-in-out_infinite]',
    };
  }
  if (level === 2) {
    return {
      bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
      accent: 'text-orange-100',
      badge: 'bg-orange-400 border-orange-300',
      badgeText: 'text-white',
      label: '무시 중... 계속 울릴게요',
      pulse: 'animate-[now-pulse_0.9s_ease-in-out_infinite]',
    };
  }
  return {
    bg: 'bg-gradient-to-br from-red-600 to-red-700',
    accent: 'text-red-100',
    badge: 'bg-red-500 border-red-400',
    badgeText: 'text-white',
    label: '지금 당장요!!',
    pulse: 'animate-[now-flash_0.5s_ease-in-out_infinite]',
  };
}

interface NowAlertProps {
  type: 'work' | 'return';
}

export function NowAlert({ type }: NowAlertProps) {
  const { dismiss, snooze, isLongBreak, ignoreLevel, devMode } = useTimer();
  const level = Math.max(1, ignoreLevel);
  const cfg = getLevelConfig(level);

  const isWork = type === 'work';
  const subText = isWork
    ? isLongBreak
      ? '긴 휴식 시간이에요!'
      : '쉴 시간이에요'
    : '다시 집중할 시간이에요!';

  const dismissLabel = isWork ? '확인 (쉬러 가기)' : '확인 (집중 시작)';
  const snoozeLabel = devMode ? '5초 더...' : '5분 더...';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${cfg.bg}`}
    >
      <div className="flex flex-col items-center gap-6 px-8 text-center w-full max-w-sm">

        {/* Level badge */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${cfg.badge}`}>
          <span className={`text-sm font-black tracking-widest uppercase ${cfg.badgeText}`}>
            Lv.{level}
          </span>
          <span className={`text-sm font-medium ${cfg.badgeText} opacity-80`}>
            {cfg.label}
          </span>
        </div>

        {/* NOW! */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [1, 0.85, 1] }}
          transition={{
            duration: level >= 3 ? 0.5 : level === 2 ? 0.8 : 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-9xl font-black tracking-tight text-white drop-shadow-lg leading-none"
        >
          NOW!
        </motion.div>

        <p className="text-xl font-semibold text-white/90">{subText}</p>

        {/* Ignore counter log */}
        <div className="w-full bg-black/20 rounded-2xl p-3 space-y-1">
          <p className="text-xs font-bold text-white/50 uppercase tracking-widest text-left">
            무시 로그
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {Array.from({ length: Math.min(level, 10) }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 min-w-4 rounded-full transition-all ${
                  i === level - 1
                    ? 'bg-white animate-pulse'
                    : 'bg-white/50'
                }`}
              />
            ))}
            {level > 10 && (
              <span className="text-white/70 text-xs font-bold">+{level - 10}</span>
            )}
          </div>
          <p className="text-right text-xs text-white/60 font-medium">
            {level}회 무시됨
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={dismiss}
            className="w-full py-4 px-6 bg-white text-gray-900 font-bold text-lg rounded-2xl shadow-lg active:scale-95 transition-transform"
          >
            ✓ {dismissLabel}
          </button>
          <button
            onClick={snooze}
            className="w-full py-3 px-6 bg-white/20 text-white font-semibold text-base rounded-2xl border border-white/30 active:scale-95 transition-transform"
          >
            {snoozeLabel}
          </button>
        </div>

        <p className="text-xs text-white/50">
          무시할수록 Lv.이 올라가요
        </p>
      </div>
    </motion.div>
  );
}

export function BreakTimerBar({
  remainingSeconds,
  totalSeconds,
}: {
  remainingSeconds: number;
  totalSeconds: number;
}) {
  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;
  return (
    <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-400 transition-all duration-500"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
