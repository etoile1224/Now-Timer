# NOW!! Pomodoro — 풀스택 매핑

> 기능별 프론트엔드 ↔ 백엔드 ↔ DB 테이블 대응표. 변동 시 업데이트.

## 화면 → API → DB

| 기능 | 모바일 화면/컨텍스트 | API 엔드포인트 | DB 테이블 | 비고 |
|------|---------------------|---------------|-----------|------|
| **로그인/회원가입** | `LoginScreen.tsx` → `AuthContext.tsx` | `POST /auth/register`, `POST /auth/login` | `users` | JWT 발급 → `authStorage.ts`에 저장 |
| **내 프로필** | `AuthContext.tsx` | `GET /auth/me` | `users`, `userMemberships` | 앱 시작 시 자동 조회 |
| **팀 생성** | `SocialScreen.tsx` | `POST /teams` | `teams` | code 자동 생성 |
| **팀 참가** | `SocialScreen.tsx` | `POST /teams/join` | `teams`, `teamMembers`, `memberTokens` | QR 코드 / 수동 입력 |
| **팀 멤버십 연결** | `AuthContext.tsx` | `POST /auth/link-membership` | `userMemberships` | 기기 간 동기화용 |
| **실시간 팀 상태** | `SocialContext.tsx` | `GET /teams/:code/stream` (SSE) | `teamMembers` | 25초 하트비트 |
| **멤버 상태 업데이트** | `SocialContext.tsx` | `PATCH /members/:id` | `teamMembers` | status, ignoreLevel, reactionMs |
| **깨우기 (Poke)** | `SocialScreen.tsx` → `SocialToasts.tsx` | `POST /members/:fromId/poke/:toId` | — | SSE로 상대방에게 전달 |
| **보이스 콕 업로드** | `VoiceRecorder.tsx` | `POST /auth/voice` | `users` (voice_data) | base64, max 200KB |
| **보이스 콕 재생** | `SocialToasts.tsx` | `GET /members/:id/voice` | `teamMembers` (voice_poke) | lazy fetch |
| **푸시 토큰 등록** | `pushNotifications.ts` | `POST /members/:id/push-token` | `teamMembers` (push_token) | Expo push token |
| **아바타 조회** | `PixelAvatar.tsx` | `GET /members/:id/avatar` | `teamMembers` (avatarData) | SSE delta broadcast |
| **아바타 편집** | `PixelEditor.tsx` | `PATCH /members/:id` (avatarData) | `teamMembers` | 32x32 grid JSON |
| **통계 조회** | `StatsScreen.tsx` | `GET /stats/:memberId` | `memberSessions`, `memberReactions`, `dailyCompliance` | period=today/week/all |
| **세션 기록** | `useStatsTracker.ts` | `PATCH /members/:id` | `memberSessions` | 세션 완료 시 자동 기록 |
| **사진→도트 변환** | `PixelEditor.tsx` | `POST /api/image/dot-avatar` | — | 서버에서 리사이즈+양자화 |
| **타이머** | `FocusScreen.tsx` → `TimerContext.tsx` | — (로컬 전용) | — | 상태는 로컬, SSE로 팀에 broadcast |
| **NOW! 알림** | `NowAlertOverlay.tsx` | — (로컬 전용) | — | 로컬 사운드+진동+오버레이 |
| **백그라운드 알림** | `TimerContext.tsx` → `pushNotifications.ts` | — (로컬 전용) | — | expo-notifications 로컬 스케줄링 |
| **헬스체크** | — | `GET /api/healthz` | — | Railway 배포 모니터링 |

## 로컬 전용 스토리지

| 저장소 | 파일 | 내용 |
|--------|------|------|
| `authStorage.ts` | AsyncStorage | JWT 토큰, 유저 ID |
| `teamStorage.ts` | AsyncStorage | 팀 멤버십 (code, memberId, token) |
| `statsStorage.ts` | AsyncStorage | 로컬 통계 캐시 (서버 동기화 전 임시) |
| `timerSettings.ts` | AsyncStorage | 타이머 설정 (작업시간, 휴식시간, 에스컬레이션 속도) |
| `storage.ts` | AsyncStorage | 범용 KV 래퍼 |

## 공유 라이브러리

| 패키지 | 위치 | 사용처 |
|--------|------|--------|
| `@now/db` | `lib/db/` | API 서버 — Drizzle ORM 스키마 |
| `@now/api-zod` | `lib/api-zod/` | (미래) API 요청/응답 밸리데이션 |
