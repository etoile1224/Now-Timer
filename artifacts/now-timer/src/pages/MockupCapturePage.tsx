import { useRoute } from 'wouter';

interface LevelConfig {
  bgClass: string;
  badgeBg: string;
  badgeText: string;
  label: string;
  nowText: string;
  showSnooze: boolean;
  subText: string;
  footerText: string;
  bigTextClass: string;
  dismissColor: string;
}

function getLv(level: number): LevelConfig {
  if (level === 1) return {
    bgClass: 'bg-gradient-to-br from-yellow-400 to-yellow-500',
    badgeBg: 'bg-yellow-300/80 border-yellow-200',
    badgeText: 'text-yellow-900',
    label: '첫 번째 알림',
    nowText: 'NOW!',
    showSnooze: true,
    subText: '쉴 시간이에요',
    footerText: '무시할수록 Lv.이 올라가요',
    bigTextClass: 'now-pulse text-8xl',
    dismissColor: 'text-gray-900',
  };
  if (level === 2) return {
    bgClass: 'bg-gradient-to-br from-orange-500 to-orange-600',
    badgeBg: 'bg-orange-400/80 border-orange-300',
    badgeText: 'text-white',
    label: '무시하는 중...',
    nowText: 'NOW!!',
    showSnooze: true,
    subText: '쉴 시간이에요',
    footerText: '무시할수록 Lv.이 올라가요',
    bigTextClass: 'now-pulse text-8xl',
    dismissColor: 'text-gray-900',
  };
  return {
    bgClass: 'bg-red-600',
    badgeBg: 'bg-red-500/80 border-red-300',
    badgeText: 'text-white',
    label: '지금 당장요!!',
    nowText: 'NOW!!!!!!!',
    showSnooze: false,
    subText: '쉴 시간이에요',
    footerText: '스누즈 불가 — 지금 바로 확인하세요!',
    bigTextClass: 'text-[5.5rem]',
    dismissColor: 'text-red-700',
  };
}

function AlertMockup({ level }: { level: number }) {
  const lv = getLv(level);
  const barColor = level === 1 ? 'bg-yellow-300' : level === 2 ? 'bg-orange-300' : 'bg-red-300';

  return (
    <div className={`relative flex flex-col items-center justify-center ${lv.bgClass} w-[375px] h-[812px] shrink-0`}>
      <div className="flex flex-col items-center gap-5 px-8 text-center w-full max-w-sm">
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${lv.badgeBg}`}>
          <span className={`text-sm font-black tracking-widest ${lv.badgeText}`}>Lv.{level}</span>
          <span className={`text-sm font-medium ${lv.badgeText} opacity-80`}>{lv.label}</span>
        </div>

        <div className={`font-black tracking-tight text-white drop-shadow-lg leading-none select-none ${lv.bigTextClass}`}>
          {lv.nowText}
        </div>

        <p className="text-xl font-semibold text-white/90">{lv.subText}</p>

        <div className="w-full space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/50 font-medium">무시 로그</span>
            <span className="text-xs text-white/60 font-bold">{level}회</span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: level }).map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i === level - 1 ? barColor : 'bg-white/40'}`} />
            ))}
            {Array.from({ length: Math.max(0, 3 - level) }).map((_, i) => (
              <div key={`empty-${i}`} className="h-2 flex-1 rounded-full bg-white/20" />
            ))}
          </div>
          {level < 3 && (
            <>
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-white/60 rounded-full" style={{ width: '60%' }} />
              </div>
              <p className="text-right text-xs text-white/40">18초 후 Lv.{level + 1}</p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full mt-1">
          <button className={`w-full py-4 px-6 bg-white font-bold text-lg rounded-2xl shadow-lg ${lv.dismissColor}`}>
            ✓ 확인 — 쉬러 갈게요
          </button>
          {lv.showSnooze && (
            <button className="w-full py-3 px-6 bg-white/20 text-white font-semibold text-base rounded-2xl border border-white/30">
              5분 더...
            </button>
          )}
        </div>

        <p className={`text-xs ${level >= 3 ? 'text-white/60 font-semibold' : 'text-white/45'}`}>
          {lv.footerText}
        </p>
      </div>
    </div>
  );
}

function BreakMockup() {
  return (
    <div className="relative flex flex-col bg-background w-[375px] h-[812px] shrink-0">
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-lg font-bold">NOW! Timer</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-400 rounded-full" style={{ width: '45%' }} />
        </div>
        <p className="text-4xl font-bold text-foreground">휴식 중...</p>
        <p className="text-muted-foreground text-sm">짧은 휴식 — 타이머 숨김 ON</p>
      </div>
      <div className="pb-2 px-6 text-center text-sm text-muted-foreground">세션 1회 완료</div>
      <div className="h-16 border-t border-border flex items-center justify-around px-4">
        {['몰입','소셜','통계','설정'].map(l => (
          <div key={l} className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 bg-muted rounded" />
            <span className="text-xs text-muted-foreground">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MockupCapturePage() {
  const [, params] = useRoute('/capture/:lv');
  const lv = Number(params?.lv ?? '1');

  if (lv === 0) return <BreakMockup />;
  return <AlertMockup level={lv} />;
}
