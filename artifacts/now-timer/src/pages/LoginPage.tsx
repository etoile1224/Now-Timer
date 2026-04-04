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
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' }}
      >
        {/* Decorative pasta lines */}
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-full w-1 bg-yellow-300 rounded-full"
              style={{
                left: `${8 + i * 5}%`,
                transform: `rotate(${-5 + i * 2}deg)`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="text-6xl font-black text-white drop-shadow-lg mb-2"
            style={{ fontFamily: "'Permanent Marker', cursive, sans-serif", textShadow: '3px 3px 0 rgba(0,0,0,0.2)' }}
          >
            NOW!!
          </div>

          {/* Tomato illustration */}
          <div className="relative w-72 h-72 mt-4">
            {/* Pan */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-gray-400 shadow-xl" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full bg-gray-300" />
            {/* Tomatoes in pan */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
              {/* Big tomato */}
              <circle cx="95" cy="110" r="45" fill="#E8652D" />
              <circle cx="95" cy="108" r="42" fill="#F07040" />
              <ellipse cx="85" cy="100" rx="12" ry="8" fill="#F09070" opacity="0.4" />
              {/* Stem */}
              <path d="M85 68 Q90 58 95 68 Q100 58 105 68" fill="#3D7A3D" strokeWidth="2" />
              <path d="M80 72 Q85 62 90 72" fill="#4A8F4A" />
              <path d="M100 72 Q105 62 110 72" fill="#4A8F4A" />
              {/* Small tomato */}
              <circle cx="140" cy="90" r="32" fill="#E8652D" />
              <circle cx="140" cy="88" r="30" fill="#F07040" />
              <ellipse cx="132" cy="82" rx="8" ry="6" fill="#F09070" opacity="0.4" />
              <path d="M132 58 Q137 48 140 58 Q143 48 148 58" fill="#3D7A3D" />
              <path d="M130 62 Q134 54 138 62" fill="#4A8F4A" />
              {/* Another tomato */}
              <circle cx="60" cy="130" r="30" fill="#E8652D" />
              <circle cx="60" cy="128" r="28" fill="#F07040" />
              <path d="M52 100 Q57 90 60 100 Q63 90 68 100" fill="#3D7A3D" />
            </svg>
            {/* Pan handle */}
            <div className="absolute -bottom-2 -right-8 w-24 h-6 bg-amber-800 rounded-r-full transform rotate-12 shadow-md" />
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <TomatoVine />
            <div className="text-4xl font-black text-accent mt-4"
              style={{ fontFamily: "'Permanent Marker', cursive, sans-serif" }}
            >
              NOW!!
            </div>
            <div className="text-sm text-muted-foreground mt-1">팀과 함께 집중해요</div>
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
                    ? 'bg-card text-foreground shadow-sm'
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
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm mt-1 disabled:opacity-50 transition-opacity shadow-md"
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

function TomatoVine() {
  return (
    <svg viewBox="0 0 200 60" className="w-48 h-auto">
      {/* Vine */}
      <path d="M10 30 Q50 10 100 25 Q150 40 190 20" fill="none" stroke="#3D7A3D" strokeWidth="3" />
      {/* Tomato 1 */}
      <circle cx="35" cy="35" r="16" fill="#E8652D" />
      <circle cx="35" cy="34" r="14" fill="#F07040" />
      <path d="M30 19 Q33 13 36 19 Q39 13 42 19" fill="#3D7A3D" />
      {/* Tomato 2 */}
      <circle cx="80" cy="28" r="14" fill="#E8652D" />
      <circle cx="80" cy="27" r="12" fill="#F07040" />
      <path d="M76 15 Q78 10 80 15 Q82 10 84 15" fill="#3D7A3D" />
      {/* Tomato 3 */}
      <circle cx="120" cy="32" r="12" fill="#E8652D" />
      <circle cx="120" cy="31" r="10" fill="#F07040" />
      <path d="M116 21 Q118 16 120 21 Q122 16 124 21" fill="#3D7A3D" />
      {/* Tomato 4 */}
      <circle cx="160" cy="24" r="13" fill="#E8652D" />
      <circle cx="160" cy="23" r="11" fill="#F07040" />
      <path d="M156 12 Q158 7 160 12 Q162 7 164 12" fill="#3D7A3D" />
    </svg>
  );
}
