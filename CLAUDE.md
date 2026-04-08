# NOW!! Pomodoro

> 혼자 일하는 사람들을 위한 소셜 뽀모도로 타이머

## 왜 만들었나

기존 뽀모도로 앱은 "띵" 하고 알림이 한 번 울리고 끝입니다. 무시하면 그만이고, 무시하면 4시간이 그냥 지나갑니다. 사무실에서는 동료의 시선이, 독서실에서는 주변 사람들의 분위기가 강제력이 되지만 — 집에서 혼자 일하는 사람에게는 그 강제력이 0입니다.

NOW!! Pomodoro는 이 결손을 두 가지 메커니즘으로 메꿉니다.

**1. 무시할 수 없는 알림**

집중 세션이 끝나면 단호한 여성 음성이 "NOW!"라고 외칩니다. 무시하면 Lv.2로 올라가면서 프라이팬 위 토마토가 늘어나고, 배경이 노랑에서 주황으로 바뀌고, 볼륨이 커지고 알림이 반복됩니다. 계속 무시하면 Lv.3 이상으로 올라가면서 화면이 빨갛게 점멸하고, 최대 볼륨으로 루프 재생되고, 스누즈 버튼이 사라집니다. 시각·청각·인터랙션 제한이 동시에 강해지는 구조라 무시하는 것 자체가 물리적으로 불쾌해집니다.

**2. 같이 일하는 사람들의 시선**

팀원이 NOW! 알림을 무시하고 있으면 다른 팀원들의 화면에 실시간으로 표시됩니다. 깨우기 버튼을 누르면 상대방 화면에 풀스크린 알림이 뜨고, 미리 녹음해둔 본인의 목소리가 친구의 폰에서 재생됩니다. 기계음 알림은 무시할 수 있지만, 친구가 직접 "야 일해"라고 말하는 목소리는 그렇게 쉽게 무시되지 않습니다.

이건 사무실 옆자리 동료의 눈을 디지털로 재현하려는 시도입니다.

## 누구를 위한 앱인가

재택근무자, 프리랜서, 1인 작업자, 사이드 프로젝트 하는 사람들. 집중을 강제할 외부 환경이 없는 사람들. 의지력만으로 매일 집중을 유지하는 게 무리라는 걸 인정한 사람들.

학생이나 사무실 직장인은 이 앱이 필요 없을 수도 있습니다. 이미 외부 강제력이 작동하는 환경에 있기 때문입니다. NOW!! Pomodoro는 그 강제력이 없는 사람들을 위해 만들어졌습니다.

## 핵심 설계 원칙

**타이머 숫자를 숨긴다.** "아직 18분 남았네"라는 카운트다운 불안은 집중의 적입니다. 기본 화면에는 "집중 중..."이라는 텍스트와 토마토 세션 카운터, 그리고 진행 상황을 보여주는 스파게티 프로그레스 바만 있습니다. 시계를 자꾸 보게 만드는 대신 시계 자체를 없앱니다.

**무시할수록 강해진다.** 알림은 무시할 수 있어야 작동합니다. 이상한 말 같지만, 한 번 울리고 끝나는 알림은 무시당하기 위해 존재하는 거나 마찬가지입니다. NOW!! Pomodoro는 무시당했을 때 더 강해지도록 설계되어 있습니다. 사용자가 NOW!를 무시하는 횟수가 통계에 기록되고, 팀원들에게 공유되고, 자동 푸시 알림으로 외부에 알려집니다. 무시하는 비용을 의도적으로 높였습니다.

**소셜은 옵션이 아니라 핵심이다.** 혼자 쓸 수도 있지만, 이 앱의 진짜 가치는 같이 쓸 때 나옵니다. 팀원들과 같이 쓰면 집중과 휴식이 자동으로 동기화되고, 서로의 상태가 실시간으로 보이고, 깨우기와 보이스 콕으로 직접 개입할 수 있습니다. 같은 회사 재택근무자, 같은 카페에서 작업하는 프리랜서 친구, 같은 사이드 프로젝트 동료 — 어떤 조합이든 팀이 됩니다.

**토마토 세계관.** 뽀모도로(pomodoro)는 이탈리아어로 토마토라는 뜻입니다. 이 앱은 그 어원을 진지하게 받아들였습니다. 알림 화면의 프라이팬에 토마토가 쌓이고, 세션 카운터가 토마토 아이콘이고, 진행 바가 스파게티 면이고, 픽셀 아바타에 토마토 템플릿이 있습니다. 이건 단순한 테마가 아니라 에스컬레이션 메커니즘과 결합된 시각 언어입니다. 토마토가 늘어날수록 무시한 횟수가 늘어났다는 뜻이고, 그게 한눈에 보입니다.

## 주요 기능

- **5단계 에스컬레이션** — 알림을 무시할수록 시각·청각·인터랙션이 함께 강해집니다
- **단호한 여성 TTS 음성** — ElevenLabs로 녹음한 짧고 단호한 "NOW!"
- **타이머 숨김 모드** — 카운트다운 불안 없는 집중
- **실시간 팀 동기화** — SSE 기반, 팀원의 현재 상태가 즉시 반영
- **깨우기 (Poke)** — 알림 무시 중인 팀원에게 직접 알림 전송
- **보이스 콕** — 5초 음성을 미리 녹음해두면 깨우기 시 친구에게 내 목소리로 재생
- **자동 푸시 알림** — 팀원이 NOW! Lv.2 이상 무시 시 다른 팀원들에게 자동 알림
- **32x32 픽셀 아바타** — 직접 도트를 찍거나 10종 템플릿(별/토마토/강아지/고양이/곰/화분/하트/해파리)에서 선택
- **상세 통계** — 일별 작업 시간, 완료 세션, NOW! 준수율, 반응 속도
- **팀 리더보드** — 팀원별 반응 속도 순위와 변동 추적
- **멀티 팀 지원** — 여러 팀에 동시 가입, 탭으로 전환
- **방해금지 모드** — 소셜 알림만 차단, 타이머 알림은 유지

## 만든 사람들

CS 비전공 3인 팀이 자체 해커톤으로 시작했습니다. 처음 3시간 동안 모여서 와이어프레임과 핵심 아키텍처를 잡았고, 만 하루 만에 푸시 알림이 작동하는 모바일 앱까지 도달했습니다.

도구는 각자 잘하는 영역에만 썼습니다. 시각 에셋과 픽셀 아트 템플릿은 Replit으로, 코드 아키텍처와 리팩토링은 Claude Code로, 음성은 ElevenLabs로, 모바일 앱은 Expo로, 백엔드는 Railway로 배포했습니다. 각 도구의 한계를 파악하고 분업 파이프라인을 설계한 게 결과물의 차이를 만들었습니다.

---

## 기술 스택

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

## 프로젝트 구조

```
/
├── artifacts/
│   ├── api-server/                 # Express API 서버
│   │   ├── src/
│   │   │   ├── app.ts              # Express 앱 설정 (CORS, JSON, 로깅)
│   │   │   ├── index.ts            # 서버 부트스트랩 (포트 8080)
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts         # 인증 (register/login/me/voice)
│   │   │   │   ├── teams.ts        # 팀 CRUD + SSE 스트림 + 포크
│   │   │   │   ├── stats.ts        # 통계 조회 (today/week/all)
│   │   │   │   └── health.ts       # 헬스체크 (/api/healthz)
│   │   │   └── lib/
│   │   │       ├── db.ts           # PostgreSQL 커넥션 풀
│   │   │       ├── jwt.ts          # JWT 발급/검증
│   │   │       ├── teamStore.ts    # 팀/멤버 관리 (인메모리 + DB)
│   │   │       ├── userStore.ts    # 유저 계정 관리
│   │   │       ├── statsStore.ts   # 통계 집계
│   │   │       └── logger.ts       # Pino 로깅
│   │   ├── db/
│   │   │   ├── migrate.mjs         # 마이그레이션 러너 (서버 시작 전 실행)
│   │   │   └── migrations/
│   │   │       ├── 000_init.sql    # 초기 스키마 (전체 테이블)
│   │   │       ├── 001_add_voice_poke.sql
│   │   │       └── 002_add_push_token.sql
│   │   ├── Dockerfile              # 멀티스테이지 빌드 (Node 22-slim)
│   │   ├── build.mjs               # esbuild 번들러
│   │   └── package.json
│   │
│   └── now-timer-mobile/           # React Native + Expo 모바일 앱
│       ├── src/
│       │   ├── App.tsx             # 탭 네비게이터 (집중/소셜/통계/설정)
│       │   ├── screens/
│       │   │   ├── FocusScreen.tsx      # 메인 타이머 (프로그레스 바 + 토마토 카운터)
│       │   │   ├── SocialScreen.tsx     # 팀 허브 (멤버 목록 + QR + 깨우기)
│       │   │   ├── StatsScreen.tsx      # 통계 (세션/반응시간/준수율/스트릭)
│       │   │   ├── SettingsScreen.tsx   # 설정 (타이머/방해금지/아바타/음성)
│       │   │   ├── NowAlertOverlay.tsx  # NOW! 에스컬레이션 오버레이 (Lv.1~3+)
│       │   │   └── LoginScreen.tsx      # 로그인/회원가입
│       │   ├── context/
│       │   │   ├── TimerContext.tsx      # 타이머 상태 + 에스컬레이션 로직
│       │   │   ├── SocialContext.tsx     # SSE 연결 + 팀 상태 + 포크/알림
│       │   │   └── AuthContext.tsx       # JWT 인증 + 유저 프로필
│       │   ├── components/
│       │   │   ├── PixelEditor.tsx       # 32x32 픽셀 아바타 에디터
│       │   │   ├── PixelAvatar.tsx       # 픽셀 아바타 렌더러
│       │   │   ├── VoiceRecorder.tsx     # 보이스 콕 녹음/재생
│       │   │   └── pixelTemplates.ts     # 아바타 프리셋 10종
│       │   ├── hooks/
│       │   │   └── useStatsTracker.ts    # 세션 완료 시 통계 기록
│       │   └── lib/
│       │       ├── api.ts               # REST + SSE API 클라이언트
│       │       ├── sounds.ts            # 알림음 재생 (레벨별 볼륨 조절)
│       │       ├── pushNotifications.ts # Expo 푸시 알림 등록
│       │       ├── timerSettings.ts     # 설정 타입 + 기본값
│       │       ├── storage.ts           # AsyncStorage 래퍼
│       │       ├── authStorage.ts       # 인증 토큰 저장
│       │       ├── teamStorage.ts       # 팀 멤버십 저장
│       │       ├── statsStorage.ts      # 로컬 통계 저장
│       │       └── colors.ts            # 테마 색상 상수
│       ├── assets/                      # 아이콘, 이미지, 폰트, 사운드
│       ├── app.json                     # Expo 설정
│       ├── eas.json                     # EAS 빌드 프로필
│       └── package.json
│
├── lib/
│   ├── db/                         # 공유 DB 라이브러리
│   │   └── src/schema/index.ts     # Drizzle ORM 스키마 정의
│   └── api-zod/                    # 공유 API 밸리데이션 스키마
│
├── scripts/                        # 유틸리티 스크립트
├── docs/
│   └── wireframe-spec.md           # 와이어프레임 기획서
├── pnpm-workspace.yaml             # 모노레포 워크스페이스 설정
├── railway.json                    # Railway 배포 설정
└── tsconfig.base.json              # 베이스 TypeScript 설정
```

## API 엔드포인트

### 인증 (`/api/auth`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/auth/register` | 회원가입 (username 2-20자, password 6자+) |
| POST | `/auth/login` | 로그인 → JWT 토큰 반환 |
| GET | `/auth/me` | 내 프로필 조회 (Bearer 토큰) |
| POST | `/auth/link-membership` | 팀 멤버십 연결 |
| DELETE | `/auth/link-membership/:code` | 팀 멤버십 해제 |
| POST | `/auth/voice` | 보이스 콕 업로드 (base64, max 200KB) |
| GET | `/auth/voice` | 보이스 콕 다운로드 |
| DELETE | `/auth/voice` | 보이스 콕 삭제 |

### 팀 (`/api/teams`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/teams` | 팀 생성 → `{code, teamId, name}` |
| POST | `/teams/join` | 팀 참가 (코드 + 닉네임) → `{memberId, memberToken, team}` |
| GET | `/teams/:code` | 팀 데이터 조회 |
| PATCH | `/teams/:code` | 팀 이름 변경 |
| GET | `/teams/:code/stream` | SSE 실시간 스트림 (25초 하트비트) |
| PATCH | `/members/:id` | 멤버 상태 업데이트 (status, ignoreLevel, reactionMs) |
| POST | `/members/:fromId/poke/:toId` | 깨우기 (포크) 전송 |
| POST | `/members/:id/push-token` | 푸시 토큰 등록 |
| GET | `/members/:id/avatar` | 아바타 조회 |
| POST | `/members/:id/voice` | 멤버 보이스 업로드 |
| GET | `/members/:id/voice` | 멤버 보이스 다운로드 |

### 통계 (`/api/stats`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/stats/:memberId?period=today\|week\|all` | 세션/반응시간/준수율/스트릭 |

## DB 스키마

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

## NOW! 에스컬레이션 시스템

| 레벨 | 배경색 | 사운드 | 진동 | 스누즈 | UI |
|-------|--------|--------|------|--------|-----|
| Lv.1 | 노랑 | 1회 재생 | 500ms | 가능 | "첫 번째 알림" |
| Lv.2 | 주황 | 볼륨 +30% + 반복 | 200-100-400ms | 가능 | "무시하는 중..." |
| Lv.3+ | 빨강 | 최대 볼륨 루프 | 300-100-300-100-500ms | 불가능 | "지금 당장요!!" |

에스컬레이션 속도 설정: 느림(60초), 보통(30초), 빠름(15초)

## 인증 구조

- **유저 인증**: JWT (Bearer 토큰, Authorization 헤더)
- **멤버 인증**: 팀별 멤버 토큰 (X-Member-Token 헤더)
- 유저 계정 없이도 팀 참가 가능 (멤버 토큰만으로 동작)
- 유저 계정에 멤버십을 연결하면 기기 간 동기화

## 주의사항 — 건드리지 말 것

- **voice_poke 컬럼은 SELECT에서 제외** — 바이너리 데이터가 크므로 목록 조회에 포함하면 SSE가 터짐. 반드시 별도 엔드포인트(`GET /members/:id/voice`)로 lazy fetch
- **SSE broadcast는 type별로 분리** — avatar 변경 시 전체 멤버 객체를 보내지 말 것. `{ type: 'avatar', memberId, data }` 형태로 delta만 전송
- **Expo Go에서는 반드시 `--tunnel` 모드** — 로컬 모드(`npx expo start`)는 네트워크 환경에 따라 타임아웃 발생. `npx expo start -c --tunnel` 사용
- **npm install은 `--legacy-peer-deps` 필수** — lucide-react-native가 React ^18을 요구하지만 프로젝트는 React 19. 플래그 없으면 설치 실패
- **pnpm-lock.yaml 변경 후 Railway 배포 확인** — Railway는 `--frozen-lockfile`로 설치하므로 새 패키지 추가 시 반드시 lockfile 커밋

## 현재 진행 중 / TODO

- [ ] Apple Developer 승인 대기 중 — TestFlight/EAS 빌드 미수행 (2026-04 기준)
- [ ] 사진→도트 아바타 변환 품질 지속 개선 중 (72색 팔레트 + Lab 색공간 + Floyd-Steinberg 디더링)
- [ ] NumberInput 드래그 기능 점검 필요 (PanResponder 기반, 동작 미확인)
- [ ] RLS 미적용 상태 — 프로덕션 전 Supabase RLS 활성화 필요 (현재 OFF)

## 환경변수

| 변수 | 위치 | 용도 |
|------|------|------|
| `DATABASE_URL` | API 서버 (Railway) | PostgreSQL 연결 문자열 |
| `JWT_SECRET` | API 서버 (Railway) | JWT 토큰 서명 키 |
| `EXPO_PROJECT_ID` | 모바일 앱 (app.json) | Expo 푸시 알림 프로젝트 식별 |
| `API_URL` | 모바일 앱 (lib/api.ts) | 프로덕션 API 서버 주소 |

## 개발 환경

```bash
pnpm install                          # 의존성 설치

# API 서버
cd artifacts/api-server && pnpm dev   # 로컬 서버 (포트 8080)

# 모바일 앱
cd artifacts/now-timer-mobile
npx expo start -c --tunnel            # Expo 개발 서버 (반드시 tunnel 모드)
```

- `DATABASE_URL` 환경변수 필요 (PostgreSQL)
- API 서버 URL: 프로덕션 `https://workspaceapi-server-production-1679.up.railway.app`
- 모바일 앱은 Expo Go 또는 EAS 빌드로 실행

## 배포

- **백엔드**: Railway (Docker, 자동 배포, 헬스체크 `/api/healthz`)
- **모바일**: EAS Build (development/preview/production 프로필)
  - Apple Developer 승인 대기 중 (2026-04 기준)

---

이 문서는 작업 진행에 따라 업데이트됩니다.
