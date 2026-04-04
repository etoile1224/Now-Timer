import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, PlayCircle, StopCircle } from 'lucide-react';
import { NowAlert, BreakTimerBar } from '@/components/NowAlert';
import { useTimer } from '@/context/TimerContext';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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

  const toggleTimerVisibility = () => {
    updateSettings({ hideTimer: !settings.hideTimer });
  };

  const phaseLabel = isBreaking
    ? isLongBreak
      ? '긴 휴식 중...'
      : '휴식 중...'
    : isFocusing
    ? '집중 중...'
    : '준비됨';

  const phaseColor = isBreaking
    ? 'text-green-600'
    : isFocusing
    ? 'text-foreground'
    : 'text-muted-foreground';

  return (
    <div className="min-h-screen flex flex-col items-center pb-20 bg-background">
      <div className="w-full max-w-md flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            NOW! Timer
          </h1>
          <button
            onClick={toggleTimerVisibility}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={showTimer ? '타이머 숨기기' : '타이머 보기'}
          >
            {showTimer ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>

        {/* Main focus zone */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
          {/* Phase label */}
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-4xl font-bold tracking-tight ${phaseColor}`}
          >
            {phaseLabel}
          </motion.div>

          {/* Timer display (only when visible AND running) */}
          <AnimatePresence>
            {showTimer && (isFocusing || isBreaking) && (
              <motion.div
                key="timer"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-7xl font-mono font-light tabular-nums text-muted-foreground"
              >
                {formatTime(remainingSeconds)}
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Progress bar (focus/idle mode) */}
          {(isFocusing || isIdle) && (
            <div className="w-full space-y-2">
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    isFocusing
                      ? 'bg-primary progress-bar-glow'
                      : 'bg-muted-foreground/30'
                  }`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              {settings.hideTimer && (
                <p className="text-xs text-center text-muted-foreground">
                  타이머 숨김 ON — 남은 시간 표시 없음
                </p>
              )}
            </div>
          )}

          {/* Idle state hint */}
          {isIdle && (
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              시작 버튼을 눌러 {settings.workDuration}분 집중 세션을 시작하세요.
              <br />
              {settings.hideTimer
                ? '타이머는 화면에 보이지 않아요.'
                : '타이머가 화면에 표시돼요.'}
            </p>
          )}
        </div>

        {/* Bottom info area */}
        <div className="px-6 pb-6 space-y-4">
          {/* Session count */}
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: settings.longBreakInterval }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full transition-colors ${
                  i < sessionCount % settings.longBreakInterval
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            세션 {sessionCount}회 완료
            {sessionCount > 0 &&
              ` · ${settings.longBreakInterval - (sessionCount % settings.longBreakInterval)}회 후 긴 휴식`}
          </p>

          {/* Action button */}
          <div className="flex justify-center">
            {isIdle ? (
              <button
                onClick={start}
                className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-bold text-lg rounded-2xl shadow-md active:scale-95 transition-transform hover:opacity-90"
              >
                <PlayCircle size={24} />
                집중 시작
              </button>
            ) : (
              <button
                onClick={stop}
                className="flex items-center gap-2 px-6 py-3 bg-muted text-muted-foreground font-semibold text-sm rounded-xl active:scale-95 transition-transform hover:bg-muted/80"
              >
                <StopCircle size={18} />
                중지
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
