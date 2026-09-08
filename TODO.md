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
- [ ] `FE-028` (P0/M) ErrorView·ConnectionNotice 구현
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
- [ ] `FE-074` (P0/M) DEADLINE_PASSED/ALREADY_SUBMITTED/INVALID_CAPTURE_TOKEN/NOT_CURRENT_ROUND/413/415 분기 `CP-10`
- [x] `FE-075` (P0/M) 카메라·Blob·Object URL 자원 해제 테스트

## 5. 실시간 게임 — Phase 4

- [x] `FE-080` (P0/M) Socket.IO singleton과 connect/disconnect 생명주기 구현
- [ ] `FE-081` (P0/M) room/participant/round/submission/session 공통 handler 구현
- [ ] `FE-082` (P0/L) snapshot과 이벤트가 공유하는 Zustand reducer 구현
- [ ] `FE-083` (P0/M) serverTimeMs·performance.now 기반 ServerClock 구현 `RD-08`
- [ ] `FE-084` (P0/M) foreground·재접속 시 시계 재동기화와 타이머 테스트
- [ ] `FE-085` (P0/M) Countdown 감정 카드·3초 전환 구현 `RD-02·03`, `EM-02`
- [ ] `FE-086` (P0/S) 제출 현황과 10초 이하 타이머 강조 구현 `RD-03·09`
- [ ] `FE-087` (P0/M) 타이머 0 입력 잠금과 서버 진행 확인 상태 구현 `RD-08`
- [ ] `FE-088` (P0/M) RoundMissed scoring/viewing 2단계 화면 구현 `RS-11~14`
- [ ] `FE-089` (P0/S) 마지막 라운드 미제출의 최종 결과 대기 문구 구현 `FN-01`
- [ ] `FE-090` (P0/M) round:voided와 다음 라운드/3회 중단 처리
- [ ] `FE-091` (P0/M) roundId·요청 generation으로 오래된 응답/이벤트 폐기
- [ ] `FE-092` (P0/M) 촬영 중 사용자에게 결과 필드가 저장·표시되지 않는 접근제어 테스트 `RS-09`
- [ ] `FE-093` (P0/M) 미제출자 snapshot/event에 결과 상세가 없는 contract test `RS-12`

## 6. 결과·리액션·최종 화면 — Phase 5

- [ ] `FE-100` (P0/L) ResultCarousel과 participantId 기반 선택 구현 `RS-02·03`
- [ ] `FE-101` (계약/P0/L) B-2 서버 순서 기반 RankRail과 processing/missed 슬롯 구현 `RS-03·04·06`
- [ ] `FE-102` (P0/M) 레일 300~500ms layout animation·이벤트 합치기·큐 정리 `RS-03`
- [ ] `FE-103` (P0/M) no_face/failed/processing/정상 결과 표현 `SC-04·05`
- [ ] `FE-104` (P0/M) 점수 소수 한 자리와 finalized 후 포인트 분리 표시 `SC-01·09`
- [ ] `FE-105` (P0/M) mediaToken 사진 조회·no-store·410 자리표시자 구현 `PV-02·04`
- [ ] `FE-106` (계약/P0/M) B-11 결과 진입 시 이전 제출 backlog 복원
- [ ] `FE-107` (P0/L) ReactionButtons ♥·⁇ 독립 토글·자기 사진 비활성 구현 `RX-01~08`
- [ ] `FE-108` (계약/P0/M) B-3 서버 확정 내 리액션 상태·응답 유실·재접속 복원
- [ ] `FE-109` (P0/M) reaction:updated 총수 대입과 라운드 종료 후 잠금 `RX-09·10`
- [ ] `FE-110` (결정/P0/M) Q-4 감상 타이머·일반 스킵·방장 즉시 스킵 UI `RS-08·15`
- [ ] `FE-111` (계약/P0/M) B-12 0명 분모·skip 가능 단계·종료 경계 처리
- [ ] `FE-112` (P0/L) FinalRanking 시상대·전체 순위·본인 행 구현 `FN-01·02`
- [ ] `FE-113` (P0/M) mostLoved 독립 수상·null 상태 구현 `RX-11`
- [ ] `FE-114` (P0/S) 중단 reason 안내 구현
- [ ] `FE-115` (P0/S) 새 방 만들기·나가기·비활성 공유 구현 `FN-03·04`
- [ ] `FE-116` (결정/P0/S) Q-1 확정 삭제 문구를 모든 화면에 통일

## 7. 재접속·복구 — Phase 6

- [ ] `FE-120` (계약/P0/L) B-1 screen union 기반 RoomScreenResolver 구현 `ID-05`
- [ ] `FE-121` (P0/L) 초기·reload·소켓 재연결 `/state` atomic restore 구현 `ID-05`
- [ ] `FE-122` (계약/P0/L) B-5 revision/replay 적용과 snapshot/event 역전 테스트
- [ ] `FE-123` (P0/M) 연결 변경 중 mutation 잠금과 ConnectionNotice 구현
- [ ] `FE-124` (P0/M) 10초 이상 단절 후 수동 다시 연결·랜딩 이동 구현
- [ ] `FE-125` (P0/M) session:superseded 자동 재연결 중지·사용자 재연결 구현 `ID-07`
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

`FE-028`은 ErrorView가 존재하나 ConnectionNotice가 남아 있고, `FE-053/081`은 일부 소켓 handler만 존재하며, `FE-083`은 시계 계산 함수만 존재한다. 해당 체크는 전체 완료 조건 충족 때 갱신한다.

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
