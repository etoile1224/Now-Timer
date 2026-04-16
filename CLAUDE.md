# NOW!! Pomodoro

> 혼자 일하는 사람들을 위한 소셜 뽀모도로 타이머

---

## 1. 필수 원칙

### 1-1. 토큰 효율 규칙
- **파일 경로를 알려주기** — 내가 파일 찾느라 토큰 쓰는 거 방지
- **테이블명 명시** — DB 스키마가 이 문서에 있으니 이름만 알려주면 됨
- **읽기/수정 구분** — "여기서 수정 가능"이라고 안 하면 읽기 전용으로 만듦
- **참고 파일 지정** — 스타일 맞추려고 여러 파일 탐색하는 거 방지
- **컴포넌트 분리 요청** — 안 하면 한 파일에 다 넣을 수 있음
- 불필요한 파일 탐색/grep 최소화. 이미 알고 있는 정보 재탐색 금지

### 1-2. Devlog 자동 기록
- `docs/devlog-ko.md` (한국어) + `docs/devlog-en.md` (영어)
- **매 기능 추가, 버그 픽스, 리팩토링마다 필수 기록**
- 형식: `## YYYY-MM-DD — 커밋 메시지` + 변경 파일 + 핵심 요약 (2-3줄)
- 커밋 해시 포함

### 1-3. Fullstack 문서
- `docs/fullstack-ko.md` (한국어) + `docs/fullstack-en.md` (영어)
- 테이블 형태로 프론트엔드 ↔ 백엔드 ↔ DB 전체 스택 매핑
- 변동 시 업데이트

### 1-4. 터미널 명령어 규칙
- **항상 `cd /Users/saebyolkim/Downloads/Time-Tracker-Viz/.claude/worktrees/vibrant-fermi/...` 풀 경로로 시작**
- 상대 경로 금지

### 1-5. 피드백 로드맵 추적
- 로드맵 문서: `docs/feedback-roadmap.md`
- 작업 시작 전: 해당 Phase "작업 항목" 확인, 범위 재확인
- Phase 진행 중: 체크박스 `[ ]` → `[x]` 실시간 업데이트
- Phase 완료 시: 완료일자, 변경 파일, 구현 요약, 커밋 해시 기록
- Phase 단위 커밋. 작은 수정 따로 커밋 금지

### 1-6. 구조 트리 동기화
- 아래 "프로젝트 구조" 섹션을 파일 추가/삭제/이동 시 **즉시 업데이트**

---

## 2. 프로젝트 개요

CS 비전공 3인 팀이 자체 해커톤으로 시작. 첫 3시간 와이어프레임 + 아키텍처 → 24시간 만에 푸시 알림 동작하는 모바일 앱 완성.

**핵심 메커니즘**:
1. **무시할 수 없는 알림** — Lv1(노랑) → Lv2(주황, 볼륨+반복) → Lv3+(빨강, 최대볼륨, 스누즈 제거)
2. **소셜 강제력** — 팀원 화면에 무시 상태 실시간 표시 + 깨우기(Poke) + 보이스 콕

---

## 3. 기술 스택

| 영역 | 기술 |
|------|------|
| 모바일 앱 | React Native 0.81 + Expo 54 + TypeScript |
| 백엔드 API | Express 5 + Node 22 + TypeScript |
| 데이터베이스 | PostgreSQL (Drizzle ORM) |
| 실시간 통신 | SSE (Server-Sent Events) |
| 푸시 알림 | Expo Notifications |
| 음성 | expo-av (녹음/재생) |
| TTS | ElevenLabs (NOW! 음성) |
| 모바일 빌드 | EAS (Expo Application Services) |
| 백엔드 배포 | Railway (Docker, Node 22-slim) |
| 패키지 매니저 | pnpm 10 (모노레포 워크스페이스) |

---

## 4. 프로젝트 구조

```
/
├── CLAUDE.md                           # 이 문서
├── pnpm-workspace.yaml                 # 모노레포 설정
├── tsconfig.base.json
├── railway.json                        # Railway 배포 설정
├── railpack.toml
│
├── artifacts/
│   ├── api-server/                     # ── Express API 서버 ──
│   │   ├── src/
│   │   │   ├── app.ts                  # Express 앱 (CORS, JSON, 로깅)
│   │   │   ├── index.ts                # 서버 부트스트랩 (포트 8080)
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts             # 인증 (register/login/me/voice)
│   │   │   │   ├── teams.ts            # 팀 CRUD + SSE + 포크
│   │   │   │   ├── stats.ts            # 통계 (today/week/all)
│   │   │   │   ├── health.ts           # 헬스체크 (/api/healthz)
│   │   │   │   └── image.ts            # 사진→도트 변환 API
│   │   │   └── lib/
│   │   │       ├── db.ts               # PostgreSQL 커넥션 풀
│   │   │       ├── jwt.ts              # JWT 발급/검증
│   │   │       ├── teamStore.ts        # 팀/멤버 관리
│   │   │       ├── userStore.ts        # 유저 계정 관리
│   │   │       ├── statsStore.ts       # 통계 집계
│   │   │       └── logger.ts           # Pino 로깅
│   │   ├── db/
│   │   │   ├── migrate.mjs             # 마이그레이션 러너
│   │   │   └── migrations/
│   │   │       ├── 000_init.sql
│   │   │       ├── 001_add_voice_poke.sql
│   │   │       └── 002_add_push_token.sql
│   │   ├── Dockerfile
│   │   ├── build.mjs                   # esbuild 번들러
│   │   └── package.json
│   │
│   └── now-timer-mobile/               # ── React Native + Expo 모바일 앱 ──
│       ├── src/
│       │   ├── App.tsx                  # 탭 네비게이터 (집중/소셜/통계/설정)
│       │   ├── screens/
│       │   │   ├── FocusScreen.tsx      # 메인 타이머 (프로그레스 바 + 토마토)
│       │   │   ├── SocialScreen.tsx     # 팀 허브 (멤버 목록 + QR + 깨우기)
│       │   │   ├── StatsScreen.tsx      # 통계 (세션/반응시간/준수율/스트릭)
│       │   │   ├── SettingsScreen.tsx   # 설정 (타이머/방해금지/아바타/음성)
│       │   │   ├── NowAlertOverlay.tsx  # NOW! 에스컬레이션 오버레이
│       │   │   └── LoginScreen.tsx      # 로그인/회원가입
│       │   ├── context/
│       │   │   ├── TimerContext.tsx      # 타이머 상태 + 에스컬레이션 + 백그라운드 알림 예약
│       │   │   ├── SocialContext.tsx     # SSE 연결 + 팀 상태 + 포크/알림
│       │   │   └── AuthContext.tsx       # JWT 인증 + 유저 프로필
│       │   ├── components/
│       │   │   ├── PixelEditor.tsx       # 32x32 픽셀 아바타 에디터 (undo + pan + zoom)
│       │   │   ├── PixelAvatar.tsx       # 픽셀 아바타 렌더러
│       │   │   ├── SocialToasts.tsx      # PokeToast + PeerAlertToast
│       │   │   ├── NumberInput.tsx       # 드래그 숫자 입력
│       │   │   ├── VoiceRecorder.tsx     # 보이스 콕 녹음/재생
│       │   │   └── pixelTemplates.ts     # 아바타 프리셋 10종
│       │   ├── hooks/
│       │   │   └── useStatsTracker.ts    # 세션 완료 시 통계 기록
│       │   └── lib/
│       │       ├── api.ts               # REST + SSE API 클라이언트
│       │       ├── sounds.ts            # 알림음 재생 (레벨별 볼륨)
│       │       ├── pushNotifications.ts # 푸시 등록 + 로컬 알림 스케줄링
│       │       ├── timerSettings.ts     # 설정 타입 + 기본값
│       │       ├── storage.ts           # AsyncStorage 래퍼
│       │       ├── authStorage.ts       # 인증 토큰 저장
│       │       ├── teamStorage.ts       # 팀 멤버십 저장
│       │       ├── statsStorage.ts      # 로컬 통계 저장
│       │       ├── constants.ts         # 공유 상수 (토마토 이미지, 진동 패턴)
│       │       ├── colors.ts            # 테마 색상
│       │       └── i18n.ts              # 한국어/영어 번역
│       ├── assets/                      # 아이콘, 이미지, 폰트, 사운드
│       ├── app.json                     # Expo 설정
│       ├── eas.json                     # EAS 빌드 프로필
│       ├── babel.config.js
│       ├── .npmrc                       # legacy-peer-deps=true
│       └── package.json
│
├── lib/
│   ├── db/                              # 공유 DB 라이브러리
│   │   └── src/schema/index.ts          # Drizzle ORM 스키마
│   └── api-zod/                         # 공유 API 밸리데이션
│
├── docs/
│   ├── wireframe-spec.md                # 와이어프레임 기획서
│   ├── feedback-roadmap.md              # 피드백 로드맵 (Phase 1~6)
│   ├── devlog-ko.md                     # 개발 로그 (한국어)
│   ├── devlog-en.md                     # 개발 로그 (영어)
│   ├── fullstack-ko.md                  # 풀스택 매핑 (한국어)
│   └── fullstack-en.md                  # 풀스택 매핑 (영어)
│
├── scripts/                             # 유틸리티 스크립트
└── screenshots/                         # 앱 스크린샷 (01~07)
```

---

## 5. API 엔드포인트

### 인증 (`/api/auth`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/auth/register` | 회원가입 (username 2-20자, password 6자+) |
| POST | `/auth/login` | 로그인 → JWT |
| GET | `/auth/me` | 내 프로필 |
| POST | `/auth/link-membership` | 팀 멤버십 연결 |
| DELETE | `/auth/link-membership/:code` | 멤버십 해제 |
| POST | `/auth/voice` | 보이스 콕 업로드 (base64, max 200KB) |
| GET | `/auth/voice` | 보이스 콕 다운로드 |
| DELETE | `/auth/voice` | 보이스 콕 삭제 |

### 팀 (`/api/teams`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/teams` | 팀 생성 |
| POST | `/teams/join` | 팀 참가 (코드 + 닉네임) |
| GET | `/teams/:code` | 팀 조회 |
| PATCH | `/teams/:code` | 팀 이름 변경 |
| GET | `/teams/:code/stream` | SSE 실시간 스트림 (25초 하트비트) |
| PATCH | `/members/:id` | 멤버 상태 업데이트 |
| POST | `/members/:fromId/poke/:toId` | 깨우기 전송 |
| POST | `/members/:id/push-token` | 푸시 토큰 등록 |
| GET | `/members/:id/avatar` | 아바타 조회 |
| POST | `/members/:id/voice` | 멤버 보이스 업로드 |
| GET | `/members/:id/voice` | 멤버 보이스 다운로드 |

### 통계 (`/api/stats`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/stats/:memberId?period=today\|week\|all` | 세션/반응시간/준수율/스트릭 |

---

## 6. DB 스키마

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|-----------|
| `users` | 유저 계정 | id, username, passwordHash |
| `userMemberships` | 유저-팀 연결 | userId, code, memberId, nickname, token |
| `teams` | 팀 | id, code (UNIQUE), name |
| `teamMembers` | 팀 멤버 | id, teamCode, nickname, status, ignoreLevel, avgReactionMs, avatarData |
| `memberTokens` | 멤버 인증 토큰 | token (PK), memberId |
| `memberSessions` | 세션 기록 | memberId, date, type (focus/break), completedAt |
| `memberReactions` | NOW! 반응 기록 | memberId, date, reactionMs, dismissed |
| `dailyCompliance` | 일별 준수율 | memberId, date, alerts, dismissed |

---

## 7. NOW! 에스컬레이션

| 레벨 | 배경색 | 사운드 | 진동 | 스누즈 |
|-------|--------|--------|------|--------|
| Lv.1 | 노랑 | 1회 재생 | 500ms | 가능 |
| Lv.2 | 주황 | 볼륨 +30% + 반복 | 200-100-400ms | 가능 |
| Lv.3+ | 빨강 | 최대 볼륨 루프 | 300-100-300-100-500ms | 불가 |

에스컬레이션 속도: 느림(60초) / 보통(30초) / 빠름(15초)

---

## 8. 인증 구조

- **유저 인증**: JWT (Bearer, Authorization 헤더)
- **멤버 인증**: 팀별 멤버 토큰 (X-Member-Token 헤더)
- 유저 계정 없이도 팀 참가 가능 (멤버 토큰만으로 동작)
- 유저 계정에 멤버십 연결 시 기기 간 동기화

---

## 9. 주의사항 — 건드리지 말 것

- **voice_poke 컬럼은 SELECT에서 제외** — 바이너리가 크므로 목록 조회에 포함하면 SSE가 터짐. 별도 엔드포인트(`GET /members/:id/voice`)로 lazy fetch
- **SSE broadcast는 type별로 분리** — `{ type: 'avatar', memberId, data }` 형태로 delta만 전송
- **Expo Go에서는 반드시 `--tunnel` 모드** — `npx expo start -c --tunnel`
- **pnpm-lock.yaml 변경 후 Railway 배포 확인** — Railway는 `--frozen-lockfile`

---

## 10. 환경변수

| 변수 | 위치 | 용도 |
|------|------|------|
| `DATABASE_URL` | API 서버 (Railway) | PostgreSQL 연결 |
| `JWT_SECRET` | API 서버 (Railway) | JWT 서명 키 |
| `EXPO_PROJECT_ID` | 모바일 앱 (app.json) | Expo 푸시 프로젝트 ID |
| `API_URL` | 모바일 앱 (lib/api.ts) | 프로덕션 API 주소 |

---

## 11. 개발 환경

```bash
cd /Users/saebyolkim/Downloads/Time-Tracker-Viz/.claude/worktrees/vibrant-fermi && pnpm install

# API 서버
cd /Users/saebyolkim/Downloads/Time-Tracker-Viz/.claude/worktrees/vibrant-fermi/artifacts/api-server && pnpm dev

# 모바일 앱
cd /Users/saebyolkim/Downloads/Time-Tracker-Viz/.claude/worktrees/vibrant-fermi/artifacts/now-timer-mobile && npx expo start -c --tunnel
```

- API 서버: 프로덕션 `https://workspaceapi-server-production-1679.up.railway.app`
- `.npmrc`에 `legacy-peer-deps=true` (lucide-react-native가 React ^18 요구, 프로젝트는 React 19)

---

## 12. 배포

- **백엔드**: Railway (Docker, 자동 배포, `/api/healthz`)
- **모바일**: EAS Build — internal (Ad Hoc) 배포
  - `cd /Users/saebyolkim/Downloads/Time-Tracker-Viz/.claude/worktrees/vibrant-fermi/artifacts/now-timer-mobile && eas build --profile preview --platform ios`
  - Apple Developer 승인 완료 (2026-04)

---

## 13. 현재 TODO

- [ ] 사진→도트 아바타 변환 품질 개선 중 (72색 팔레트 + Lab + Floyd-Steinberg)
- [ ] NumberInput 드래그 동작 점검 (PanResponder 기반)
- [ ] RLS 미적용 — 프로덕션 전 활성화 필요
- [ ] 피드백 로드맵 Phase 3~6 진행 중 (`docs/feedback-roadmap.md` 참조)

---

## 14. 관련 문서

| 문서 | 위치 | 내용 |
|------|------|------|
| 피드백 로드맵 | `docs/feedback-roadmap.md` | Phase 1~6 작업 항목 + 완료 기록 |
| 와이어프레임 | `docs/wireframe-spec.md` | 초기 기획서 |
| 개발 로그 (한) | `docs/devlog-ko.md` | 기능/버그 변경 이력 |
| 개발 로그 (영) | `docs/devlog-en.md` | Development changelog |
| 풀스택 매핑 (한) | `docs/fullstack-ko.md` | 프론트↔백↔DB 매핑 |
| 풀스택 매핑 (영) | `docs/fullstack-en.md` | Frontend↔Backend↔DB mapping |
