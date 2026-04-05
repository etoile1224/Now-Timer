import { useState, useEffect, useMemo } from 'react';
import { useTimer } from '@/context/TimerContext';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';
import { previewSound } from '@/lib/sounds';
import { api } from '@/lib/api';
import { PixelEditor, createEmptyGrid } from '@/components/PixelEditor';
import { PixelAvatar } from '@/components/PixelAvatar';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { Eye, EyeOff, Volume2, Check, FlaskConical, Play, Bell, BellOff, LogOut } from 'lucide-react';

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
        <span className="text-sm text-muted-foreground w-6">{unit}</span>
      </div>
    </div>
  );
}

const ESCALATION_OPTIONS = [
  { value: 'slow', label: '느림', description: '60초 / 2분' },
  { value: 'normal', label: '보통', description: '30초 / 1분' },
  { value: 'fast', label: '빠름', description: '15초 / 30초' },
] as const;

function NotificationSection() {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied',
  );

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
  }, []);

  const request = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  if (!('Notification' in window)) return null;

  return (
    <section className="bg-card rounded-2xl p-4 mb-4 shadow-sm border border-border">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        브라우저 알림
      </h2>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {permission === 'granted' ? (
            <Bell size={18} className="text-primary" />
          ) : (
            <BellOff size={18} className="text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              Lv.3 알림
            </p>
            <p className="text-xs text-muted-foreground">
              {permission === 'granted'
                ? '브라우저 탭이 백그라운드에 있어도 NOW! Lv.3 알림을 받아요'
                : '브라우저 탭이 백그라운드일 때 Lv.3 알림 수신'}
            </p>
          </div>
        </div>
        {permission === 'granted' ? (
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
            활성화됨
          </span>
        ) : permission === 'denied' ? (
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
            차단됨
          </span>
        ) : (
          <button
            onClick={request}
            className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
          >
            허용하기
          </button>
        )}
      </div>
    </section>
  );
}

function AccountSection() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <section className="bg-card rounded-2xl p-4 mb-4 shadow-sm border border-border">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        계정
      </h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{user.username}</p>
          <p className="text-xs text-muted-foreground mt-0.5">로그인됨</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 transition-colors py-1.5 px-3 rounded-lg hover:bg-red-50"
        >
          <LogOut size={13} />
          로그아웃
        </button>
      </div>
    </section>
  );
}

const AVATAR_STORAGE_KEY = 'now-timer-avatar';
const VOICE_STORAGE_KEY = 'now-timer-voice';

function AvatarSection() {
  const { user } = useAuth();
  const { memberships, activeTeamCode, memberId } = useSocial();
  const activeMembership = memberships.find((m) => m.code === activeTeamCode);

  const [avatarGrid, setAvatarGrid] = useState<(string | null)[][]>(() => {
    try {
      const saved = localStorage.getItem(AVATAR_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return createEmptyGrid();
  });

  const handleChange = (grid: (string | null)[][]) => {
    setAvatarGrid(grid);
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(grid));
    // Sync to server if in a team
    if (memberId && activeMembership) {
      api.updateAvatar(memberId, JSON.stringify(grid), activeMembership.token).catch(() => {});
    }
  };

  return (
    <section className="bg-card rounded-2xl p-4 mb-4 shadow-sm border border-border">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        프로필 아바타
      </h2>
      <div className="flex items-center gap-3 mb-4">
        <PixelAvatar data={avatarGrid} size={48} fallbackLetter={user?.username} />
        <div>
          <p className="text-sm font-semibold text-foreground">{user?.username}</p>
          <p className="text-xs text-muted-foreground">16x16 픽셀 아트로 나만의 아바타를 만들어 보세요</p>
        </div>
      </div>
      <PixelEditor value={avatarGrid} onChange={handleChange} />
    </section>
  );
}

function VoicePokeSection() {
  const { memberships, activeTeamCode, memberId } = useSocial();
  const activeMembership = memberships.find((m) => m.code === activeTeamCode);

  const [voiceBase64, setVoiceBase64] = useState<string | null>(() => {
    return localStorage.getItem(VOICE_STORAGE_KEY);
  });

  const handleSave = (base64: string) => {
    setVoiceBase64(base64);
    localStorage.setItem(VOICE_STORAGE_KEY, base64);
    if (memberId && activeMembership) {
      api.uploadVoice(memberId, base64, activeMembership.token).catch(() => {});
    }
  };

  const handleDelete = () => {
    setVoiceBase64(null);
    localStorage.removeItem(VOICE_STORAGE_KEY);
    if (memberId && activeMembership) {
      api.uploadVoice(memberId, '', activeMembership.token).catch(() => {});
    }
  };

  return (
    <section className="bg-card rounded-2xl p-4 mb-4 shadow-sm border border-border">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        보이스 포크
      </h2>
      <VoiceRecorder audioBase64={voiceBase64} onSave={handleSave} onDelete={handleDelete} />
    </section>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, devMode, toggleDevMode } = useTimer();

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <div className="max-w-md lg:max-w-3xl mx-auto px-5 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-foreground">설정</h1>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground bg-muted">
            <Check size={12} />
            자동 저장
          </span>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        <div>

        {/* DEV MODE */}
        <section
          className={`rounded-2xl p-4 mb-4 shadow-sm border transition-colors ${
            devMode
              ? 'bg-amber-50 border-amber-300'
              : 'bg-card border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FlaskConical
                size={18}
                className={devMode ? 'text-amber-600' : 'text-muted-foreground'}
              />
              <div>
                <p className={`text-sm font-bold ${devMode ? 'text-amber-700' : 'text-foreground'}`}>
                  Dev 모드
                </p>
                <p className="text-xs text-muted-foreground">
                  {devMode
                    ? '모든 구간 5초 · 에스컬레이션 5초'
                    : '테스트용 초고속 타이머 (작업/휴식/에스컬레이션 모두 5초)'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDevMode}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                devMode ? 'bg-amber-500' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  devMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {devMode && (
            <div className="mt-3 flex flex-wrap gap-2">
              {['작업 5초', '휴식 5초', '에스컬레이션 5초', '스누즈 5초'].map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-semibold rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Timer section */}
        <section className={`bg-card rounded-2xl p-4 mb-4 shadow-sm border border-border ${devMode ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            타이머
            {devMode && <span className="ml-2 text-amber-600 normal-case">(Dev 모드 중 비활성)</span>}
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
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            알림음
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            레벨이 올라갈수록 같은 소리가 더 크고 자주 반복됩니다
          </p>

          {/* Ember sound — single option with level previews */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-muted/50 mb-4">
            <Volume2 size={16} className="text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">에너지 보이스</p>
              <p className="text-xs text-muted-foreground">Ember AI · 레벨별 강도 자동 조절</p>
            </div>
          </div>

          {/* Level previews */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {([1, 2, 3] as const).map((lv) => {
              const colors = [
                'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
                'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
                'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
              ];
              const descs = ['1회 재생', '볼륨 + 반복', '루프 재생'];
              return (
                <button
                  key={lv}
                  onClick={() => previewSound('ember', settings.soundVolume, lv)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-center transition-all active:scale-95 ${colors[lv - 1]}`}
                >
                  <div className="flex items-center gap-1">
                    <Play size={11} />
                    <span className="text-xs font-bold">Lv.{lv}</span>
                  </div>
                  <span className="text-[10px] leading-tight">{descs[lv - 1]}</span>
                </button>
              );
            })}
          </div>

          {/* Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">기본 볼륨</span>
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
            <p className="text-xs text-muted-foreground">
              Lv.2는 +30%, Lv.3는 최대 볼륨으로 자동 조절됩니다
            </p>
          </div>
        </section>

        {/* Profile Avatar section */}
        <AvatarSection />

        {/* Voice Poke section */}
        <VoicePokeSection />

        {/* Escalation section */}
        <section className={`bg-card rounded-2xl p-4 mb-4 shadow-sm border border-border ${devMode ? 'opacity-50 pointer-events-none' : ''}`}>
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

        </div>

        <div>

        {/* Browser Notifications */}
        <NotificationSection />

        {/* Account */}
        <AccountSection />

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
      </div>
    </div>
  );
}
