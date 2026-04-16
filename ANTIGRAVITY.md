# Antigravity (Gemini) 프로젝트 가이드라인

> 혼자 일하는 사람들을 위한 소셜 뽀모도로 타이머 - Antigravity AI 어시스턴트 전용 매뉴얼

---

## 1. 필수 원칙 (Antigravity 전용 규칙)

### 1-1. 효율적이고 정확한 도구 사용
- **전용 도구 우선 사용**: bash에서 `cat`, `grep`, `sed` 등을 우회적으로 사용하지 말고, 시스템에 내장된 `view_file`, `grep_search`, `replace_file_content`, `multi_replace_file_content` 도구를 적극 활용합니다.
- **절대 경로 필수**: 터미널 명령어 실행(`run_command`) 시 항상 `/Users/saebyolkim/Downloads/Time-Tracker-Viz/.claude/worktrees/vibrant-fermi/...` 풀 경로 상태로 실행하며, `$HOME` 등의 상대경로를 피합니다.
- **불필요한 탐색 지양**: 이미 이 문서(`ANTIGRAVITY.md`)나 `docs/fullstack-ko.md`에 기재된 DB 스키마나 구조를 파악하기 위해 파일을 다시 열어보지 않습니다.

### 1-2. 뚱뚱한(Fat) 파일 방지 및 컴포넌트 분리 원칙
- CLAUDE.md 규칙에서 "컴포넌트 분리 요청 — 안 하면 한 파일에 다 넣을 수 있음" 이라는 한계를 극복하기 위한 원칙입니다.
- **파일 비대화 금지**: 단일 파일(화면/컨텍스트)이 300~400줄을 초과하며 여러 역할(컴포넌트, 복잡한 로직)이 섞이기 시작하면, 독립적인 뷰 요소(예: 버튼, 모달, 리스트 아이템)나 순수 로직(훅, 헬퍼 함수)을 별개의 파일로 분리합니다.
- **모듈화**: 기존 코드를 수정할 때에도 해당 파일에 맹목적으로 코드를 덧붙이지 않고, 구조적으로 분리 가능한 컴포넌트인지 먼저 고민한 뒤 별도 파일로 추출(Extract)하여 가독성을 높이고 단일 책임 원칙(SRP)을 준수합니다.

### 1-3. Devlog 자동 기록 및 로드맵 추적
- 어떤 작업을 하든 항상 **작업 시작 전**에 `docs/feedback-roadmap.md`를 열어 진행할 Phase와 요구사항을 파악합니다.
- 작업 중 진행 상황에 맞게 `[ ]` 체크박스를 `[x]`로 실시간 업데이트합니다.
- 메이저 작업 완료 시 **반드시** Phase 단위 커밋을 진행하며, `docs/devlog-ko.md`와 `docs/devlog-en.md` 두 곳 모두에 작업 내역을 추가합니다 (형식: `## YYYY-MM-DD — 커밋 메시지` + 변경 파일 + 핵심 요약 + 커밋 해시).

### 1-4. Planning Mode & Artifact 활용 방안
- 메이저 아키텍처 변경이나 리팩토링 착수 시 코드 수정 전 `implementation_plan.md` 아티팩트를 생성해 피드백을 받습니다.
- 승인 시 `task.md` 아티팩트로 분할 실행하고, 완료되면 `walkthrough.md`를 생성해 시각적인 결과를 보고합니다.

### 1-5. 전체 스택 동기화 관리
- 테이블 형태로 정리된 프론트↔백↔DB 매핑인 `docs/fullstack-ko.md` 또는 이 문서의 테이블들을 먼저 참고합니다.

---

## 2. 프로젝트 개요 및 핵심 철학

CS 비전공 3인 팀이 해커톤으로 시작해 24시간 만에 모바일 앱 MVP를 만들어낸 "혼자 일하는 사람들을 위한 소셜 뽀모도로 타이머" 입니다.

**핵심 메커니즘**:
1. **무시할 수 없는 알림** — 시계를 숨기는 대신, 무시 레벨(Lv1, Lv2, Lv3+)이 올라가면서 시각/청각/인터랙션 제한을 극대화시켜 알람 무시 비용을 높입니다.
2. **같이 일하는 사람들의 시선 (소셜 강제력)** — 팀원의 화면에 상태가 실시간 표시되고 Voice Poke(깨우기)로 물리적 개입이 가능합니다. SSE 기반 실시간 동기화를 사용합니다.
3. **토마토 세계관** — 프라이팬에 토마토가 쌓이고 볶아지는 시각 언어를 에스컬레이션과 결합했습니다.

---

## 3. 기술 스택

| 영역 | 기술 스택 |
|------|------|
| 모바일 앱 | React Native 0.81 + Expo 54 + TypeScript |
| 백엔드 API | Express 5 + Node 22 + TypeScript |
| 데이터베이스 | PostgreSQL (Drizzle ORM) |
| 실시간 통신 | SSE (Server-Sent Events) |
| 푸시/음성/TTS | Expo Notifications / expo-av / ElevenLabs |
| 배포 및 패키지 | EAS (모바일), Railway (Docker, Node 22-slim), pnpm 10 (모노레포 워크스페이스) |

---

## 4. 프로젝트 구조

```
/
├── CLAUDE.md                           # 원본 휴먼/다른 AI 모델용 가이드
├── ANTIGRAVITY.md                      # 이 문서 (AI 엔진용 가이드)
├── pnpm-workspace.yaml                 # 모노레포 설정
├── railway.json                        # 배포 설정
│
├── artifacts/
│   ├── api-server/                     # ── 백엔드 Express API 서버 ──
│   │   ├── src/
│   │   │   ├── app.ts                  # Express 미들웨어 로드 (CORS, 로깅 등)
│   │   │   ├── routes/                 # auth.ts, teams.ts, stats.ts, health.ts, image.ts
│   │   │   └── lib/                    # jwt, db(PostgreSQL), teamStore, statsStore 저장소
│   │   └── db/migrations/              # `.sql` Drizzle 마이그레이션 모음
│   │
│   └── now-timer-mobile/               # ── 프론트엔드 Expo/React Native ──
│       ├── src/
│       │   ├── App.tsx                  # 최상위 네비게이터 (탭 라우팅)
│       │   ├── screens/                 # Focus, Social, Stats, Settings, Login, NowAlertOverlay
│       │   ├── context/                 # TimerContext, SocialContext, AuthContext (전역상태)
│       │   ├── components/              # 픽셀 에디터, Voice Recorder 등 독립적 뷰/로직 모음
│       │   └── lib/                     # api 통신, i18n 번역, 로컬 알림 헬퍼, navigation 컨트롤
│       └── app.json & eas.json          # Expo / EAS 프로필
│
├── lib/
│   ├── db/                              # 공유 DB 라이브러리 및 Drizzle 스키마
│   └── api-zod/                         # 공유 API 타입 및 검증(Zod) 계층
│
└── docs/                                # 피드백 로드맵, 개발 로그, 와이어프레임, 풀스택 매핑 문서 모음
```

---

## 5. API 핵심 엔드포인트

### 인증 (`/api/auth`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/auth/register` | 회원가입 (username 2-20자, password 6자+) |
| POST | `/auth/login` | 로그인 → JWT |
| GET | `/auth/me` | 내 프로필 |
| POST | `/auth/link-membership` | 팀 멤버십 연결 |
| POST/GET/DELETE | `/auth/voice` | 보이스 콕 업로드(max 200KB)/다운로드/삭제 |

### 팀 (`/api/teams`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/teams` | 팀 생성 |
| POST | `/teams/join` | 팀 참가 (코드 + 닉네임) |
| GET / PATCH | `/teams/:code` | 팀 조회 및 팀 이름 변경 |
| GET | `/teams/:code/stream` | SSE 실시간 스트림 (25초 하트비트) |
| PATCH | `/members/:id` | 멤버 상태 업데이트 |
| POST | `/members/:fromId/poke/:toId` | 깨우기 전송 |
| POST | `/members/:id/push-token` | 푸시 토큰 등록 |
| GET(avatar) / POST/GET(voice) | `/members/:id/...` | 멤버 아바타 및 보이스 데이터 |

### 통계 (`/api/stats`)
- `GET /stats/:memberId?period=today|week|all` : 세션/반응시간/준수율/스트릭

---

## 6. DB 스키마 구조
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

## 7. NOW! 에스컬레이션 메커니즘
| 레벨 | 배경색 | 사운드 | 진동 | 스누즈 |
|-------|--------|--------|------|--------|
| Lv.1 | 노랑 | 1회 재생 | 500ms | 가능 |
| Lv.2 | 주황 | 볼륨 +30% + 반복 | 200-100-400ms | 가능 |
| Lv.3+ | 빨강 | 최대 볼륨 루프 | 300-100-300-100-500ms | 불가 |
> 에스컬레이션 속도: 느림(60초) / 보통(30초) / 빠름(15초). 로컬 백그라운드 푸시 예약 기능과 동기화.

---

## 8. 인증 구조
- **유저 인증**: JWT (Bearer, Authorization 헤더)
- **멤버 인증**: 팀별 멤버 토큰 (`X-Member-Token` 헤더, 유저 계정 없이 참가 가능)

---

## 9. 주의사항 — 건드리지 말 것 (CRITICAL)
- **voice_poke나 avatarData 컬럼은 SELECT 제외**: 바이너리가 커 SSE나 목록 조회가 터지므로 반드시 제외하고 분리형 엔드포인트로 lazy fetch합니다.
- **SSE 브로드캐스트 분리**: 업데이트 이벤트는 `{ type: 'status' }` 등 delta만 전송합니다.
- **Expo Go 필수 터널**: `npx expo start -c --tunnel`을 강제합니다.
- **의존성 충돌**: `.npmrc`의 `legacy-peer-deps=true` 옵션을 삭제하거나 무시하지 않습니다.
- **배포 설정**: pnpm-lock 변경 후 Railway 자동배포 상태 확인을 항상 염두에 둡니다.

---

## 10. 실행 및 환경변수
- `DATABASE_URL`, `JWT_SECRET` : API 서버(Railway)
- `EXPO_PROJECT_ID`, `API_URL` : 모바일 사이드 설정
