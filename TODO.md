# 이모셀피 Frontend TODO

- 기준: [Backend spec.md](../emoselfie-DOCS/development/backend/spec.md), [Frontend spec.md](../emoselfie-DOCS/development/frontend/spec.md), [PLAN.md](./PLAN.md)
- 갱신일: 2026-09-08. 기존 완료 기록은 보존하며 이번 문서 검토로 구현·연동 완료 상태를 추가하지 않는다.
- 상태 표기: `[ ]` 미착수, `[x]` 완료
- 우선순위: P0 MVP 필수, P1 후속
- 크기: S 반나절 안팎, M 1~2일, L 3일 이상. 계약 대기와 실제 기기 검증 시간은 제외한 상대 크기다.

## 0. 결정 및 계약 게이트

### 제품 결정

- [ ] `FE-DEC-01` (P0/S) Q-1 사진 삭제 시점과 사용자 고지 문구 확정
- [ ] `FE-DEC-02` (P0/S) Q-2 게임 진행 중 신규 입장 정책 확정
- [ ] `FE-DEC-03` (P0/S) Q-3 카메라 초기화 실패·영구 손실·권한 철회 처리 확정
- [ ] `FE-DEC-04` (P0/S) Q-4 감상 시간과 스킵 분모·방장 즉시 스킵 확정
- [ ] `FE-DEC-05` (P0/S) Q-5 권한 상태 조회 미지원 브라우저의 재확인 UX 확정
- [ ] `FE-DEC-06` (P0/S) Q-6 대기실·게임 중 나가기의 MVP 포함 여부 확정
- [x] `FE-DEC-07` (P0/S) Q-7 확정(2026-09-08): 전면 프리뷰·제출 사진 거울 방향, 3:4 contain, 크롭 없음
- [ ] `FE-DEC-08` (P0/S) 확정 내용을 `spec.md`, PRD, BE 명세에 같은 용어로 반영

### 백엔드 계약

- [ ] `FE-API-01` (P0/M) B-1 screen별 snapshot discriminated union과 fixture 합의
- [ ] `FE-API-02` (P0/M) B-2 전체 서버 순위·processing 결과 계약 합의
- [ ] `FE-API-03` (P0/M) B-3 리액션·스킵 desired state/requestId와 내 상태 복원 계약 합의
- [ ] `FE-API-04` (P0/M) B-4 업로드 논리 ID·접수 조회·응답 유실 재시도 계약 합의
- [ ] `FE-API-05` (P0/L) B-5 snapshot revision·event replay 또는 원자적 구독 계약 합의
- [ ] `FE-API-06` (P0/M) B-6 기존 참여자의 finished/left 복원 계약 합의
- [ ] `FE-API-07` (P0/S) B-7 권한 전 방 조회의 허용 필드 확정
- [ ] `FE-API-08` (P0/S) B-8 닉네임 trim·Unicode 길이·제어문자·갱신 규칙 확정
- [ ] `FE-API-09` (P0/M) B-9 권한 철회·스트림 영구 손실의 보고와 복귀 계약 확정
- [ ] `FE-API-10` (P0/M) B-10 참여자 추가 이벤트·12색 팔레트·mutation 응답 DTO 확정
- [ ] `FE-API-11` (P0/M) B-11 결과 열람자로 승격될 때 기존 결과 backlog 계약 확정
- [ ] `FE-API-12` (P0/S) B-12 skip 가능 단계·0명 분모·마지막 무효 라운드 경계 확정
- [ ] `FE-API-13` (P0/M) 확정 HTTP·Socket DTO의 정상/오류 JSON fixture 저장

## 1. 프로젝트 기반 — Phase 0

- [x] `FE-001` (P0/S) Vite + React + TypeScript 프로젝트 초기화
- [x] `FE-002` (P0/S) React Router, Zustand, TanStack Query, Socket.IO Client, Tailwind CSS, Motion 설치·설정
- [x] `FE-003` (P0/S) lint, typecheck, unit test, build 스크립트 구성
- [x] `FE-004` (P0/S) 테스트 환경과 DOM/browser API mock 기반 구성
- [x] `FE-005` (P0/S) `/`, `/r/:slug`, not-found 라우트 및 lazy route 구성
- [x] `FE-006` (P0/S) AppShell, error boundary, provider 구성
- [x] `FE-007` (P0/M) 공통 HTTP client와 `{error:{code,message,detail}}` parser 구현
- [x] `FE-008` (P0/M) DTO runtime validation과 adapter 경계 구현
- [x] `FE-009` (P0/S) 동일 오리진 `/api`, `/socket.io`, `/media` 개발 프록시 구성
- [x] `FE-010` (P0/S) CI에 install/lint/typecheck/test/build 품질 게이트 추가
- [x] `FE-011` (P0/S) 민감 데이터가 콘솔·오류 로그에 포함되지 않는 logging wrapper 구성

## 2. 디자인 시스템 — Phase 1

- [x] `FE-020` (P0/M) v2 색상·타이포·간격·외곽선·그림자·모션 토큰 구현
- [x] `FE-021` (P0/S) Pretendard/Jua 로딩과 시스템 폰트 fallback 구성
- [x] `FE-022` (P0/M) StickerButton, Card, StatusBadge 구현
- [x] `FE-023` (P0/M) SettingChips radiogroup와 disabled 이유 문구 구현
- [x] `FE-024` (P0/M) Sheet/ConfirmSheet의 focus trap·복귀 구현
- [x] `FE-025` (P0/S) Toast와 live region 구현
- [x] `FE-026` (P0/M) ServerTimer·SubmissionCounter 표시 컴포넌트 구현
- [x] `FE-027` (P0/M) ParticipantAvatar/Row와 나·방장·연결 상태 구현
- [x] `FE-028` (P0/M) ErrorView·ConnectionNotice 구현 — 대기실 연결 안내, 10초 후 수동 재연결·랜딩 이동. `src/components/ConnectionNotice.test.tsx`, `src/features/lobby/Lobby.test.tsx` 검증(2026-09-08).
- [ ] `FE-029` (P0/M) 320~430px, safe-area, dvh, 큰 글자, 키보드 레이아웃 대응
- [x] `FE-030` (P0/S) reduced-motion, 44px 터치 영역, 색 외 상태 표현 적용
- [ ] `FE-031` (P0/M) 컴포넌트 visual fixture/demo와 390×844 시안 비교 기준 마련

## 3. 세션·입장·대기실 — Phase 2

- [x] `FE-040` (P0/M) `GET /api/me` query와 HttpOnly 쿠키 기반 세션 부트스트랩
- [x] `FE-041` (P0/M) Landing 설정 폼과 방 생성 mutation 구현 `RO-01~03·17`, `RD-01·04`
- [x] `FE-042` (P0/S) existing 방 이동 토스트와 실제 상태 복원 연결 `RO-03`
- [x] `FE-043` (P0/M) NicknameSetup 입력·한글 IME·서버 오류·기본값 보호 구현 `ID-04`, `RO-05`
- [x] `FE-044` (P0/L) RoomEntry 상태 머신: 기존 참여자 복원 우선·신규 입장 분리
- [x] `FE-045` (P0/M) CameraIntro 화면과 사용자 탭 권한 요청 연결 `PM-01·02·16`
- [x] `FE-046` (P0/M) CameraBlocked 원인별 화면·OS별 설정 안내 시트 구현 `PM-05·07~09`
- [x] `FE-047` (P0/M) 카메라 확인 성공 후에만 participant 등록·소켓 연결 `PM-07`
- [x] `FE-048` (P0/L) Lobby 설정 요약·인원·참여자·연결 상태 구현 `RO-07`
- [x] `FE-049` (P0/S) 초대 링크 생성·Clipboard 성공/실패 UX 구현 `RO-01`
- [x] `FE-050` (P0/M) 방장 설정 변경과 서버 실패 시 rollback 구현 `RO-17`
- [x] `FE-051` (P0/M) 시작 가능 상태·게임 시작 mutation 구현 `RO-08`, `PM-10`
- [ ] `FE-052` (P0/M) 방 닫기 확인·mutation·전체 종료 처리 구현 `RO-13`
- [ ] `FE-053` (P0/M) host:changed와 임시 방장/원래 방장 복귀 표시 `RO-10·11`
- [ ] `FE-054` (결정/P0) Q-2에 따른 진행 중 신규 입장 화면 구현 `RO-09`
- [ ] `FE-055` (결정/P0) Q-6에 따른 대기실·게임 중 나가기 구현 `RO-16`
- [ ] `FE-056` (P0/M) 방 없음·종료·정원 초과·레이트 리밋 오류 흐름 구현 `RO-06·15`

## 4. 카메라·이미지·제출 — Phase 3

- [x] `FE-060` (P0/L) CameraService의 단일 스트림·요청 generation·cleanup 구현 `PM-04`
- [x] `FE-061` (P0/M) 전면 video/no-audio, playsInline, 프레임 준비 확인 구현 `CP-01`
- [x] `FE-062` (P0/M) 1.5초 로딩·3초 실패·재시도 구현 `CP-06`
- [x] `FE-063` (P0/M) 권한 거부·장치 없음·사용 불가·미지원 오류 정규화 `PM-03·09`
- [ ] `FE-064` (P0/L) background/foreground와 mute/ended 복구 구현 `PM-13`
- [ ] `FE-065` (결정/P0) Q-3·Q-5에 따른 영구 손실·권한 재확인 분기 구현
- [x] `FE-066` (P0/M) Canvas 캡처와 비율 유지 장변 720px 축소 구현 `CP-04`
- [x] `FE-067` (P0/S) JPEG quality 0.8 Blob 생성·null/invalid Blob 방어 `CP-04`
- [ ] `FE-068` (P0/M) Q-7 확정 정책을 Canvas와 세 화면에 일관 적용 — Canvas·프리뷰·촬영 확인 반영 완료. 결과 화면 및 실제 게임 진입 연결은 후속 구현
- [x] `FE-069` (P0/M) 촬영 확인·재촬영·Object URL 교체/해제 구현 `CP-02`
- [x] `FE-070` (P0/L) Play 프리뷰·주제·셔터·확인·제출 UI 구현 `RD-03·09`, `CP-01·02`
- [x] `FE-071` (P0/M) FormData + X-Capture-Token 제출과 202 처리 구현 `CP-03·08`
- [x] `FE-072` (P0/M) 이중 제출 차단과 제출 확인 중 상태 구현
- [ ] `FE-073` (계약/P0) B-4 기반 자동 1회·수동 재시도와 응답 유실 복구 `CP-05`
- [x] `FE-074` (P0/M) DEADLINE_PASSED/ALREADY_SUBMITTED/INVALID_CAPTURE_TOKEN/NOT_CURRENT_ROUND/413/415 분기 `CP-10` — 코드별 문구와 복구 동작을 `src/features/game/submissionOutcome.ts`로 분리. 요청 전 검증만 재촬영을 열어 두고 서버 응답은 재전송을 막는다. `submissionOutcome.test.ts`, `CaptureStage.test.tsx`, `RoomSession.test.tsx` 검증(2026-09-08).
- [x] `FE-075` (P0/M) 카메라·Blob·Object URL 자원 해제 테스트

## 5. 실시간 게임 — Phase 4

- [x] `FE-080` (P0/M) Socket.IO singleton과 connect/disconnect 생명주기 구현
- [ ] `FE-081` (P0/M) room/participant/round/submission/session 공통 handler 구현
- [ ] `FE-082` (P0/L) snapshot과 이벤트가 공유하는 Zustand reducer 구현
- [x] `FE-083` (P0/M) serverTimeMs·performance.now 기반 ServerClock 구현 `RD-08`
- [ ] `FE-084` (P0/M) foreground·재접속 시 시계 재동기화와 타이머 테스트
- [x] `FE-085` (P0/M) Countdown 감정 카드·3초 전환 구현 `RD-02·03`, `EM-02`
- [x] `FE-086` (P0/S) 제출 현황과 10초 이하 타이머 강조 구현 `RD-03·09` — 서버 activeCount 분모의 제출 현황과 10초 이하 강조(색 외 `곧 마감` 문구·aria 안내). 소리·진동·자동 제출 없음. `src/components/ServerTimer.test.tsx` 검증(2026-09-08).
- [x] `FE-087` (P0/M) 타이머 0 입력 잠금과 서버 진행 확인 상태 구현 `RD-08`
- [x] `FE-088` (P0/M) RoundMissed scoring/viewing 2단계 화면 구현 `RS-11~14`
- [x] `FE-089` (P0/S) 마지막 라운드 미제출의 최종 결과 대기 문구 구현 `FN-01`
- [x] `FE-090` (P0/M) round:voided와 다음 라운드/3회 중단 처리 — 무효 라운드는 점수 없이 폐기하고 사진·촬영 토큰을 제거하며 미제출자에게도 안내한다. 3회 연속 중단은 서버 `game:finished{aborted}`를 그대로 따른다. `src/stores/gameState.test.ts` 검증(2026-09-08).
- [x] `FE-091` (P0/M) roundId·요청 generation으로 오래된 응답/이벤트 폐기
- [x] `FE-092` (P0/M) 촬영 중 사용자에게 결과 필드가 저장·표시되지 않는 접근제어 테스트 `RS-09` — 촬영 화면에서 도착한 submission:scored·round:finalized의 mediaToken·점수·포인트가 store에 남지 않음을 검증. 서버가 실제로 보내지 않는지는 `FE-093`·`FE-148`에서 확인(2026-09-08).
- [ ] `FE-093` (P0/M) 미제출자 snapshot/event에 결과 상세가 없는 contract test `RS-12`

## 6. 결과·리액션·최종 화면 — Phase 5

- [x] `FE-100` (P0/L) ResultCarousel과 participantId 기반 선택 구현 `RS-02·03` — 사진 좌우 이동·레일 선택·점 표시를 participantId로 묶어 서버 재정렬에도 보던 사진이 바뀌지 않는다(2026-09-08).
- [ ] `FE-101` (계약/P0/L) B-2 서버 순서 기반 RankRail과 processing/missed 슬롯 구현 `RS-03·04·06` — **진행:** 시안대로 썸네일·순위 배지·♥ 배지 레일을 구현하고 서버 scoredTotal 분모만큼 익명 대기 슬롯을 둔다. 참여자별 processing/missed 슬롯은 B-2 합의 후.
- [x] `FE-102` (P0/M) 레일 300~500ms layout animation·이벤트 합치기·큐 정리 `RS-03` — 시안과 같은 500ms cubic-bezier(.22,1.2,.36,1) layout 재정렬(2026-09-08).
- [x] `FE-103` (P0/M) no_face/failed/processing/정상 결과 표현 `SC-04·05`
- [x] `FE-104` (P0/M) 점수 소수 한 자리와 finalized 후 포인트 분리 표시 `SC-01·09`
- [ ] `FE-105` (P0/M) mediaToken 사진 조회·no-store·410 자리표시자 구현 `PV-02·04`
- [ ] `FE-106` (계약/P0/M) B-11 결과 진입 시 이전 제출 backlog 복원 — **확인(2026-09-08):** BE는 제출 접수 순간에만 `viewers`에 추가하고(`round/service.py`) `/state`는 waiting 외 503이라, 늦게 제출한 참여자는 먼저 채점된 결과를 받을 방법이 없다. FE는 서버 scoredCount로 빠진 인원 수를 표시하고 배경 조회 실패를 오류로 알리지 않는다. 실제 backlog는 서버 구현이 필요하다.
- [x] `FE-107` (P0/L) ReactionButtons ♥·⁇ 독립 토글·자기 사진 비활성 구현 `RX-01~08` — BE §13.2 `reaction:sent`를 ack와 함께 보내고 실패 시 눌림 상태를 되돌린다. 자기 사진은 비활성 + 이유 문구. 채점 확정 전 카드에는 버튼이 없다(2026-09-08).
- [ ] `FE-108` (계약/P0/M) B-3 서버 확정 내 리액션 상태·응답 유실·재접속 복원
- [x] `FE-109` (P0/M) reaction:updated 총수 대입과 라운드 종료 후 잠금 `RX-09·10` — 총수는 서버 이벤트 값만 대입하고 로컬에서 더하지 않는다. `round:closed`는 결과 화면을 대기 화면으로 바꿔 이후 전송 경로를 남기지 않는다(2026-09-08).
- [ ] `FE-110` (결정/P0/M) Q-4 감상 타이머·일반 스킵·방장 즉시 스킵 UI `RS-08·15` — **진행:** 서버 viewingEndsAtMs 기반 감상 타이머와 전원 활성 스킵(`round:skip`), 서버 `round:skipStatus` 분모 표시를 구현했다. 감상 시간 길이와 방장 즉시 종료는 서버 판단을 따르며 Q-4 확정 후 문구를 닫는다.
- [ ] `FE-111` (계약/P0/M) B-12 0명 분모·skip 가능 단계·종료 경계 처리
- [x] `FE-112` (P0/L) FinalRanking 시상대·전체 순위·본인 행 구현 `FN-01·02` — 1·2·3위 시상대, 4위 이하 스크롤 목록, 본인 행 강조와 ♥/⁇ 누적을 서버 ranking 값으로 표시(2026-09-08).
- [x] `FE-113` (P0/M) mostLoved 독립 수상·null 상태 구현 `RX-11`
- [x] `FE-114` (P0/S) 중단 reason 안내 구현
- [x] `FE-115` (P0/S) 새 방 만들기·나가기·비활성 공유 구현 `FN-03·04` — 전원 동일한 새 방 만들기, 방 나가기, 이유 문구를 동반한 비활성 공유 버튼(2026-09-08).
- [ ] `FE-116` (결정/P0/S) Q-1 확정 삭제 문구를 모든 화면에 통일

## 7. 재접속·복구 — Phase 6

- [ ] `FE-120` (계약/P0/L) B-1 screen union 기반 RoomScreenResolver 구현 `ID-05`
- [ ] `FE-121` (P0/L) 초기·reload·소켓 재연결 `/state` atomic restore 구현 `ID-05`
- [ ] `FE-122` (계약/P0/L) B-5 revision/replay 적용과 snapshot/event 역전 테스트
- [x] `FE-123` (P0/M) 연결 변경 중 mutation 잠금과 ConnectionNotice 구현
- [x] `FE-124` (P0/M) 10초 이상 단절 후 수동 다시 연결·랜딩 이동 구현
- [x] `FE-125` (P0/M) session:superseded 자동 재연결 중지·사용자 재연결 구현 `ID-07`
- [ ] `FE-126` (계약/P0/M) finished·left 기존 참여자 복원 구현 `RO-16`, `FN-01`
- [ ] `FE-127` (P0/M) round/room 변경 시 미디어·토큰·명령·animation 정리
- [ ] `FE-128` (P0/M) Wi-Fi↔LTE, background, reload 복원 통합 테스트

## 8. 모바일 QA·출시 — Phase 7

- [ ] `FE-140` (P0/M) 테스트 계정/방·mock inference·모바일 QA 절차 문서화
- [ ] `FE-141` (P0/L) iOS Safari 최신 2개 버전 카메라·권한·복원 매트릭스 수행
- [ ] `FE-142` (P0/L) Android Chrome 최신 2개 버전 카메라·권한·복원 매트릭스 수행
- [ ] `FE-143` (P0/M) 전화 수신·잠금·앱 전환·회전 시나리오 검증
- [ ] `FE-144` (P0/L) 2명 정상 게임 E2E 완주
- [ ] `FE-145` (P0/L) 12명 동시 제출·연속 재정렬 E2E 검증
- [ ] `FE-146` (P0/L) 마감 직전·응답 유실·no_face·inference 실패·미제출 E2E 검증
- [ ] `FE-147` (P0/M) 방장 이탈·임시 위임·복귀·중복 탭 검증
- [ ] `FE-148` (P0/M) 권한 미허용자·미제출자의 HTTP/Socket 정보 노출 검사
- [ ] `FE-149` (P0/M) 키보드 접근·screen reader·focus·contrast·reduced-motion 점검
- [ ] `FE-150` (P0/M) 4G 방 진입·카메라 준비·업로드→결과 성능 측정
- [ ] `FE-151` (P0/M) 초기 bundle 분석과 결과 화면 lazy loading 확인
- [ ] `FE-152` (P0/M) local/session/IndexedDB/Cache·로그에 이미지·토큰·초대 링크 잔존 검사
- [ ] `FE-153` (P0/S) P0 요구사항↔TODO↔테스트 추적표 완성
- [ ] `FE-154` (P0/S) 알려진 제한·지원 브라우저·운영 점검 릴리스 노트 작성
- [ ] `FE-155` (P0/S) 최종 lint/typecheck/test/build 및 배포 산출물 확인

## 9. P1 이후

- [ ] `FE-P1-01` (P1/M) 감정 세트 쉬움/전체 선택 `EM-04`
- [ ] `FE-P1-02` (P1/M) 상위 3개 감정과 점수 표시 `RS-10`
- [ ] `FE-P1-03` (P1/M) 자발적 나가기·누적 포인트 복귀가 Q-6에서 제외된 경우 구현 `RO-16`
- [ ] `FE-P1-04` (P1/L) 사진 없는 순위표 이미지 생성·Web Share/저장 구현 `FN-04`
- [ ] `FE-P1-05` (P1/L) 부적절한 결과 신고와 즉시 blur 처리
- [ ] `FE-P1-06` (P1/M) 베타 지표에 따른 미제출 페널티·노출 시간 편향·최소 인원 UX 조정

## 10. 작업 착수 체크

현재는 초기화와 기본 UI 구현 이후 단계다. 다음 착수 순서는 아래와 같다. 세부 선행 조건과 완료 기준은 [PLAN.md §9](./PLAN.md#9-현재-코드-기준-다음-실행-순서)를 따른다.

1. `FE-160~161`, `FE-API-01·05·10·13`: 입장·소켓 wire 계약과 복원 프로토콜 확정.
2. `FE-082~084`, `FE-120~122`: 게임 상태·시계·복원 기반을 먼저 연결.
3. `FE-162~163`, `FE-073~074`, `FE-085~087`: 실제 게임 진입부터 촬영·서버 접수까지 완성.
4. `FE-088~093`, `FE-100~116`: 결과·리액션·다음 라운드·최종 순위 완성.
5. `FE-164`, `FE-064~065`, `FE-123~128`, `FE-140~155`: 모바일 예외와 출시 검증.

`FE-028` 공통 연결 안내는 대기실에 연결했다. `FE-053`은 임시 방장 이벤트와 권한 변경 UI를 반영했으나 새로고침 시 temporary 복원 계약이 남아 있고, `FE-081`은 게임 이벤트까지 연결했고 `FE-083`은 서버 시각·monotonic clock을 연결했다. 서버의 전체 snapshot/replay와 리액션 명령 계약은 남아 있다. 해당 체크는 전체 완료 조건 충족 때 갱신한다.

## 11. 백엔드 명세 대조로 추가한 통합 TODO

아래는 기존 항목의 구체적인 보완 작업이며 별도 기능 범위 확장이 아니다.

- [x] `FE-160` (P0/M, FE-040·044 보완) `/api/me` 성공 후 방 snapshot/preview 조회를 시작하도록 세션 부트스트랩 순서 보장. **완료:** 세션 성공 후 방 조회를 시작하고, 실패 시 재시도 화면 제공. `src/features/room/RoomPage.test.tsx`에서 응답 지연·실패→재시도 요청 순서를 검증(2026-09-08). 실제 쿠키 발급은 실서버 QA에서 확인.
- [ ] `FE-161` (계약/P0/M, FE-008·081 보완, B-1·B-10 의존) HTTP `/state`와 `room:joined`를 별도 wire schema로 검증하고 공통 내부 모델로 변환. **완료:** BE §13의 `game:null`, nickname 없는 me 예시와 진행 중 snapshot 모두 fixture로 통과하고 잘못된 payload는 기존 상태를 덮어쓰지 않음. **진행:** HTTP/Socket wire schema 분리·닉네임 adapter·대기실 fixture 검증 완료. screen별 진행 중 game 검증은 B-1 합의 후 진행하므로 미완료 유지.
- [ ] `FE-162` (P0/L, FE-070·085·120 보완, B-1·B-5 의존) RoomPage의 Lobby 고정 복원 경로를 screen resolver로 교체하고 CaptureStage·countdown·result 연결. **완료:** game:started→round:revealed→capture 전환 및 촬영 단계 새로고침에서 현재 라운드 복원.
- [ ] `FE-163` (계약/P0/M, FE-071~074 보완, B-4 의존) 2MB 제한, 마감 전 접수 후 느린 body/202, 응답 유실, 토큰 선소비 경계를 통합 검증. **완료:** 서버가 인정한 제출은 유지되고 중복 득점·맹목 토큰 재전송 없음.
- [ ] `FE-164` (P0/M, FE-080·123~125 보완) presence:ping 25초, ACK 오류, Retry-After, 세션 대체·방 이탈 시 타이머/handler 해제. **완료:** 중복 구독·연결 경쟁·종료 후 ping이 없고 background 복귀 때 snapshot 재검증.

## 12. 완료 증거 기록 규칙

- `[x]` 갱신 시 관련 변경/테스트 파일 또는 검수 기록을 남긴다. UI 구현, 계약 합의, 실서버 통합, 실기기 검증은 각각 해당 TODO에서 완료 처리한다.
- B 항목은 BE와 합의된 응답·이벤트 예시 및 오류 fixture가 있어야 완료다. FE가 추가한 가상 필드만으로 닫지 않는다.
- 출시 시 `FE-153` 추적표에 요구사항 ID → TODO ID → 검증 시나리오/결과를 연결한다.



### 2026-09-08 구현 검증 기록

- FE-160: RoomPage에서 세션 성공 후에만 방 조회. 세션 오류를 dependent query의 pending보다 먼저 표시해 무한 대기를 방지.
- FE-161 부분: `src/api/roomEntry.ts`에서 HTTP serverTimeMs 필수·room:joined 별도 schema·본인 닉네임 adapter 적용. `src/tests/fixtures/room.ts`, `src/api/roomEntry.test.ts`에 BE §13 대기실 계약 예시와 오류 검증 추가. game 필드는 기존 미확정 경계로 남아 있으며 전체 screen 검증은 아직 완료되지 않음.
- 소켓 생명주기 보완: 이전 연결의 handler 제거, 다른 slug의 room:joined 무시. `src/realtime/socket.test.ts`로 잘못된 데이터의 store 덮어쓰기와 이전 연결의 늦은 이벤트 차단 검증.
- 검증 결과: `pnpm test` 12개 파일·29개 테스트 통과, `pnpm lint` 통과, `pnpm build`(TypeScript 검사 포함) 통과. 실서버·실기기 QA는 미수행.


### 2026-09-08 대기실 생명주기 보완

- FE-052: 대기실의 방 닫기 확인·HTTP 성공 후 종료 화면·실패 안내를 연결. `room:closed`의 host_closed/expired 이벤트는 snapshot을 지우고 소켓과 타이머를 해제한다. 닫힌 방에 늦은 snapshot이 다시 반영되지 않도록 차단. 게임 화면은 아직 연결되지 않아 전체 종료 통합 항목은 미완료 유지.
- FE-053 부분: `host:changed`의 문자열 ID와 temporary를 검증하고 본인·참여자 방장 상태와 임시 방장 안내를 반영. 권한을 잃으면 열린 설정과 닫기 확인창을 숨긴다. HTTP/room:joined에 temporary 복원 필드가 없으므로 새로고침 후 임시 방장 복원은 계약 대기.
- FE-123~125 부분: 연결이 복구되는 동안 대기실 관리 명령 잠금, 10초 이상 단절 시 수동 재연결·처음으로 액션, session:superseded 이후 소켓 handler와 타이머 정리. 수동 재연결은 새로고침으로 기존 세션→state 부트스트랩을 다시 실행한다. 전체 게임 화면의 자동 snapshot 복구는 B-1/B-5와 함께 후속 진행.
- FE-164 부분: room:joined 검증 후 25초 presence:ping, ACK 오류/10초 시간 초과 시 연결 안내. 중복 가입·단절·교체·방 종료·세션 대체 때 타이머를 해제하고 오래된 ACK를 무시. Retry-After, foreground snapshot 재검증, 본인 participant:removed 처리는 남아 있어 미완료 유지.
- `room:settingsUpdated` 수신 시 생략된 emotionSet 보존. 방 닫기 실패를 확인창 내부에 표시하고 dialog 접근성 이름 제공.
- 검증: `npm run test` 14개 파일·43개 테스트, `npm run lint`, `npm run build`(타입 검사 포함) 통과. 관련 증거: `src/realtime/socket.test.ts`, `src/features/lobby/Lobby.test.tsx`, `src/components/ConnectionNotice.test.tsx`. 실서버 다중 세션·모바일 브라우저 QA는 미수행.


### 2026-09-08 게임 화면·결과·복원 구현

- FE-082·120·121·162 프론트엔드 경로: `RoomSession`이 소켓을 소유하고 lobby/countdown/capture/result/round_missed/final/종료 화면으로 분기한다. 스키마 검증한 HTTP snapshot과 실시간 이벤트를 공통 GameView로 변환한다. **서버 연동 미완료:** 현재 BE는 게임 중 `/state`와 소켓 재접속을 SERVICE_UNAVAILABLE로 거부한다. B-1/B-5/B-11 및 이 항목의 전체 완료 체크는 유지한다.
- FE-083·085·087: HTTP 서버 시각과 RTT 중간값으로 performance.now anchor 동기화, 카운트다운 전환, 마감 입력 잠금. 전송 중인 제출은 0초만으로 미제출 처리하지 않는다. `src/time/serverClock.test.ts`, `src/features/room/RoomSession.test.tsx` 검증.
- FE-088·089·091: 미제출 scoring/viewing·마지막 라운드 최종 대기, round:voided/closed 후 대기, 이전 roundId/라운드 인덱스 이벤트·늦은 202 폐기. `src/stores/gameState.test.ts` 검증.
- FE-100~106 부분, FE-103·104 완료: 참여자 ID 선택, 서버 순위 정렬과 350ms layout animation, 정상/no_face/failed/채점 대기, 확정 점수·포인트, 미디어 오류 자리표시자. 202 뒤 이전 결과를 백그라운드 조회하고 실패 시 도착한 결과와 재조회 안내를 유지한다. 전체 레일의 processing/missed 슬롯과 실제 backlog는 B-2/B-11 대기. `src/features/game/GameScreens.test.tsx` 검증.
- FE-112 부분, FE-113·114 완료: 최종 전체 순위와 본인 표시, mostLoved/null, 인원 부족/엔진 중단 사유, 새 방 링크·비활성 공유. 시상대 연출·나가기 전체 흐름은 후속. 점수와 수상자를 FE에서 계산하지 않는다.
- FE-123·124·125: 화면 전체에 단절·복원 중 조작 잠금과 중복 탭 안내 적용. 재가입/foreground/online 때 state를 조회한다. 소켓 가입이 connect보다 먼저 와도 정상 연결을 유지한다. `src/realtime/socket.test.ts`, `src/realtime/restore.test.ts`, 기존 ConnectionNotice 테스트 검증.
- FE-122·127 부분: 조회 중 이벤트/202 발생 시 오래된 응답 폐기·최대 3회 재조회·10초 제한·이탈 시 AbortController 정리. 게임 상태에서 이전 라운드 사진 토큰·촬영 토큰·viewer 큐 제거, 카메라 화면 unmount 정리. 서버 revision/replay의 완전한 유실 방지 및 실기기 수명 검증은 미완료.
- FE-163 부분: roundId별 토큰 1회 전송 잠금, 202보다 빠른 viewer 이벤트 임시 보관, 응답 유실 시 자동 재전송 금지. 새로고침을 가로지르는 멱등성은 B-4 대기.
- 제안한 result/final/missed snapshot 필드와 서버 작업은 [GAME_CONTRACT.md](./GAME_CONTRACT.md)에 명시. 실제 API 계약이 확정된 것으로 간주하지 않는다. 리액션/스킵 명령 UI는 B-3/Q-4 대기이며 집계 이벤트만 표시한다.
- 개발용 `/__preview/game`에서 결과·최종·미제출 미리보기 제공. 브라우저에서 390px 최종 화면과 320px 결과 화면을 확인했고, 320px에서 스크롤바로 발생하던 가로 넘침을 수정했다. 실제 카메라/게임 데이터로 수행한 검증은 아니다.


### 2026-09-08 제출 오류 분기·타이머 강조·무효 라운드

- FE-074: BE §16 업로드 오류표를 `describeUploadError`의 세 가지 복구 경로로 정리했다. 요청 전에 걸러진 사진(`LocalImageError`)만 재촬영을 허용하고, 서버 응답은 촬영 토큰이 이미 소비됐다고 보고 같은 사진을 다시 보내지 않는다. DEADLINE_PASSED는 재시도를 유도하지 않고 미제출 안내로, ALREADY_SUBMITTED는 서버가 인정한 제출로 결과 경로를 유지하며 이전 결과를 배경 조회한다. INVALID_CAPTURE_TOKEN·413·415는 현재 상태 조회만 수행한다.
- FE-086: 10초 이하에서 타이머를 강조하되 색 외에 `곧 마감` 문구와 aria-label로도 알린다. 분모는 서버 activeCount를 그대로 쓴다.
- FE-090: `round:voided`를 받으면 점수 없이 폐기하는 안내로 전환하고, 사진·촬영 토큰·전송 잠금을 정리한다. 미제출 화면에서도 같은 안내를 받는다. 3회 연속 무효의 중단은 서버 `game:finished{aborted:true, reason:"engine_unavailable"}`를 그대로 표시한다.
- FE-092: 촬영 중 도착한 다른 참여자의 결과 이벤트가 store에 남지 않음을 검증했다. 서버 페이로드 자체의 필드 노출 검사는 `FE-093`·`FE-148`로 남는다.
- 검증: `pnpm test` 21개 파일·88개 테스트, `pnpm lint`, `pnpm build`(타입 검사 포함) 통과. 실서버·실기기 QA는 미수행이며, 브라우저에서 촬영 화면의 강조 타이머를 눈으로 확인하지는 않았다.


### 2026-09-08 결과·최종 화면 시안 재작업

- 기준 시안: `emoselfie-DOCS/design/RoundResult.dc.html`, `FinalRanking.dc.html`과 `design/uploads/Design Delta.md`의 조치 목록. 레포의 `draft/`는 Design Delta가 잔재로 지목한 이전 버전이라 기준으로 쓰지 않았다.
- 라운드 결과: 라운드 칩·상태 배지·감정 칩·내 점수 요약, 사진 스테이지(좌우 이동·순위/점수 배지·리액션·점 표시), 실시간 순위 레일, 전원 활성 스킵 버튼과 감상 타이머로 재구성했다. 감정은 서버 snapshot의 `currentRound.emotion`과 `round:revealed`에서 이어 받는다.
- 최종 결과: 시상대(2·1·3), 가장 사랑받은 표정 독립 블록, 4위 이하 전체 순위, 새 방 만들기·비활성 공유·방 나가기로 재구성했다.
- 리액션·스킵은 BE §13.2 C→S(`reaction:sent`, `round:skip`)를 ack와 함께 보낸다. 총수는 서버 이벤트 값만 대입하고, 실패하면 눌림 표시를 되돌린다. 새로고침 뒤 내 리액션 복원은 서버 계약(B-3)이 없어 이번 범위에서 제외했다.
- 시안에 있으나 서버 계약에 없는 값은 넣지 않았다. 참여자별 최고 기록(`최고 무서움 96점`), 참여자 이모지, 참여자별 processing/missed 레일 슬롯이 이에 해당하며, 대기 슬롯은 서버 scoredTotal 분모만큼 익명으로 둔다.
- 검증: `pnpm test` 21개 파일·94개 테스트, `pnpm lint`, `pnpm build` 통과. 브라우저 `/__preview/game`에서 390×844와 320×700 두 화면을 확인했고 가로 넘침이 없다. 실서버 데이터·실기기 QA는 미수행.


### 2026-09-08 늦은 제출자 결과 공백 처리

- 증상: 나중에 제출한 참여자 화면에 `이전에 제출된 결과를 불러오지 못했어요` 경고가 뜨고, 먼저 제출한 참여자의 사진·리액션이 보이지 않았다.
- 원인: BE는 제출이 접수될 때 `rd:{roundId}:viewers`에 추가하므로 그 전에 발송된 `submission:scored`는 받지 못한다. FE가 공백을 메우려 호출하는 `GET /state`는 대기실 외 상태에서 503(SERVICE_UNAVAILABLE)을 반환한다. 즉 실패가 예정된 조회의 오류를 사용자에게 보여 주고 있었다.
- 조치: 게임이 진행 중이면 `/state` 503을 오류·경고로 표시하지 않고 실시간 이벤트 상태를 유지한다. 같은 경로를 쓰던 foreground 복원(탭 복귀·네트워크 복구·현재 상태 확인)도 게임 화면을 오류 화면으로 바꾸지 않는다.
- 조치: 결과 화면의 `채점 완료` 분자를 서버 `scoredCount`로 바꾸고, 내 목록에 없는 인원은 잠긴 `이전 결과` 슬롯과 안내 문구로 알린다. 없는 데이터를 지어내지 않고 공백만 정확히 표시한다.
- 남은 서버 작업: 결과 열람자로 승격될 때 이전 `submission:scored` backlog 전달(B-11) 또는 게임 중 `/state` 제공(B-1). 둘 중 하나가 들어오면 FE 배경 조회가 그대로 공백을 채운다.
- 검증: `pnpm test` 21개 파일·96개 테스트, `pnpm lint`, `pnpm build` 통과. `src/realtime/restore.test.ts`, `src/features/game/GameScreens.test.tsx`에 회귀 테스트 추가.
