# NOW!! Pomodoro — 개발 로그

> 매 기능 추가, 버그 픽스, 리팩토링마다 기록. 최신순.

---

## 2026-04-16 — feat(phase2): 픽셀 에디터 Undo + Pan 도구
- **커밋**: `fb1c6aa`
- **변경 파일**: `PixelEditor.tsx`, `i18n.ts`
- 스트로크 단위 Undo 히스토리 (50단계 cap). 모달 열 때 초기 grid를 history[0]으로 seed. 스트로크 release 시 변경된 경우만 push.
- 'pan' 도구 추가: 1-finger 드래그로 캔버스 패닝 (그리기 비활성). 기존 2-finger pinch/pan 유지.
- i18n: `pixel_pan`(이동), `pixel_undo`(되돌리기) ko/en

## 2026-04-16 — feat(phase1): 백그라운드 NOW! 로컬 알림 + 피드백 로드맵
- **커밋**: `ad05120`
- **변경 파일**: `pushNotifications.ts`, `TimerContext.tsx`, `App.tsx`, `docs/feedback-roadmap.md`, `CLAUDE.md`
- `scheduleTimerNotification` / `cancelAllTimerNotifications` 로컬 알림 헬퍼 6종 (work/break x end/lv2/lv3).
- `transitionTo`에서 cancel→재예약 통합. focusing/breaking 진입 시 Lv1+Lv2+Lv3 한 번에 예약.
- 앱 부팅 시 `ensureNotificationPermission()` 호출.

## 2026-04-10 — fix: SDK 54 호환 패키지 업그레이드 + reanimated 4 worklets 분리
- **커밋**: `1408229`
- **변경 파일**: `package.json`, `babel.config.js`, `pnpm-lock.yaml`
- reanimated 3.17.5 → 4.1.7, react-native-worklets@0.5.1 추가. babel plugin `react-native-worklets/plugin`으로 교체.
- `folly/coro/Coroutine.h` 빌드 에러의 근본 원인 해결.

## 2026-04-10 — fix: EAS iOS 빌드 이미지 latest 고정
- **커밋**: `2ca896a`
- **변경 파일**: `eas.json`
- folly coro 헤더 이슈 우회 시도 (결과적으로 reanimated 업그레이드가 필요했음).

## 2026-04-10 — fix: pnpm-lock.yaml 동기화
- **커밋**: `8065c78`
- **변경 파일**: `pnpm-lock.yaml`
- expo-image-picker 추가로 인해 stale lockfile 문제 → EAS Install dependencies 실패 수정.

## 2026-04-10 — fix: EAS Build npm legacy-peer-deps
- **커밋**: `5b9f85e`
- **변경 파일**: `.npmrc`
- EAS 빌드에서 peer deps 충돌 방지 위해 `.npmrc`에 `legacy-peer-deps=true` 추가.

## 2026-04-10 — refactor: 코드 구조 정리 — 컴포넌트 분리 + 공유 상수 추출
- **커밋**: `b0250f1`
- **변경 파일**: `SocialScreen.tsx`, `SettingsScreen.tsx`, `FocusScreen.tsx`, `NowAlertOverlay.tsx`, `StatsScreen.tsx`, `SocialContext.tsx`, `VoiceRecorder.tsx`, `SocialToasts.tsx` (신규), `NumberInput.tsx` (신규), `constants.ts` (신규), `i18n.ts`
- SocialScreen에서 PokeToast/PeerAlertToast 150줄 → `SocialToasts.tsx` 분리.
- SettingsScreen에서 NumberInput 170줄 → `NumberInput.tsx` 분리.
- TOMATO_IMAGES/TOMATO_GRAY_IMAGES/VIBRATION 패턴 → `constants.ts` 추출.
- VoiceRecorder: unmount cleanup + i18n 한국어 하드코딩 제거.
- +402/-370줄 순 중복 제거.

## 2026-04-09 — feat: 전체 앱 i18n 지원 — 한국어/영어 토글
- **커밋**: `375ef27`
- **변경 파일**: `i18n.ts` (신규), 전체 스크린/컴포넌트
- I18nProvider + useI18n 패턴. 설정 화면에서 ko/en 토글.

## 2026-04-09 — feat: NOW! 알림을 개별 글자 이미지로 조합
- **커밋**: `00f8f9b`
- **변경 파일**: `NowAlertOverlay.tsx`, `assets/images/Now_N.png` 등
- 텍스트 렌더링 대신 N/O/W/! 개별 이미지 에셋으로 "NOW!" 합성.

## 2026-04-08 — fix: silent catch 제거 + JWT 하드코딩 폴백 제거
- **커밋**: `2ea146c`
- **변경 파일**: `AuthContext.tsx`, `jwt.ts`
- 보안: catch 블록에서 에러 삼키는 패턴 제거. 하드코딩 JWT 시크릿 폴백 제거.

## 2026-04-08 — feat: 사진→아바타 변환 품질 v3
- **커밋**: `120315d`
- **변경 파일**: `PixelEditor.tsx`, `image.ts`
- 72색 팔레트 + Lab 색공간 + Floyd-Steinberg 디더링.

## 2026-04-07 — feat: 사진→도트 아바타 변환 기능
- **커밋**: `3644c78` ~ `290f54e` (다수 iterations)
- 사진 → 서버 리사이즈 → 72색 양자화 → 32x32 도트 그리드 변환. 흑백 문제/품질 이슈 수차례 수정.

## 2026-04-06 — fix: 보이스콕 iOS 지원
- **커밋**: `fe03336`, `b7c6b4e`, `a953a63`, `b895380`, `5a099d1`
- webm → m4a 포맷 변경. data URI 대신 임시파일 방식. expo-file-system/legacy import. 서버 legacy 녹음 자동 마이그레이션. 앱 리로드 시 자동 복원.

## 2026-04-05 — fix: 포크 팝업 → 상단 배너 + 10초 쿨다운
- **커밋**: `d9e762e`
- 포크 알림이 화면 전체를 가리는 모달 → 상단 배너로 변경. 스팸 방지 쿨다운.

## 2026-04-05 — feat: 집중 중 팀원 NOW 무시 알림 차단
- **커밋**: `997c3f3`
- 방해금지 모드: 집중 세션 중에는 팀원의 NOW! 무시 알림 비노출.

## 2026-04-04 — fix: 집중 화면 레이아웃 흔들림 수정
- **커밋**: `c92b41c`, `5447d4f`
- 고정 사이즈 컨테이너로 layout jitter 해결. 불필요한 고정 높이 제거.

## 2026-04-03 — feat: EAS 빌드 설정 + 시간 드래그 입력 + 방해금지
- **커밋**: `ee426b8`, `0d33c9e`
- `eas.json` internal 배포 프로필. NumberInput PanResponder 드래그. DND 모드.

## 2026-04-02 — feat: Phase 4 통계 & 게임화
- **커밋**: `b881ebf` ~ `90cc1ee` (다수)
- StatsScreen: 일별 작업시간, 완료 세션, NOW! 준수율, 반응 속도 차트. 팀 리더보드.

## 2026-04-01 — feat: Phase 3 소셜 & 팀 동기화
- **커밋**: `4f10e45` ~ `4f140c8`
- SSE 기반 실시간 팀 상태. 멀티 팀 탭. 푸시 알림. 깨우기(Poke). 보이스 콕.

## 2026-03-31 — feat: Phase 2 NOW! 에스컬레이션 & 알림음 강화
- **커밋**: `8774419` ~ `bd6e857`
- 5단계 에스컬레이션. MP3 알림음 교체. 레벨별 볼륨/진동 패턴.

## 2026-03-30 — feat: Phase 1 MVP
- **커밋**: `aaf5233`
- 기본 뽀모도로 타이머. 집중/휴식 사이클. 세션 카운터.
