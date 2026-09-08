# 이모셀피 Frontend 개발 계획

- 기준 계약: [Backend spec.md](../emoselfie-DOCS/development/backend/spec.md) v1.0 (§1~3, §6~11, §13~16)
- 화면·UX 보완: [Frontend spec.md](../emoselfie-DOCS/development/frontend/spec.md), [실행 TODO](./TODO.md)
- 작성일: 2026-09-07 / 갱신일: 2026-09-08
- 대상: MVP P0 프론트엔드
- 현재 상태: 기존 TODO상 Phase 0 완료. 소스에서 입장·대기실·카메라·업로드 구현을 확인했으며, 게임 화면 연결·결과·복원은 후속 작업이다. 이번 갱신은 문서 계획이며 실행 테스트나 실서버 연동 완료를 의미하지 않는다.

## 1. 목표

모바일 브라우저에서 사용자가 링크로 입장해 카메라 권한을 허용하고, 셀카를 촬영·제출한 뒤 실시간 결과와 최종 순위를 확인할 수 있는 프론트엔드를 구현한다.

프론트엔드는 서버가 내려준 방 상태, 화면, 마감 시각, 제출 결과, 순위, 포인트, 권한을 그대로 반영한다. 점수·순위·마감·방장 여부를 자체 판정하지 않는다.

## 2. 개발 원칙

1. 카메라 수직 슬라이스를 일찍 완성한다. 모바일 카메라와 업로드가 실패하면 나머지 UI를 완성해도 게임이 성립하지 않는다.
2. 서버 DTO는 adapter에서 검증한 뒤 store에 반영한다. 화면 컴포넌트가 wire payload를 직접 해석하지 않는다.
3. snapshot과 실시간 이벤트가 같은 서버 상태를 갱신하도록 reducer 경계를 하나로 유지한다.
4. 이미지·MediaStream·Object URL은 명시적인 소유자와 해제 시점을 갖는다.
5. 테스트는 시간 동기화, 재접속, 업로드 중복, 이미지 수명처럼 실패 비용이 큰 로직에 집중한다.
6. 미확정 기획과 백엔드 계약은 임시 필드로 우회하지 않는다. mock 계약과 실제 연동 계약을 분리한다.

## 3. 선행 조건

### 3.1 제품 결정

`spec.md` §2의 Q-7은 2026-09-08 확정했다(거울 방향·3:4 contain·크롭 없음). Q-1~Q-6을 확정해야 관련 UX를 완료할 수 있다.

| 묶음 | 결정 | 영향을 받는 단계 |
|---|---|---|
| 사진 | Q-1 삭제 안내, Q-7 미러링·크롭 | 카메라, 결과, 최종 화면 |
| 입장 | Q-2 진행 중 신규 입장, Q-6 자발적 나가기 | 입장, 대기실, 복원 |
| 실패 | Q-3 카메라 영구 손실 처리, Q-5 권한 조회 미지원 | 카메라, 권한 복원 |
| 진행 | Q-4 감상 시간·스킵 분모 | 라운드 결과 |

결정 전에도 레이아웃, 공통 컴포넌트, 카메라 서비스 경계, mock 기반 정상 흐름은 구현할 수 있다. 해당 문구와 분기만 완료 처리하지 않는다.

### 3.2 백엔드 계약

`spec.md` §10의 B-1~B-12 중 아래 네 묶음이 통합 개발의 게이트다.

| 게이트 | 포함 항목 | 완료되어야 시작 가능한 작업 |
|---|---|---|
| G1 상태 복원 | B-1, B-5, B-6 | 실서버 화면 복원, 이벤트 유실 방지, 최종 결과 재접속 |
| G2 결과 상태 | B-2, B-11, B-12 | 실시간 순위 레일, 기존 결과 backlog, 스킵 종료 |
| G3 명령 멱등성 | B-3, B-4 | 리액션·스킵 재시도, 업로드 응답 유실 복구 |
| G4 입장·권한 | B-7~B-10 | 정보 노출 차단, 닉네임, 권한 철회, 참여자 갱신 |

계약이 확정될 때 TypeScript DTO fixture를 함께 받아 contract test의 기준으로 사용한다.

## 4. 구현 단계

### Phase 0. 프로젝트 기반과 계약 경계

목표는 기능 구현을 안전하게 시작할 수 있는 실행·검증 환경을 만드는 것이다.

- Vite + React + TypeScript 프로젝트를 만들고 React Router, Zustand, TanStack Query, Socket.IO Client, Tailwind CSS, Motion을 설정한다.
- lint, typecheck, unit test, production build 명령을 구성한다.
- `/`, `/r/:slug`, not-found 라우트와 AppShell을 만든다.
- HTTP client, 공통 API error, DTO parser, mock adapter의 경계를 만든다.
- 환경별 base URL을 추가하지 않고 동일 오리진 `/api`, `/socket.io`, `/media`를 기본값으로 사용한다.
- CI에서 최소한 install, lint, typecheck, test, build를 실행한다.

완료 기준: 빈 화면이 아닌 AppShell이 모바일 뷰포트에서 렌더되고 모든 품질 명령이 통과한다.

### Phase 1. 디자인 시스템과 공통 UI

목표는 시안의 시각 언어와 접근성 규칙을 반복 가능한 컴포넌트로 만드는 것이다.

- v2 색상, 글꼴, 간격, 외곽선, 그림자, 모션을 CSS/Tailwind 토큰으로 옮긴다.
- Button, SettingChips, StatusBadge, Card, Sheet, Toast, ServerTimer, ErrorView를 구현한다.
- 320~430px 폭, safe-area, 동적 viewport 높이, 키보드, reduced-motion을 처리한다.
- 디자인 검수용 Story/demo route 또는 컴포넌트 fixture를 만든다. 운영 빌드에는 더미 게임 로직을 포함하지 않는다.

완료 기준: 390×844 기준 시안과 핵심 토큰이 일치하고, 320px 폭·큰 글자·키보드 환경에서도 주요 버튼을 사용할 수 있다.

### Phase 2. 세션·입장·대기실

목표는 방 생성부터 게임 시작 직전까지의 경로를 완성하는 것이다.

- `GET /api/me`, 방 생성, 기존 방 복원, 닉네임 저장 흐름을 연결한다.
- 권한 요청 전에는 방 세부 정보를 표시하지 않는 RoomEntry 상태 머신을 구현한다.
- Landing, NicknameSetup, CameraIntro, CameraBlocked, Lobby, 기본 ErrorStates를 구현한다.
- 방 설정, 링크 복사, 참여자 목록, 연결 상태, 방장 변경, 시작·방 닫기를 연결한다.
- Q-2·Q-6과 G4 계약이 확정되면 진행 중 신규 입장 및 나가기 분기를 완료한다.

완료 기준: 두 브라우저 세션이 방에 입장하고, 방장만 설정 변경·시작·닫기를 수행하며 서버 오류가 올바른 화면에 표시된다.

### Phase 3. 카메라·이미지·제출 수직 슬라이스

목표는 실제 모바일에서 카메라 켜기부터 서버의 제출 인정까지 한 경로를 완성하는 것이다.

- 사용자 탭에 의한 getUserMedia, 전면 카메라, track 정리, foreground 복구를 구현한다.
- 1.5초 로딩·3초 재시도와 권한 거부/장치 없음/사용 불가를 구분한다.
- Canvas 캡처, 비율 유지, 장변 720px 이하, JPEG 0.8, Blob URL 수명 관리를 구현한다.
- 촬영 확인, 재촬영, 제출, 제출 확인 중, 실패 재시도 UX를 구현한다.
- Q-7 확정 정책인 거울 방향·3:4 contain을 적용한다. 사진 전체를 유지하고 Canvas에서만 한 번 반전한다. G3의 B-4 확정 후 응답 유실·중복 접수를 완료한다.

완료 기준: iOS Safari와 Android Chrome 실제 기기에서 촬영한 이미지가 규격에 맞게 전송되고, 화면 이탈·재촬영·제출 후 track과 URL이 남지 않는다.

### Phase 4. 실시간 라운드 진행

목표는 서버 시각에 맞춘 카운트다운·촬영·제출 현황·미제출 흐름을 구현하는 것이다.

- Socket.IO singleton, 공통 이벤트 handler, Zustand reducer를 구현한다.
- snapshot의 serverTimeMs로 시계 오차를 보정하는 ServerClock을 만든다.
- Countdown, Play, 제출 현황, 마감 후 확인 상태, RoundMissed를 연결한다.
- roundId/request generation으로 오래된 이벤트와 응답을 폐기한다.
- round:voided, 게임 인원 부족, 마지막 라운드 미제출 흐름을 처리한다.

완료 기준: 두 클라이언트의 화면 전환이 서버 시각을 따르고, 촬영 중인 사용자에게 다른 사람의 점수·사진이 노출되지 않으며 미제출자는 결과 데이터를 받지 않는다.

### Phase 5. 결과·리액션·최종 순위

목표는 제출 직후부터 게임 종료까지의 재미 요소와 서버 권위 순위를 완성하는 것이다.

- ResultCarousel, RankRail, 채점 상태, no_face/failed 표시를 구현한다.
- selectedParticipantId를 유지하면서 서버 순서에 따라 레일을 300~500ms로 재정렬한다.
- 서명 mediaToken으로 사진을 조회하고 만료 시 자리표시자를 표시한다.
- ♥·⁇ 독립 토글, 자기 사진 차단, 서버 확정 상태, 재접속 복원을 구현한다.
- 감상 시간과 방장/전원 스킵, round:closed 정리를 구현한다.
- FinalRanking, mostLoved, 중단 종료, 새 방 만들기, 비활성 공유를 구현한다.

완료 기준: 12명이 짧은 간격으로 채점되어도 선택 중인 사진이 바뀌지 않고, 모든 순위·포인트·리액션이 서버 snapshot과 일치한다.

### Phase 6. 재접속·복구·보안 경계

목표는 모바일 네트워크 변화와 중복 탭에서도 상태를 잃지 않는 것이다.

- 소켓 재연결 뒤 `/state`를 다시 받아 atomic하게 store를 복원한다.
- G1의 revision/replay 계약으로 snapshot과 event 사이의 유실·역전을 막는다.
- session:superseded에서 자동 재연결을 중지한다.
- foreground 복귀, Wi-Fi/LTE 전환, reload, 10초 이상 단절을 검증한다.
- 권한 상실·방 종료·라운드 변경·게임 종료마다 미디어와 민감 상태를 제거한다.

완료 기준: 진행 단계마다 새로고침해도 동일 participantId, 제출 상태, 누적 포인트, 허용된 결과만 복원되고 이전 탭은 연결 경쟁을 반복하지 않는다.

### Phase 7. 모바일 QA와 출시 준비

목표는 PRD의 성능·호환성·완료 조건을 실제 환경에서 검증하는 것이다.

- iOS Safari 최신 2개 버전, Android Chrome 최신 2개 버전 테스트 매트릭스를 수행한다.
- 전화 수신, 화면 잠금, background/foreground, 회전, 저속 4G, 오프라인 복구를 검증한다.
- 2명·12명, 동시 제출, 마감 직전 제출, no_face, inference 실패, 방장 이탈을 E2E로 검증한다.
- 접근성, contrast, focus, touch target, reduced-motion을 점검한다.
- 초기 번들, 방 진입 렌더, 카메라 준비, 업로드→결과 시간을 측정하고 병목을 수정한다.
- 사용자/이미지/초대 링크/토큰이 로그·브라우저 저장소·캐시에 남지 않는지 검사한다.

완료 기준: [spec.md](./spec.md) §11의 시나리오와 PRD P0 추적표가 모두 통과하고 알려진 제한이 릴리스 노트에 기록된다.

## 5. 의존성과 병렬 진행

| 작업 | 선행 조건 | 통합 완료 게이트 |
|---|---|---|
| Phase 1 공통 UI | Phase 0 | 모바일 레이아웃 검수 |
| Phase 2 입장·대기실 | Phase 0, 카메라 권한 확인 | G4, 기존 참여자 복원은 G1 |
| Phase 3 촬영·제출 | Phase 0, 촬영 UI | B-4, 실제 모바일 업로드 |
| Phase 4 라운드 | Phase 2·3, 상태 reducer | G1을 먼저 적용해 화면 전환·복원 함께 검증 |
| Phase 5 결과 | Phase 4 | G2·G3 및 열람자별 접근제어 |
| Phase 6 전체 복구 검증 | 복구 기반은 Phase 4 전에 설계·구현 | 전 화면을 연결한 후 G1·G3 회귀 검증 |
| Phase 7 출시 검증 | Phase 1~6 | 실서버·실기기 E2E와 P0 완료 조건 |

- Phase 1은 API 계약과 독립적으로 진행할 수 있다.
- Phase 2와 Phase 3은 Phase 0 이후 병렬로 진행할 수 있다.
- Phase 4는 입장과 카메라 수직 슬라이스가 모두 동작한 뒤 통합한다.
- Phase 5는 mock으로 UI를 먼저 구현할 수 있지만 실제 완료는 G2·G3 계약에 의존한다.
- Phase 6은 초기에 설계하고 모든 화면이 연결된 뒤 전체 시나리오를 검증한다.

## 6. 품질 게이트

각 PR/변경 묶음은 다음을 만족해야 한다.

- 관련 요구사항 ID와 TODO ID를 설명에 기록한다.
- lint, typecheck, 관련 unit/integration test, production build가 통과한다.
- wire DTO나 상태 전이를 바꾸면 fixture와 reducer test를 함께 갱신한다.
- 카메라·미디어 변경은 생성과 해제 경로를 모두 검증한다.
- 서버 권위 값을 클라이언트 계산으로 대체하지 않는다.
- 사용자 화면에는 무한 로딩 대신 진행 상태, 남은 시간 또는 재시도 액션을 제공한다.
- 모바일 동작에 영향을 주는 변경은 실제 기기 확인 항목을 남긴다.

## 7. 완료 정의

MVP 프론트엔드는 다음 조건을 모두 만족할 때 완료다.

- `spec.md`의 Q-1~Q-7이 확정되어 화면과 문구에 반영되어 있다.
- B-1~B-12의 실제 서버 계약이 타입과 contract test에 반영되어 있다.
- P0 사용자 흐름이 두 명 이상 실제 서버에서 끝까지 동작한다.
- 서버가 허용하지 않은 사진·점수·순위 데이터가 미제출자와 권한 미허용자에게 노출되지 않는다.
- 실제 지원 모바일 브라우저에서 카메라, 업로드, 앱 복귀, 소켓 재연결을 검증했다.
- 이미지와 카메라 자원이 정의된 시점에 폐기되고 영구 브라우저 저장소에 남지 않는다.
- 품질 명령과 핵심 E2E 시나리오가 통과하며 성능 측정 결과가 기록되어 있다.


## 8. 백엔드 계약에서 도출한 화면·연동 작업

아래 값은 현행 BE 계약이다. PRD와 충돌하는 Q 항목은 기존 결정 대기로 유지하며, FE가 임의로 서버 계약을 변경하지 않는다.

| 화면/기능 | 요청·수신 계약 | FE 처리 및 합격 기준 | TODO |
|---|---|---|---|
| 세션·생성 | `GET/PATCH /api/me`, `POST /api/rooms` (§6, §8.1~2) | 세션 준비 후 방 조회. 200 existing/201 신규 구분, 쿠키 UUID를 JS 식별자로 사용하지 않음 | FE-040~044, FE-160 |
| 입장·대기실 | 방 조회·participants·settings·start·close, `room:joined`, `participant:*`, `host:changed` | 권한 획득 후 입장, active/waiting_next_game/left와 연결 상태 분리. 임시 방장 표시는 서버 temporary 사용 | FE-047~056, FE-161 |
| 화면 복원 | `/state`, BE §14 screen 표 | lobby/lobby_waiting_next/countdown/capture/result/round_missed/final/error_room_closed를 타입으로 구분 | FE-082, FE-120~122 |
| 감정 공개·촬영 | `game:started`, `round:revealed`, `submission:status` (§13) | 감정 표시·색·힌트는 서버 payload. 3초 후 전환은 countdownEndsAtMs, 마감은 deadlineAtMs 사용 | FE-083~087, FE-162 |
| 제출 인정 | multipart `image`, `X-Capture-Token`, 202 (§8.3) | JPEG 장변 ≤720px·quality 0.8, 서버 제한 2MB 검사. 202는 접수 인정이며 채점 완료와 구분 | FE-066~074, FE-163 |
| 개별·확정 결과 | `submission:scored`, `round:finalized`, `/media/{mediaToken}` | processing/submitted/no_face/failed/missed 구분. currentRank는 잠정 표시, rankPoints/totalPoints는 확정값 대입 | FE-100~106 |
| 리액션·스킵 | `reaction:sent/updated`, `round:skip/skipStatus` (§13.2) | 사진당 like/question 독립 토글, 자기 사진 차단, ACK 불명 상태에서는 토글 재전송 금지 | FE-107~111 |
| 미제출·무효 | `round:missed/missedUpdate/voided` (§10, §13) | scoring 안내 후 서버 nextRoundAtMs 대기. 미제출자에게 상세 결과 없음. 무효 라운드 재시도 없음 | FE-088~093 |
| 종료 | `round:closed`, `game:finished`, `room:closed` | 라운드 사진 정리. 중단 reason 구분, 최종 ranking/mostLoved 표시, 새 방 만들기 연결 | FE-112~116, FE-127 |
| 접속·권한 | `session:superseded`, `permission:changed`, `presence:ping` | 중복 탭 자동 연결 중지, 25초 presence 및 해제, 오프라인/복귀 시 snapshot 재검증 | FE-064~065, FE-123~128, FE-164 |

- 모든 ID는 문자열, `...AtMs`는 epoch milliseconds, 미확정 값은 계약에 따라 null로 취급한다(BE §7.2). `processing`은 접수/FE 상태이고 DB의 최종 submission ENUM과 구분한다.
- 0초 도달은 입력 잠금이다. 이미 전송 중인 요청을 미제출로 확정하지 않는다. 접수 시점은 서버가 헤더를 받은 시각이며, 마감 전 접수된 body의 완료가 늦어도 서버 판단을 따른다.
- BE 감상 시간은 `min(60, 10 + viewerCount × 2)`초이며 FE는 `viewingEndsAtMs`를 표시한다. 스킵 분모는 현재 연결된 열람자 집계, 정원·인원 부족은 participant.status 기준이다. Q-4 최종 정합성 확인은 별도다.
- `no_face`는 0.0점·30포인트, `failed`는 판정 불가·서버 보정 포인트, `missed`는 0포인트다. FE에서 동점 처리·평균 보정·수상자를 계산하지 않는다.
- `DEADLINE_PASSED`는 재시도 없는 미제출 경로, `ALREADY_SUBMITTED`는 기존 접수 조회, `NOT_CURRENT_ROUND`는 상태 재조회로 연결한다. `INVALID_CAPTURE_TOKEN`은 같은 토큰 반복 전송을 멈추고 현재 상태를 확인한다. 413/415는 같은 Blob 자동 재전송을 하지 않는다.
- 429는 `Retry-After`를 반영해 연타·폴링을 억제한다. 소켓 오류는 HTTP 오류 envelope와 다르므로 별도 parser를 둔다. `/media` 410은 자리표시자로 처리한다.

## 9. 현재 코드 기준 다음 실행 순서

기존 완료 체크는 작업 기록으로 보존한다. 파일이 존재한다는 이유만으로 통합 완료로 올리지 않는다.

| 순서 | 작업 묶음 | 현재 근거와 남은 일 | 종료 기준 |
|---|---|---|---|
| 1 | 계약 fixture와 입장 보정 | 세션 성공 후 방 조회하도록 수정·테스트 완료(FE-160). HTTP/room:joined 스키마 분리와 대기실 fixture 검증 완료. 진행 중 game 계약은 남아 있다 | FE-160·161, FE-API-01·10·13: 실제 wire 예시로 최초 방문·소켓 초기화 검증 |
| 2 | 상태 모델·시계·복구 기반 | snapshot·이벤트 공용 reducer와 서버 시각 anchor, screen resolver를 연결했다. 서버 revision/replay와 게임 중 `/state`는 BE 미구현이다 | FE-082~084·120~122: screen별 복원 및 snapshot/event 경합 검증 |
| 3 | 대기실 → 촬영 → 서버 접수 | 게임 경로·카운트다운·마감 잠금·업로드 오류 분기(FE-074·086·162)를 연결했다. 새로고침을 가로지르는 멱등성(FE-073·163)은 B-4 대기다 | FE-162~163·073~074·085~087: 두 명이 시작·촬영·202 인정까지 진행 |
| 4 | 결과 → 다음 라운드 → 최종 | 결과·미제출·무효·최종 화면과 접근제어 테스트를 연결했다. 전체 순위 레일(B-2), 결과 backlog(B-11), 리액션·스킵 명령(B-3/Q-4)이 남는다 | FE-088~093·100~116: 제출자/미제출자 흐름을 함께 완주 |
| 5 | 모바일 예외·출시 | 카메라 복귀·세션 대체·네트워크 변경 및 접근제어 | FE-064~065·123~128·140~155·164: 실제 기기와 실서버 증거 기록 |

계약 합의가 필요한 동안에는 결과 UI fixture, 카메라 복귀, 접근성 작업을 진행할 수 있다. 일정은 고정 날짜 대신 이 완료 기준으로 관리하고, B-1/B-3/B-4/B-5 합의 후 TODO의 S/M/L을 실제 담당자 기준으로 다시 산정한다. 백엔드·모델 준비와 실기기 확보는 별도 외부 의존성이며, mock 엔진 통과를 실제 모델 연동 완료로 기록하지 않는다.


## 10. 대기실 생명주기 후속 구현 (2026-09-08)

현재 확정된 BE §13 이벤트를 기준으로 방 종료, 임시 방장 변경, 25초 presence, 중복 탭 연결 중지와 대기실 명령 잠금을 보완했다. HTTP 방 닫기 성공과 소켓 종료 이벤트 양쪽에서 종료 화면으로 이동하며, 종료 뒤 늦은 snapshot/ACK가 상태를 되살리지 않도록 테스트했다. 연결 상태 안내는 10초 이후 수동 새로고침으로 세션·방 snapshot을 재조회할 수 있다.

다음 핵심 순서는 §9의 상태 모델·시계·게임 화면 연결이다. B-1/B-5 전체 복원 계약, temporary snapshot 필드, Retry-After 및 foreground 복원은 이번 구현으로 완료되지 않았다. 검증 결과와 항목별 완료 범위는 TODO의 대기실 생명주기 보완 기록을 따른다.


## 11. 게임 화면·복원 프론트엔드 연결 (2026-09-08)

RoomSession이 라우팅과 소켓 수명을 소유하도록 변경해 대기실→공개/촬영→결과→다음 진행→최종 화면을 연결했다. ServerClock을 HTTP 왕복 시간과 performance.now에 연결했다. state 복원은 진행 중 이벤트와 로컬 제출 인정에 의해 무효화되며, 재시도 횟수와 요청 시간을 제한한다. 전체 게임 화면에서 단절 시 미디어를 숨기고 입력을 잠근다.

BE 소스 검토 결과 `lobby_snapshot`과 소켓 connect가 waiting 이외에는 SERVICE_UNAVAILABLE을 반환한다. 따라서 FE의 screen resolver/contract fixture 검증과 실서버 전체 복원 완료를 구분한다. 다음 통합 작업은 [GAME_CONTRACT.md](./GAME_CONTRACT.md)의 result/final/missed 블록 합의, BE state/재가입 구현, B-5 revision/replay, B-11 결과 backlog, B-4 제출 멱등성이다. 프론트엔드는 미지원 시 복원 오류/재시도 또는 backlog 경고를 표시한다.


## 11. 제출 오류·무효 라운드 후속 구현 (2026-09-08)

BE §16 업로드 오류표를 복구 경로 세 가지로 정리했다. 요청 전에 걸러진 사진만 재촬영을 허용하고, 서버가 응답한 순간부터는 촬영 토큰이 소비된 것으로 보아 같은 사진을 다시 보내지 않는다. 마감 후 도착은 재시도를 유도하지 않고 미제출로, 중복 제출은 서버가 인정한 제출로 결과 경로를 유지한다. 무효 라운드는 점수 없이 폐기하고 미제출자에게도 같은 안내를 준다. 3회 연속 중단은 서버 `game:finished{aborted:true}`를 그대로 표시한다.

남은 순서는 §9의 4·5단계다. 새로고침을 가로지르는 업로드 멱등성(B-4), 전체 순위 레일(B-2), 결과 backlog(B-11), 리액션·스킵 명령(B-3/Q-4)은 계약 대기이며, 카메라 복귀(FE-064)와 반응형·시안 검수(FE-029·031), 실기기 QA는 계약과 무관하게 진행할 수 있다.
