import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, FlaskConical } from 'lucide-react';
import { NowAlert, BreakTimerBar } from '@/components/NowAlert';
import { useTimer } from '@/context/TimerContext';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TomatoIcon({ filled, devMode }: { filled: boolean; devMode: boolean }) {
  const baseColor = devMode ? '#f59e0b' : '#E8652D';
  const highlightColor = devMode ? '#fbbf24' : '#F07040';
  const emptyColor = '#d4c5b0';
  const emptyHighlight = '#e0d5c4';

  return (
    <svg viewBox="0 0 40 44" className="w-10 h-11">
      <path d="M16 8 Q18 2 20 8 Q22 2 24 8" fill={filled ? '#3D7A3D' : '#9ca38a'} />
      <path d="M14 10 Q16 5 18 10" fill={filled ? '#4A8F4A' : '#a8b098'} />
      <path d="M22 10 Q24 5 26 10" fill={filled ? '#4A8F4A' : '#a8b098'} />
      <circle cx="20" cy="26" r="16" fill={filled ? baseColor : emptyColor} />
      <circle cx="20" cy="25" r="14" fill={filled ? highlightColor : emptyHighlight} />
      {filled && <ellipse cx="15" cy="21" rx="5" ry="4" fill="white" opacity="0.2" />}
    </svg>
  );
}

function WavyProgress({ progress, devMode }: { progress: number; devMode: boolean }) {
  const width = 280;
  const height = 40;
  const filledWidth = width * progress;
  const accentColor = devMode ? '#f59e0b' : '#facc15';
  const emptyColor = '#b8b0a0';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12" preserveAspectRatio="none">
      <clipPath id="wave-clip">
        <rect x="0" y="0" width={filledWidth} height={height} />
      </clipPath>
      <clipPath id="wave-clip-empty">
        <rect x={filledWidth} y="0" width={width - filledWidth} height={height} />
      </clipPath>
      <path
        d={`M0 20 Q${width * 0.12} 5 ${width * 0.25} 20 Q${width * 0.38} 35 ${width * 0.5} 20 Q${width * 0.62} 5 ${width * 0.75} 20 Q${width * 0.88} 35 ${width} 20`}
        fill="none" stroke={accentColor} strokeWidth="10" strokeLinecap="round"
        clipPath="url(#wave-clip)"
      />
      <path
        d={`M0 20 Q${width * 0.12} 5 ${width * 0.25} 20 Q${width * 0.38} 35 ${width * 0.5} 20 Q${width * 0.62} 5 ${width * 0.75} 20 Q${width * 0.88} 35 ${width} 20`}
        fill="none" stroke={emptyColor} strokeWidth="10" strokeLinecap="round"
        clipPath="url(#wave-clip-empty)"
      />
    </svg>
  );
}

export function FocusPage() {
  const {
    phase, sessionCount, progress, remainingSeconds, totalSeconds,
    settings, isLongBreak, devMode, start, stop, updateSettings,
  } = useTimer();

  const isIdle = phase === 'idle';
  const isFocusing = phase === 'focusing';
  const isBreaking = phase === 'breaking';
  const isNowAlert = phase === 'nowAlert';
  const isReturnAlert = phase === 'returnAlert';
  const showTimer = !settings.hideTimer;

  return (
    <div className="flex flex-col bg-background" style={{ height: 'calc(100dvh - 67px)' }}>
      {/* Eye toggle — top right */}
      <div className="flex justify-end px-4 pt-3 pb-0 shrink-0">
        <button
          onClick={() => updateSettings({ hideTimer: !settings.hideTimer })}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {showTimer ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      </div>

      {/* Main content — centered vertically */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
        {/* Dev badge */}
        {devMode && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-300">
            <FlaskConical size={11} /> DEV
          </span>
        )}

        {/* Timer display */}
        <AnimatePresence>
          {showTimer && (isFocusing || isBreaking) && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-5xl font-mono font-light tabular-nums text-muted-foreground"
            >
              {formatTime(remainingSeconds)}
            </motion.div>
          )}
        </AnimatePresence>

        {devMode && (isFocusing || isBreaking) && !showTimer && (
          <div className="text-4xl font-mono font-light tabular-nums text-amber-500">
            {formatTime(remainingSeconds)}
          </div>
        )}

        {/* Session text */}
        <p className="text-base font-semibold text-foreground">
          세션 {sessionCount}회 완료
        </p>

        {/* Tomato dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: settings.longBreakInterval }).map((_, i) => (
            <TomatoIcon
              key={i}
              filled={i < sessionCount % settings.longBreakInterval}
              devMode={devMode}
            />
          ))}
        </div>

        {/* Wavy progress — only during focus */}
        {isFocusing && (
          <div className="w-full max-w-xs">
            <WavyProgress progress={progress} devMode={devMode} />
            {settings.hideTimer && !devMode && (
              <p className="text-xs text-center text-muted-foreground mt-1">타이머 숨김 ON</p>
            )}
            {devMode && (
              <p className="text-xs text-center text-amber-600 font-medium mt-1">Dev 모드 · 5초 사이클</p>
            )}
          </div>
        )}

        {/* Break bar */}
        {isBreaking && (
          <div className="w-full max-w-xs">
            <p className="text-center text-sm text-muted-foreground mb-2">남은 휴식 시간</p>
            <BreakTimerBar remainingSeconds={remainingSeconds} totalSeconds={totalSeconds} />
          </div>
        )}

        {sessionCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {settings.longBreakInterval - (sessionCount % settings.longBreakInterval)}회 후 긴 휴식
          </p>
        )}

        {/* Action buttons */}
        {isIdle ? (
          <button
            onClick={start}
            className="w-20 h-20 rounded-full bg-white shadow-xl border-4 border-gray-200 flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg viewBox="0 0 24 24" className="w-9 h-9 ml-0.5" fill={devMode ? '#f59e0b' : '#E8652D'}>
              <polygon points="6,3 20,12 6,21" />
            </svg>
          </button>
        ) : (
          <button
            onClick={stop}
            className="w-16 h-16 rounded-full bg-white shadow-xl border-4 border-gray-200 flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#E8652D">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        )}
      </div>

      {/* NOW! Overlay */}
      <AnimatePresence>
        {isNowAlert && <NowAlert type="work" />}
        {isReturnAlert && <NowAlert type="return" />}
      </AnimatePresence>
    </div>
  );
}
