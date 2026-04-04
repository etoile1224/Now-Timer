import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTimer } from '@/context/TimerContext';

interface LevelConfig {
  label: string;
  nowText: string;
  showSnooze: boolean;
}

function getLv(level: number): LevelConfig {
  if (level <= 1) {
    return { label: '첫 번째 알림', nowText: 'NOW!', showSnooze: true };
  }
  if (level === 2) {
    return { label: '무시하는 중...', nowText: 'NOW!!', showSnooze: true };
  }
  return { label: '지금 당장요!!', nowText: 'NOW!!!!!!!', showSnooze: false };
}

function levelBg(level: number): string {
  if (level <= 1) return 'linear-gradient(135deg, #f5a623 0%, #e8852d 100%)';
  if (level === 2) return 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)';
  return 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)';
}

function levelBadgeColors(level: number) {
  if (level <= 1) return { bg: 'bg-yellow-300/80 border-yellow-200', text: 'text-yellow-900' };
  if (level === 2) return { bg: 'bg-orange-400/80 border-orange-300', text: 'text-white' };
  return { bg: 'bg-red-500/80 border-red-300', text: 'text-white' };
}

function PastaStripes({ intensity }: { intensity: number }) {
  const count = 8 + intensity * 2;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${-5 + i * (100 / count)}%`,
            top: '-10%',
            width: `${6 + intensity}px`,
            height: '130%',
            background: `linear-gradient(180deg, rgba(255,205,60,${0.25 + intensity * 0.05}), rgba(255,180,30,${0.12 + intensity * 0.03}))`,
            borderRadius: '4px',
            transform: `rotate(${-12 + i * 2.5}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function TomatoPanIllustration({ level }: { level: number }) {
  const scale = level >= 3 ? 1.15 : level === 2 ? 1.05 : 1;
  return (
    <svg
      viewBox="0 0 400 380"
      className="w-72 h-auto drop-shadow-2xl"
      style={{ transform: `scale(${scale})`, transition: 'transform 0.5s ease' }}
    >
      {/* Pan handle */}
      <rect x="5" y="280" width="110" height="22" rx="11" fill="#C05621" transform="rotate(-30, 60, 291)" />
      <rect x="8" y="283" width="104" height="16" rx="8" fill="#DD6B20" transform="rotate(-30, 60, 291)" />

      {/* Pan body */}
      <ellipse cx="220" cy="240" rx="150" ry="120" fill="#8A8F96" />
      <ellipse cx="220" cy="236" rx="142" ry="113" fill="#A0A5AD" />
      <ellipse cx="220" cy="233" rx="134" ry="106" fill="#B8BDC5" />

      {/* Tomato 1 - large, front-left */}
      <ellipse cx="175" cy="235" rx="62" ry="56" fill="#D0472A" />
      <ellipse cx="175" cy="231" rx="60" ry="54" fill="#E05535" />
      <ellipse cx="175" cy="228" rx="58" ry="52" fill="#E8653D" />
      <ellipse cx="158" cy="214" rx="12" ry="16" fill="rgba(255,255,255,0.12)" transform="rotate(-15,158,214)" />
      {/* Stem 1 */}
      <path d="M162 176 Q168 158 175 174 Q182 158 188 176" fill="#2D6B28" />
      <path d="M156 182 Q162 166 168 180" fill="#3D8035" />
      <path d="M182 182 Q188 166 194 180" fill="#3D8035" />
      <line x1="175" y1="174" x2="176" y2="158" stroke="#1F5420" strokeWidth="4" strokeLinecap="round" />

      {/* Tomato 2 - right */}
      <ellipse cx="280" cy="225" rx="54" ry="50" fill="#D0472A" />
      <ellipse cx="280" cy="222" rx="52" ry="48" fill="#E05535" />
      <ellipse cx="280" cy="220" rx="50" ry="46" fill="#E8653D" />
      <ellipse cx="266" cy="207" rx="10" ry="14" fill="rgba(255,255,255,0.12)" transform="rotate(-10,266,207)" />
      {/* Stem 2 */}
      <path d="M270 172 Q275 156 280 172 Q285 156 290 172" fill="#2D6B28" />
      <path d="M266 178 Q272 164 278 178" fill="#3D8035" />
      <line x1="280" y1="172" x2="281" y2="156" stroke="#1F5420" strokeWidth="3.5" strokeLinecap="round" />

      {/* Tomato 3 - back center */}
      <ellipse cx="230" cy="200" rx="48" ry="44" fill="#B8401E" />
      <ellipse cx="230" cy="197" rx="46" ry="42" fill="#D0472A" />
      <ellipse cx="230" cy="195" rx="44" ry="40" fill="#E05535" />
      {/* Stem 3 */}
      <path d="M222 155 Q226 140 230 155 Q234 140 238 155" fill="#2D6B28" />
      <path d="M218 160 Q224 148 228 160" fill="#3D8035" />
      <line x1="230" y1="155" x2="230" y2="140" stroke="#1F5420" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function EscalationBar({
  remainingSeconds,
  totalSeconds,
  level,
}: {
  remainingSeconds: number;
  totalSeconds: number;
  level: number;
}) {
  const barColor =
    level <= 1 ? 'bg-yellow-300' : level === 2 ? 'bg-orange-300' : 'bg-red-300';

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/50 font-medium">무시 로그</span>
        <span className="text-xs text-white/60 font-bold">{level}회</span>
      </div>
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
      {level < 3 && totalSeconds > 0 && (
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-white/60 rounded-full transition-all duration-1000"
            style={{ width: `${(remainingSeconds / totalSeconds) * 100}%` }}
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

interface NowAlertProps {
  type: 'work' | 'return';
}

export function NowAlert({ type }: NowAlertProps) {
  const { dismiss, snooze, isLongBreak, ignoreLevel, devMode, remainingSeconds, totalSeconds } =
    useTimer();
  const prefersReducedMotion = useReducedMotion();

  const level = Math.max(1, ignoreLevel);
  const lv = getLv(level);
  const badge = levelBadgeColors(level);

  const isWork = type === 'work';
  const prevLevelRef = useRef(level);

  useEffect(() => {
    const prev = prevLevelRef.current;
    prevLevelRef.current = level;
    if (prev >= 3 || level < 3) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const body = isWork ? '쉴 시간이에요! 지금 당장 확인하세요!' : '집중할 시간이에요! 지금 당장 돌아오세요!';
    const n = new Notification('NOW!!!', { body, tag: 'now-timer-lv3' });
    return () => n.close();
  }, [level, isWork]);

  const subText = isWork
    ? isLongBreak
      ? '긴 휴식 시간이에요!'
      : '쉴 시간이에요'
    : '다시 집중할 시간이에요!';

  const dismissLabel = isWork ? '확인 — 쉬러 갈게요' : '확인 — 집중 시작';
  const snoozeLabel = devMode ? '5초 더...' : '5분 더...';

  const shakeX = prefersReducedMotion ? 0 : [-8, 8, -8, 8, -5, 5, -3, 3, 0];

  return (
    <motion.div
      key={`alert-lv${level}`}
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        x: level === 2 ? shakeX : 0,
      }}
      transition={
        level === 2 && !prefersReducedMotion
          ? {
              opacity: { duration: 0.2 },
              x: { duration: 0.55, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' },
            }
          : { duration: 0.25 }
      }
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between py-8 ${
        level >= 3 ? 'lv3-bg-flash' : ''
      }`}
      style={level < 3 ? { background: levelBg(level) } : undefined}
    >
      {/* Pasta stripe background */}
      <PastaStripes intensity={level} />

      {/* Top section: NOW!! text */}
      <div className="relative z-10 flex flex-col items-center pt-4">
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${badge.bg} mb-4`}>
          <span className={`text-sm font-black tracking-widest ${badge.text}`}>
            Lv.{level}
          </span>
          <span className={`text-sm font-medium ${badge.text} opacity-80`}>
            {lv.label}
          </span>
        </div>

        <div
          className={`font-black tracking-tight text-white leading-none select-none ${
            level >= 3 ? 'lv3-text-flash text-7xl' : 'now-pulse text-7xl'
          }`}
          style={{
            textShadow: '3px 3px 0 rgba(0,0,0,0.2), -1px -1px 0 rgba(255,255,255,0.3)',
            fontFamily: "'Impact', 'Arial Black', sans-serif",
            WebkitTextStroke: '1.5px rgba(255,255,255,0.25)',
          }}
        >
          {lv.nowText}
        </div>
      </div>

      {/* Center: Tomato pan illustration */}
      <div className="relative z-10 flex-shrink-0">
        <TomatoPanIllustration level={level} />
      </div>

      {/* Bottom section: buttons */}
      <div className="relative z-10 flex flex-col items-center gap-3 w-full max-w-sm px-8">
        <p className="text-lg font-semibold text-white/90 mb-1">{subText}</p>

        <EscalationBar
          remainingSeconds={remainingSeconds}
          totalSeconds={totalSeconds}
          level={level}
        />

        <button
          onClick={dismiss}
          className={`w-full py-4 px-6 font-bold text-lg rounded-2xl shadow-lg active:scale-95 transition-transform ${
            level >= 3
              ? 'bg-white text-red-700'
              : 'bg-white text-gray-900'
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
