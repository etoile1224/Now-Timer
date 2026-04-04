import { useState } from 'react';
import { useTimer } from '@/context/TimerContext';
import { previewSound, SoundType } from '@/lib/sounds';
import { Eye, EyeOff, Volume2, Check } from 'lucide-react';

interface NumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (val: number) => void;
}

function NumberInput({ label, value, min, max, unit = '분', onChange }: NumberInputProps) {
  const [raw, setRaw] = useState(String(value));

  const commit = () => {
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    } else {
      setRaw(String(value));
    }
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const next = Math.max(min, value - 1);
            onChange(next);
            setRaw(String(next));
          }}
          className="w-8 h-8 rounded-lg bg-muted text-foreground font-bold text-lg flex items-center justify-center active:scale-95 transition-transform hover:bg-muted/70"
        >
          −
        </button>
        <input
          type="number"
          value={raw}
          min={min}
          max={max}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          className="w-14 text-center text-sm font-semibold bg-muted rounded-lg py-1.5 border-0 outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={() => {
            const next = Math.min(max, value + 1);
            onChange(next);
            setRaw(String(next));
          }}
          className="w-8 h-8 rounded-lg bg-muted text-foreground font-bold text-lg flex items-center justify-center active:scale-95 transition-transform hover:bg-muted/70"
        >
          +
        </button>
        <span className="text-sm text-muted-foreground w-4">{unit}</span>
      </div>
    </div>
  );
}

const SOUND_OPTIONS: { value: SoundType; label: string; description: string }[] = [
  { value: 'bell', label: '벨', description: '맑은 종소리' },
  { value: 'chime', label: '차임', description: '경쾌한 차임' },
  { value: 'soft', label: '부드러운', description: '잔잔한 알림음' },
];

const ESCALATION_OPTIONS = [
  { value: 'slow', label: '느림', description: '60초 / 2분' },
  { value: 'normal', label: '보통', description: '30초 / 1분' },
  { value: 'fast', label: '빠름', description: '15초 / 30초' },
] as const;

export function SettingsPage() {
  const { settings, updateSettings } = useTimer();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-5 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-foreground">설정</h1>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? 'bg-green-100 text-green-700'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {saved && <Check size={14} />}
            {saved ? '저장됨' : '저장'}
          </button>
        </div>

        {/* Timer section */}
        <section className="bg-card rounded-2xl p-4 mb-4 shadow-sm border border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            타이머
          </h2>
          <NumberInput
            label="작업 시간"
            value={settings.workDuration}
            min={1}
            max={120}
            onChange={(v) => updateSettings({ workDuration: v })}
          />
          <NumberInput
            label="짧은 휴식"
            value={settings.shortBreakDuration}
            min={1}
            max={30}
            onChange={(v) => updateSettings({ shortBreakDuration: v })}
          />
          <NumberInput
            label="긴 휴식"
            value={settings.longBreakDuration}
            min={5}
            max={60}
            onChange={(v) => updateSettings({ longBreakDuration: v })}
          />
          <NumberInput
            label="긴 휴식 주기"
            value={settings.longBreakInterval}
            min={2}
            max={8}
            unit="세션"
            onChange={(v) => updateSettings({ longBreakInterval: v })}
          />
        </section>

        {/* Display section */}
        <section className="bg-card rounded-2xl p-4 mb-4 shadow-sm border border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            화면
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.hideTimer ? (
                <EyeOff size={18} className="text-muted-foreground" />
              ) : (
                <Eye size={18} className="text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">타이머 숨기기</p>
                <p className="text-xs text-muted-foreground">
                  {settings.hideTimer
                    ? '숫자 없이 집중 모드 (권장)'
                    : '남은 시간이 화면에 표시됨'}
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ hideTimer: !settings.hideTimer })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.hideTimer ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.hideTimer ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Sound section */}
        <section className="bg-card rounded-2xl p-4 mb-4 shadow-sm border border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            알림음
          </h2>
          <div className="space-y-2">
            {SOUND_OPTIONS.map(({ value, label, description }) => (
              <button
                key={value}
                onClick={() => {
                  updateSettings({ soundType: value });
                  previewSound(value, settings.soundVolume);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  settings.soundType === value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Volume2 size={16} />
                  <div className="text-left">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
                {settings.soundType === value && (
                  <Check size={16} className="text-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Volume */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">볼륨</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.soundVolume}
              onChange={(e) => updateSettings({ soundVolume: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        </section>

        {/* Escalation section */}
        <section className="bg-card rounded-2xl p-4 mb-4 shadow-sm border border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            에스컬레이션 속도
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            NOW!를 무시할 때 Lv.2 → Lv.3으로 전환되는 속도
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ESCALATION_OPTIONS.map(({ value, label, description }) => (
              <button
                key={value}
                onClick={() => updateSettings({ escalationSpeed: value })}
                className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                  settings.escalationSpeed === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <span
                  className={`text-sm font-semibold ${
                    settings.escalationSpeed === value
                      ? 'text-primary'
                      : 'text-foreground'
                  }`}
                >
                  {label}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* About */}
        <section className="bg-card rounded-2xl p-4 mb-4 shadow-sm border border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            앱 정보
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">NOW! Timer</strong>는 타이머 숫자를 숨겨
            카운트다운 불안을 줄이고, 세션이 끝나면 강렬한 <strong>NOW!</strong> 신호로
            전환을 알려주는 포커스 타이머예요.
          </p>
        </section>
      </div>
    </div>
  );
}
