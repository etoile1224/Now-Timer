import { motion, AnimatePresence } from 'framer-motion';
import { useTimer } from '@/context/TimerContext';

/* ─── Level configurations ─────────────────────────────────────────────────── */

interface LevelConfig {
  bgClass: string;         // CSS class for background
  badgeBg: string;
  badgeText: string;
  label: string;
  nowText: string;         // "NOW!" / "NOW!!" / "NOW!!!!!!!"
  nowClass: string;        // text animation class
  subSize: string;
  showSnooze: boolean;
}

function getLv(level: number): LevelConfig {
  if (level <= 1) {
    return {
      bgClass: 'bg-gradient-to-br from-yellow-400 to-yellow-500',
      badgeBg: 'bg-yellow-300/80 border-yellow-200',
      badgeText: 'text-yellow-900',
      label: '첫 번째 알림',
      nowText: 'NOW!',
      nowClass: 'now-pulse',
      subSize: 'text-xl',
      showSnooze: true,
    };
  }
  if (level === 2) {
    return {
      bgClass: 'bg-gradient-to-br from-orange-500 to-orange-600',
      badgeBg: 'bg-orange-400/80 border-orange-300',
      badgeText: 'text-white',
      label: '무시하는 중...',
      nowText: 'NOW!!',
      nowClass: 'now-shake',
      subSize: 'text-2xl',
      showSnooze: true,
    };
  }
  return {
    bgClass: 'lv3-bg-flash',
    badgeBg: 'bg-red-500/80 border-red-300',
    badgeText: 'text-white',
    label: '지금 당장요!!',
    nowText: 'NOW!!!!!!!',
    nowClass: 'lv3-text-flash',
    subSize: 'text-2xl',
    showSnooze: false,
  };
}

/* ─── Escalation countdown bar ─────────────────────────────────────────────── */

function EscalationBar({
  remainingSeconds,
  totalSeconds,
  level,
}: {
  remainingSeconds: number;
  totalSeconds: number;
  level: number;
}) {
  const ratio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const barColor =
    level <= 1 ? 'bg-yellow-300' : level === 2 ? 'bg-orange-300' : 'bg-red-300';

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/50 font-medium">무시 로그</span>
        <span className="text-xs text-white/60 font-bold">{level}회</span>
      </div>
      {/* Ignore level bars */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: Math.min(level, 12) }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full ${
              i === level - 1 ? `${barColor} animate-pulse` : 'bg-white/40'
            }`}
          />
        ))}
        {level > 12 && (
          <span className="text-white/60 text-xs font-bold">+{level - 12}</span>
        )}
      </div>
      {/* Escalation countdown (time until next level) */}
      {level < 3 && totalSeconds > 0 && (
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-white/60 rounded-full transition-all duration-1000"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}
      {level < 3 && totalSeconds > 0 && (
        <p className="text-right text-xs text-white/40">
          {remainingSeconds}초 후 Lv.{level + 1}
        </p>
      )}
    </div>
  );
}

/* ─── Main NowAlert ──────────────────────────────────────────────────────────── */

interface NowAlertProps {
  type: 'work' | 'return';
}

export function NowAlert({ type }: NowAlertProps) {
  const { dismiss, snooze, isLongBreak, ignoreLevel, devMode, remainingSeconds, totalSeconds } =
    useTimer();

  const level = Math.max(1, ignoreLevel);
  const lv = getLv(level);

  const isWork = type === 'work';
  const subText = isWork
    ? isLongBreak
      ? '긴 휴식 시간이에요!'
      : '쉴 시간이에요'
    : '다시 집중할 시간이에요!';

  const dismissLabel = isWork ? '확인 — 쉬러 갈게요' : '확인 — 집중 시작';
  const snoozeLabel = devMode ? '5초 더...' : '5분 더...';

  return (
    <motion.div
      key={`alert-${level}`}
      initial={{ opacity: 0, scale: level >= 3 ? 1.05 : 1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${lv.bgClass}`}
    >
      <div className="flex flex-col items-center gap-5 px-8 text-center w-full max-w-sm">

        {/* Level badge */}
        <div
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${lv.badgeBg}`}
        >
          <span className={`text-sm font-black tracking-widest ${lv.badgeText}`}>
            Lv.{level}
          </span>
          <span className={`text-sm font-medium ${lv.badgeText} opacity-80`}>
            {lv.label}
          </span>
        </div>

        {/* NOW! text */}
        <div
          className={`font-black tracking-tight text-white drop-shadow-lg leading-none select-none ${lv.nowClass} ${
            level >= 3 ? 'text-[5.5rem]' : level === 2 ? 'text-8xl' : 'text-8xl'
          }`}
        >
          {lv.nowText}
        </div>

        {/* Sub text */}
        <p className={`font-semibold text-white/90 ${lv.subSize}`}>{subText}</p>

        {/* Escalation bar */}
        <EscalationBar
          remainingSeconds={remainingSeconds}
          totalSeconds={totalSeconds}
          level={level}
        />

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full mt-1">
          <button
            onClick={dismiss}
            className={`w-full py-4 px-6 bg-white font-bold text-lg rounded-2xl shadow-lg active:scale-95 transition-transform ${
              level >= 3 ? 'text-red-700' : 'text-gray-900'
            }`}
          >
            ✓ {dismissLabel}
          </button>

          <AnimatePresence>
            {lv.showSnooze && (
              <motion.button
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                onClick={snooze}
                className="w-full py-3 px-6 bg-white/20 text-white font-semibold text-base rounded-2xl border border-white/30 active:scale-95 transition-transform"
              >
                {snoozeLabel}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {level < 3 && (
          <p className="text-xs text-white/45">무시할수록 Lv.이 올라가요</p>
        )}
        {level >= 3 && (
          <p className="text-xs text-white/60 font-semibold">스누즈 불가 — 지금 바로 확인하세요!</p>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Break progress bar ─────────────────────────────────────────────────────── */

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
        className="h-full bg-blue-400 rounded-full transition-all duration-500"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
