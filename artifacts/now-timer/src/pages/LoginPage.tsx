import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

type Mode = 'login' | 'register';

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
    } catch (err) {
      setError((err as Error).message ?? '오류가 발생했어요');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel — desktop only */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 bg-foreground text-background px-12">
        <div className="text-6xl font-black tracking-tight mb-4">NOW!</div>
        <div className="text-lg font-medium opacity-70 mb-8">팀과 함께 집중해요</div>
        <ul className="space-y-3 text-sm opacity-60 max-w-xs text-center leading-relaxed">
          <li>⏱ 포모도로 타이머로 깊은 집중</li>
          <li>👥 팀원들과 NOW! 사이클 공유</li>
          <li>👊 재촉 알림으로 서로 책임감</li>
        </ul>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:hidden">
            <div className="text-4xl font-black tracking-tight text-foreground mb-1">NOW!</div>
            <div className="text-sm text-muted-foreground">팀과 함께 집중해요</div>
          </div>

          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              {mode === 'login' ? '로그인' : '회원가입'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'login' ? '계정에 로그인하세요' : '새 계정을 만드세요'}
            </p>
          </div>

          <div className="flex rounded-xl bg-muted p-1 mb-6">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                {m === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">아이디</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="2~20자"
                autoComplete={mode === 'login' ? 'username' : 'new-username'}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '6자 이상' : ''}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                required
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-red-500 text-center py-1"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-foreground text-background font-semibold text-sm mt-1 disabled:opacity-50 transition-opacity"
            >
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '시작하기'}
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
              className="underline font-medium"
            >
              {mode === 'login' ? '회원가입' : '로그인'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
