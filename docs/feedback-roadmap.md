# 피드백 로드맵 (2026-04 내부 테스터)

내부 테스터 5명에게 첫 빌드 배포 후 받은 피드백 정리. Phase 단위로 진행하고, 각 Phase 완료 시 체크박스 + 작업 내역 + 커밋 해시를 기록한다.

## Phase 1 — 백그라운드 NOW! 알림 [완료]

**목표**: 앱이 백그라운드 상태일 때도 NOW! 시점에 사용자가 알 수 있도록 OS 레벨 로컬 알림을 띄운다. 현재는 포그라운드일 때만 사운드/진동/오버레이가 동작해서 백그라운드면 시점을 놓침.

**작업 항목**
- [x] `expo-notifications` 로컬 스케줄링 헬퍼 (`scheduleTimerNotification`, `cancelAllTimerNotifications`) 추가
- [x] `TimerContext` 진입 시점에 알림 예약: `focusing` → work-end / `breaking` → break-end
- [x] 에스컬레이션 알림: focusing/breaking 진입 시 Lv2/Lv3 알림도 동시에 미리 예약 (각 escalationSeconds 간격)
- [x] `stop()` / `snooze()` / `dismiss()` 시 예약된 알림 취소 (모든 phase 전환이 `transitionTo` → `cancelAllTimerNotifications` → 재예약을 거치도록 통합)
- [x] 앱 시작 시 알림 권한 요청 통합 (`App.tsx` 의 `useEffect` 에서 `ensureNotificationPermission()` 호출)
- [x] iOS Notification Handler 설정 점검 — 기존 `setNotificationHandler` 가 이미 `shouldShowBanner: true` 로 OK
- [ ] (이후) 알림 탭 시 앱이 NOW! 화면으로 진입하도록 deep link 처리 — Phase 6 (소셜 전파)와 함께 묶어 처리

**완료 기록**
- 일자: 2026-04-16
- 변경 파일:
  - `artifacts/now-timer-mobile/src/lib/pushNotifications.ts` — 로컬 알림 헬퍼 (`ensureNotificationPermission`, `scheduleTimerNotification`, `cancelAllTimerNotifications`) + `TimerNotificationKind` 타입 6종(work/break × end/lv2/lv3)
  - `artifacts/now-timer-mobile/src/context/TimerContext.tsx` — `scheduleBackgroundAlertsForPhase` 추가, `transitionTo` 가 매번 cancel→재예약, `stop()` 에도 cancel 추가, `escalationSeconds` 선언 위치를 위로 이동(forward ref 회피)
  - `artifacts/now-timer-mobile/src/App.tsx` — 앱 부팅 시 `ensureNotificationPermission()` 호출
- 핵심 구현 방식: `transitionTo` 가 모든 phase 진입의 단일 진입점이므로, 거기서 한 번에 (1) 기존 알림 모두 취소 (2) 새 phase 가 focusing/breaking 일 때만 end + lv2 + lv3 세 개를 미리 예약. nowAlert/returnAlert 진입 시에는 이미 사운드/오버레이가 떴으므로 추가 예약 없음. 식별자에 `timer-` prefix 를 붙여 `getAllScheduledNotificationsAsync` 로 일괄 취소 가능하게 함.
- 커밋: `ad05120`

---

## Phase 2 — 픽셀 에디터 UX 개선 [완료]

**목표**: 픽셀 아바타 만드는 작업의 실수 복구와 정밀 작업 편의성 강화.

**작업 항목**
- [x] 실행취소 (Undo): 스트로크 단위 히스토리 스택 (셀 단위가 아닌 release 시점에 push) + 50개 cap + 헤더 Undo 버튼
- [ ] (선택) Redo — Phase 2 범위에서 제외 (필요 시 백로그)
- [x] 150% 확대 시 화면 드래그 패닝: 'pan' 툴 추가, 1-finger 드래그가 패닝으로 동작
- [x] 패닝 중에는 그리기 비활성화 (tool === 'pan' 일 때 drawAtPoint 호출 안 함)
- [x] 줌 리셋 버튼 — 기존 zoom % 라벨 탭으로 이미 구현되어 있음 (resetZoom)
- [x] 템플릿 적용 / 전체삭제 도 history에 push
- [x] i18n: `pixel_pan`, `pixel_undo` 키 추가 (ko/en)

**완료 기록**
- 일자: 2026-04-16
- 변경 파일:
  - `artifacts/now-timer-mobile/src/components/PixelEditor.tsx` — Tool 타입에 'pan' 추가, history stack(`historyRef`/`historyIdxRef`) + `pushHistory`/`undo`, `strokeChangedRef` 로 no-op 스트로크 감지, 1-finger pan 제스처 핸들러, 헤더 Undo 버튼 + 비활성화 스타일
  - `artifacts/now-timer-mobile/src/lib/i18n.ts` — `pixel_pan` / `pixel_undo` ko/en
- 핵심 구현 방식: 기존 2-finger pinch/pan 은 그대로 유지하고, 'pan' 툴이 활성화되었을 때만 1-finger 가 캔버스 drag 로 동작. 줌 무관하게 동작(줌이 1배여도 pan 가능 — 사용자에게 더 일관된 모델). Undo 는 스트로크 release 시점에 grid snapshot 을 push, 50개 cap LRU. 모달 열 때 초기 grid 를 history[0] 로 seed해서 첫 스트로크 직후 undo 가 빈 상태로 돌아갈 수 있게 함. 템플릿 적용/Clear 도 명시적으로 push.
- 커밋: `fb1c6aa`

---

## Phase 3 — 폰트/요소 사이즈 가독성 [대기]

**목표**: 전반적으로 폰트와 인터랙션 요소 크기를 키워 가독성/탭 정확도 개선.

**작업 항목**
- [ ] 현재 사용 중인 폰트 사이즈 토큰 정리 (어디에 어떤 사이즈 쓰이는지 파악)
- [ ] 베이스 사이즈를 +2~4pt 정도 일괄 상향 (실제 수치는 디자인 검토)
- [ ] 버튼/탭 영역 최소 44x44pt 보장 (iOS HIG)
- [ ] 통계 화면 숫자/라벨 우선 적용
- [ ] 설정 화면 NumberInput 라벨 가독성 점검

**완료 기록**
- (작업 진행 후 채움)

---

## Phase 4 — 후라이팬 + 토마토 시각 디테일 [대기]

**목표**: 토마토 세계관의 시각적 매력 강화. 후라이팬에 토마토를 볶는 비주얼 메타포를 살린다.

**작업 항목**
- [ ] 세션 토마토 카운터 이미지 사이즈 키우기
- [ ] NowAlertOverlay 후라이팬의 원형 팬 부분이 화면 중앙에 오도록 레이아웃 재조정
- [ ] 후라이팬 흔들기 애니메이션 추가 (transform: translateX/rotate)
- [ ] 에스컬레이션 레벨에 따라 흔들기 속도 가속 (Lv1 느림 → Lv3 매우 빠름)
- [ ] 흔들림과 토마토 위치 sync (토마토가 팬 안에서 함께 흔들리는 느낌)

**완료 기록**
- (작업 진행 후 채움)

---

## Phase 5 — NOW! 상태 컴포넌트 떨림 고정 [대기]

**목표**: NOW! 상태일 때 의도치 않게 흔들리는 컴포넌트 고정. (Phase 4의 후라이팬 흔들기는 의도된 동작이므로 별개)

**작업 항목**
- [ ] 어느 컴포넌트가 흔들리는지 식별 (테스터에게 영상/스크린샷 요청 필요)
- [ ] 레이아웃 jitter 원인 진단 (텍스트 길이 변화? 상태 전환 시 layout shift?)
- [ ] 고정 사이즈 컨테이너로 감싸 안정화

**완료 기록**
- (작업 진행 후 채움)

---

## Phase 6 — 무시 알림의 소셜 전파 [백로그]

**목표**: 백그라운드에서 NOW! 알림을 무시하고 있을 때 다른 팀원들에게 자동으로 푸시. 친구가 깨우기를 보내면 그 알림도 백그라운드에서 안정적으로 수신.

**전제**: Phase 1 (백그라운드 알림) 완료 필요. 서버 측 작업도 동반.

**작업 항목**
- [ ] 클라이언트 → 서버: ignoreLevel ≥ 2일 때 멤버 상태 업데이트
- [ ] 서버: 해당 팀의 다른 멤버들에게 Expo 푸시 발송
- [ ] 푸시 알림 핸들링 검증 (앱 종료 상태에서도 깨우기 알림 수신)
- [ ] 알림 탭 시 SocialScreen으로 직접 진입

**완료 기록**
- (작업 진행 후 채움)
