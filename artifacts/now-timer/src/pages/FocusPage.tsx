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
    <svg viewBox="0 0 40 44" className="w-8 h-9">
      {/* Stem */}
      <path d="M16 8 Q18 2 20 8 Q22 2 24 8" fill={filled ? '#3D7A3D' : '#9ca38a'} />
      <path d="M14 10 Q16 5 18 10" fill={filled ? '#4A8F4A' : '#a8b098'} />
      <path d="M22 10 Q24 5 26 10" fill={filled ? '#4A8F4A' : '#a8b098'} />
      {/* Body */}
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
  const accentColor = devMode ? '#f59e0b' : '#E8652D';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10" preserveAspectRatio="none">
      {/* Background wave */}
      <path
        d={`M0 20 Q${width * 0.15} 5 ${width * 0.25} 20 Q${width * 0.35} 35 ${width * 0.5} 20 Q${width * 0.65} 5 ${width * 0.75} 20 Q${width * 0.85} 35 ${width} 20`}
        fill="none"
        stroke="#c8b8a0"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Filled wave */}
      <clipPath id="wave-clip">
        <rect x="0" y="0" width={filledWidth} height={height} />
      </clipPath>
      <path
        d={`M0 20 Q${width * 0.15} 5 ${width * 0.25} 20 Q${width * 0.35} 35 ${width * 0.5} 20 Q${width * 0.65} 5 ${width * 0.75} 20 Q${width * 0.85} 35 ${width} 20`}
        fill="none"
        stroke={accentColor}
        strokeWidth="8"
        strokeLinecap="round"
        clipPath="url(#wave-clip)"
      />
    </svg>
  );
}

function TomatoVineDecor({ side }: { side: 'left' | 'right' }) {
  if (side === 'left') {
    return (
      <svg viewBox="0 0 300 120" className="absolute top-0 left-0 w-64 h-auto opacity-60 pointer-events-none">
        <path d="M-10 50 Q40 20 80 35 Q120 50 160 30 Q200 10 250 25 Q290 40 320 20" fill="none" stroke="#3D7A3D" strokeWidth="4" />
        <circle cx="30" cy="55" r="22" fill="#E8652D" />
        <circle cx="30" cy="53" r="19" fill="#F07040" />
        <path d="M24 33 Q27 25 30 33 Q33 25 36 33" fill="#3D7A3D" />
        <circle cx="90" cy="40" r="26" fill="#E8652D" />
        <circle cx="90" cy="38" r="23" fill="#F07040" />
        <path d="M83 15 Q87 5 91 15 Q95 5 99 15" fill="#3D7A3D" />
        <circle cx="165" cy="32" r="18" fill="#E8652D" />
        <circle cx="165" cy="31" r="15" fill="#F07040" />
        <path d="M160 16 Q163 10 166 16 Q169 10 172 16" fill="#3D7A3D" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 250 130" className="absolute top-0 right-0 w-52 h-auto opacity-60 pointer-events-none">
      <path d="M-10 40 Q30 60 70 35 Q110 10 150 30 Q190 50 230 25 Q260 10 280 20" fill="none" stroke="#3D7A3D" strokeWidth="4" />
      <circle cx="80" cy="35" r="24" fill="#E8652D" />
      <circle cx="80" cy="33" r="21" fill="#F07040" />
      <path d="M74 12 Q77 4 80 12 Q83 4 86 12" fill="#3D7A3D" />
      <circle cx="155" cy="32" r="20" fill="#E8652D" />
      <circle cx="155" cy="30" r="17" fill="#F07040" />
      <path d="M150 13 Q153 6 156 13 Q159 6 162 13" fill="#3D7A3D" />
      <circle cx="220" cy="28" r="16" fill="#E8652D" />
      <circle cx="220" cy="27" r="14" fill="#F07040" />
      <path d="M216 13 Q218 7 220 13 Q222 7 224 13" fill="#3D7A3D" />
    </svg>
  );
}

export function FocusPage() {
  const {
    phase,
    sessionCount,
    progress,
    remainingSeconds,
    totalSeconds,
    settings,
    isLongBreak,
    devMode,
    start,
    stop,
    updateSettings,
  } = useTimer();

  const isIdle = phase === 'idle';
  const isFocusing = phase === 'focusing';
  const isBreaking = phase === 'breaking';
  const isNowAlert = phase === 'nowAlert';
  const isReturnAlert = phase === 'returnAlert';

  const showTimer = !settings.hideTimer;

  const phaseLabel = isBreaking
    ? isLongBreak
      ? '긴 휴식 중...'
      : '휴식 중...'
    : isFocusing
    ? '집중 중...'
    : '준비됨';

  const phaseColor = isBreaking
    ? 'text-green-700'
    : isFocusing
    ? 'text-foreground'
    : 'text-muted-foreground';

  return (
    <div className="min-h-screen flex flex-col items-center pb-20 lg:pb-8 bg-background relative overflow-hidden">
      {/* Decorative tomato vines */}
      <TomatoVineDecor side="left" />
      <TomatoVineDecor side="right" />

      <div className="w-full max-w-md lg:max-w-xl flex flex-col min-h-screen relative z-10">
        {/* Top bar */}
        <div className="relative flex flex-col items-center px-5 pt-16 pb-2">
          <button
            onClick={() => updateSettings({ hideTimer: !settings.hideTimer })}
            className="absolute right-5 top-16 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={showTimer ? '타이머 숨기기' : '타이머 보기'}
          >
            {showTimer ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          {devMode && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-300">
              <FlaskConical size={11} />
              DEV
            </span>
          )}
        </div>

        {/* Main focus zone */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          {/* Phase label */}
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-3xl lg:text-4xl font-bold tracking-tight ${phaseColor}`}
          >
            {phaseLabel}
          </motion.div>

          {/* Timer display */}
          <AnimatePresence>
            {showTimer && (isFocusing || isBreaking) && (
              <motion.div
                key="timer"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-6xl lg:text-7xl font-mono font-light tabular-nums text-muted-foreground"
              >
                {formatTime(remainingSeconds)}
              </motion.div>
            )}
          </AnimatePresence>

          {devMode && (isFocusing || isBreaking) && !showTimer && (
            <div className="text-5xl font-mono font-light tabular-nums text-amber-500">
              {formatTime(remainingSeconds)}
            </div>
          )}

          {/* Break timer bar */}
          {isBreaking && (
            <div className="w-full">
              <p className="text-center text-sm text-muted-foreground mb-3">
                남은 휴식 시간
              </p>
              <BreakTimerBar
                remainingSeconds={remainingSeconds}
                totalSeconds={totalSeconds}
              />
            </div>
          )}

          {/* Wavy Progress bar (focus/idle) */}
          {(isFocusing || isIdle) && (
            <div className="w-full space-y-2">
              <WavyProgress progress={progress} devMode={devMode} />
              {settings.hideTimer && !devMode && isFocusing && (
                <p className="text-xs text-center text-muted-foreground">
                  타이머 숨김 ON — 남은 시간 표시 없음
                </p>
              )}
              {devMode && (
                <p className="text-xs text-center text-amber-600 font-medium">
                  Dev 모드 · 5초 사이클
                </p>
              )}
            </div>
          )}

          {/* Idle hint */}
          {isIdle && (
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              시작 버튼을 눌러{' '}
              {devMode ? '5초' : `${settings.workDuration}분`} 집중 세션을
              시작하세요.
            </p>
          )}
        </div>

        {/* Bottom info + action */}
        <div className="px-6 pb-6 space-y-4">
          {/* Tomato session dots */}
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: settings.longBreakInterval }).map((_, i) => (
              <TomatoIcon
                key={i}
                filled={i < sessionCount % settings.longBreakInterval}
                devMode={devMode}
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            세션 {sessionCount}회 완료
            {sessionCount > 0 &&
              ` · ${settings.longBreakInterval - (sessionCount % settings.longBreakInterval)}회 후 긴 휴식`}
          </p>

          {/* Circular action buttons */}
          <div className="flex justify-center gap-4">
            {isIdle ? (
              <button
                onClick={start}
                className={`w-20 h-20 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform ${
                  devMode
                    ? 'bg-amber-500'
                    : 'bg-accent'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 ml-1" fill="white">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </button>
            ) : (
              <button
                onClick={stop}
                className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform bg-card border-2 border-border"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#E8652D">
                  <rect x="5" y="5" width="14" height="14" rx="2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* NOW! Overlay */}
      <AnimatePresence>
        {isNowAlert && <NowAlert type="work" />}
        {isReturnAlert && <NowAlert type="return" />}
      </AnimatePresence>
    </div>
  );
}
