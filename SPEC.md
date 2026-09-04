# emoselfie Frontend — 개발 명세

**버전** v1.0
**작성일** 2026-09-04
**대상 레포** `k8s11r/emoselfie-FE`
**기준 문서** `emoselfie-DOCS/requirements.md` (PRD **v1.1**) · `DECISIONS.md` · `development/Frontend Development Guidelines.md`
**디자인** `~/project/p1/emoselfie/*.dc.html` (구버전) + `emoselfie-DOCS/development/Design Delta.md` (갱신 지침)

---

## 0. 이 문서의 위치

PRD가 **무엇을 만들지**를 정한다면, 이 문서는 **Frontend가 그것을 어떻게 만드는지**를 정한다.

충돌 시 우선순위:

```
1. requirements.md (PRD v1.1, 승인본)
2. DECISIONS.md    (C-1 ~ C-12)
3. Design Delta.md  ← 시안 해석에 한해 정본
4. Frontend Development Guidelines
```

가이드라인은 PRD v0.6~v0.9 시점 문서라 v1.0에서 폐기된 내용을 일부 담고 있다 (좋아요 보너스, 카드 재정렬 등). 해당 항목은 [11. 가이드라인 반영 차이](#11-가이드라인-반영-차이)에 정리했고, 이 스펙은 전부 **PRD v1.1을 채택**했다.

`[가정]`은 원본 문서에 근거가 없어 이 스펙이 정한 값이다.

---

## 1. 목표 (Objective)

설치도 가입도 없이, 링크 하나로, 모바일 브라우저에서 **카메라 촬영부터 실시간 결과 확인까지 끊김 없이** 진행되게 한다.

Frontend는 **게임 규칙의 최종 판단자가 아니다.**

| Frontend가 책임지는 것 | Backend에 맡기는 것 |
|---|---|
| 모바일 웹 UI | 라운드 시작·종료 시점 |
| 카메라 권한·스트림 제어 | 제출 마감 여부 |
| 셀카 촬영 | 제출 성공 여부 |
| 업로드 전 리사이즈·압축 | 감정 점수·순위·포인트 |
| API 호출 | 방장 여부 |
| 실시간 이벤트 수신·반영 | 참여 가능 여부 |
| 재접속 UX | 최종 순위 |

Frontend가 계산한 값은 **화면 표시를 위한 보조 정보**일 뿐이다.

성공 기준 3가지:

1. 실제 iOS Safari와 Android Chrome에서 카메라가 안정적으로 동작한다.
2. 서버가 내려준 마감 시각과 화면의 타이머가 일치한다.
3. 백그라운드 전환·네트워크 전환·새로고침 뒤에도 게임으로 돌아온다.

---

## 2. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| Language | TypeScript | `strict: true` |
| Framework | React + Vite | |
| Routing | React Router | |
| State | Zustand + TanStack Query | 역할 분리는 §7 |
| Realtime | Socket.IO Client | |
| Styling | Tailwind CSS | |
| Animation | Motion | layout animation 활용 |
| Browser API | MediaDevices, Canvas, Blob / Object URL | |
| Test | Vitest + Testing Library + Playwright | **[가정]** |
| Lint/Format | ESLint + Prettier + `tsc --noEmit` | **[가정]** |
| 패키지 관리 | pnpm | **[가정]** |

무거운 이미지 라이브러리를 추가하지 않는다. 브라우저 API를 우선한다 (가이드 §5.2).

---

## 3. 모듈 맵

8개 모듈.

| ID | 모듈 | 책임 | 상세 |
|---|---|---|---|
| **FE-1** | `shell` | 라우팅·소켓·스토어·서버 시각 타이머 | [spec/FE-1-shell.md](spec/FE-1-shell.md) |
| **FE-2** | `onboarding` | 랜딩·닉네임·방 생성/입장·오류 화면 | [spec/FE-2-onboarding.md](spec/FE-2-onboarding.md) |
| **FE-3** | `camera` | 사전 안내·권한·스트림 수명 관리 | [spec/FE-3-camera.md](spec/FE-3-camera.md) |
| **FE-4** | `lobby` | 로스터·초대 링크·설정·시작 | [spec/FE-4-lobby.md](spec/FE-4-lobby.md) |
| **FE-5** | `capture` | 프리뷰·캡처·압축·업로드 | [spec/FE-5-capture.md](spec/FE-5-capture.md) |
| **FE-6** | `round-result` | 캐러셀 + 레일·재정렬·리액션·스킵·미참여 화면 | [spec/FE-6-round-result.md](spec/FE-6-round-result.md) |
| **FE-7** | `final` | 시상대·순위표·새 방 만들기 | [spec/FE-7-final.md](spec/FE-7-final.md) |
| **FE-8** | `resilience` | 재접속·스냅샷 복원·앱 전환 복귀 | [spec/FE-8-resilience.md](spec/FE-8-resilience.md) |

### 의존 방향

```
   FE-1 shell  ──────────────── (횡단: 모든 화면이 사용)
        │
        ▼
   FE-2 onboarding
        │
        ▼
   FE-3 camera  ◄──────┐
        │              │ 스트림 재개
        ▼              │
   FE-4 lobby          │
        │              │
        ▼              │
   FE-5 capture  ──────┘
        │
        ▼
   FE-6 round-result
        │
        ▼
   FE-7 final

   FE-8 resilience ──── (횡단: FE-1·3·5·6에 훅을 건다)
```

`FE-3 camera`는 FE-4와 FE-5 양쪽이 쓴다. 대기실에서 권한만 확인하고 트랙을 끄고, 촬영 화면에서 다시 켠다. 스트림 수명을 한 곳에서 관리해야 하는 이유다.

### 빌드 순서

| 순서 | 모듈 | PRD 마일스톤 | 완료 판정 |
|---|---|---|---|
| 1 | FE-1 | M2 | 소켓 연결 + 서버 시각 기준 타이머 |
| 2 | FE-3 | M1/M2 | 실기기에서 권한 요청·거부·복구 |
| 3 | FE-2 | M2 | 링크 → 닉네임 → 카메라 준비 |
| 4 | FE-4 | M2 | 2명이 대기실에 모이고 시작 |
| 5 | FE-5 | M2 | 촬영 → 720/0.8 → 업로드 |
| 6 | FE-6 | M3 | 캐러셀 + 레일 + 리액션 + 스킵 |
| 7 | FE-7 | M3 | 시상대 + 새 방 만들기 |
| 8 | FE-8 | M3 | 새로고침·백그라운드 복귀 |

**FE-3을 두 번째에 두는 이유** — 카메라 권한 플로우는 데스크톱에서 검증되지 않는다. 실기기 이슈가 늦게 터지면 이후 화면 설계가 흔들린다. 스텁 화면 위에서라도 먼저 실기기에서 뚫어 둔다.

---

## 4. 프로젝트 구조

```text
emoselfie-FE/
├── SPEC.md
├── spec/                        # 모듈별 상세 명세
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx                  # 라우팅
    ├── routes/                  # 화면 1:1 (PRD 6.1)
    │   ├── Landing.tsx          # 1
    │   ├── Nickname.tsx         # 2
    │   ├── CameraIntro.tsx      # 3
    │   ├── CameraBlocked.tsx    # 4
    │   ├── Lobby.tsx            # 5
    │   ├── RoundReveal.tsx      # 6
    │   ├── Capture.tsx          # 7
    │   ├── RoundResult.tsx      # 8
    │   ├── RoundMissed.tsx      # 9
    │   ├── FinalRanking.tsx     # 10
    │   └── ErrorScreen.tsx      # 11
    ├── realtime/
    │   ├── socket.ts
    │   └── handlers/
    │       ├── room.ts
    │       ├── round.ts
    │       ├── submission.ts
    │       ├── reaction.ts      # ← like.ts 아님 (v1.0)
    │       └── skip.ts
    ├── stores/                  # Zustand
    │   ├── connection.ts
    │   ├── room.ts
    │   ├── participants.ts
    │   ├── game.ts
    │   ├── round.ts
    │   ├── camera.ts
    │   └── submission.ts
    ├── api/                     # TanStack Query
    │   ├── client.ts
    │   ├── session.ts
    │   └── rooms.ts
    ├── camera/
    │   ├── useCameraPermission.ts
    │   ├── useCameraStream.ts
    │   └── capture.ts           # Canvas 리사이즈·압축
    ├── components/
    ├── hooks/
    │   ├── useServerCountdown.ts   # deadlineAt 기준
    │   └── useVisibilityResume.ts
    └── lib/
        ├── serverTime.ts
        └── constants.ts
```

**규칙**

- Socket.IO 이벤트 처리 코드를 화면 컴포넌트에 흩어놓지 않는다 (가이드 §8).
  ```
  Socket.IO → Event Handler → Zustand → React
  ```
- `routes/`는 PRD 6.1 화면 목록과 1:1로 대응한다. 화면이 늘면 PRD를 먼저 고친다.
- 게임 규칙 계산을 컴포넌트에 두지 않는다. 애초에 계산하지 않는다 — 서버가 준다.

---

## 5. 커맨드

```bash
pnpm install
pnpm dev                     # Vite 개발 서버
pnpm dev --host              # 실기기 접속용 (HTTPS 필요, 아래 참고)
pnpm build
pnpm preview
pnpm test                    # Vitest
pnpm test:e2e                # Playwright (모바일 에뮬레이션)
pnpm lint
pnpm typecheck               # tsc --noEmit
```

**실기기 테스트에는 HTTPS가 필수다.** `getUserMedia`는 secure context에서만 동작한다 (PM-14). `localhost`는 예외지만 실기기에서 LAN IP로 붙을 때는 아니다. `vite-plugin-mkcert` 또는 터널을 쓴다. **[가정]** — 이 설정이 없으면 FE-3을 실기기에서 검증할 수 없다.

---

## 6. 코드 스타일

- **TypeScript strict.** 서버 이벤트 페이로드에 `any`를 쓰지 않는다. `src/types/events.ts`에 이벤트별 타입을 정의하고 BE 계약과 맞춘다.
- **시간** — `Date.now()`를 직접 쓰지 않는다. `lib/serverTime.ts`의 보정된 시각만 쓴다. 이유는 §8.
- **매직 넘버 금지** — `720`, `0.8`, `500`, `1500` 같은 값은 `lib/constants.ts`에 요구사항 ID 주석과 함께 둔다.
  ```ts
  /** CP-04: 장변 최대 720px, JPEG 품질 0.8 */
  export const CAPTURE_MAX_EDGE = 720;
  export const CAPTURE_JPEG_QUALITY = 0.8;
  ```
- **요구사항 링크** — 규칙을 구현한 훅·함수 상단에 요구사항 ID를 적는다. 요구사항과 연결할 수 없는 기능은 임의로 추가하지 않는다 (가이드 §16).
- **네이밍** — PRD 14장 용어를 따른다. `like`가 아니라 `reaction`, `score`(감정 점수)와 `points`(순위 포인트)를 섞지 않는다.
- **Blob URL** — 만들면 반드시 `URL.revokeObjectURL()`로 해제한다. `useEffect` cleanup에 붙인다.
- **문구** — 조롱·평가어를 쓰지 않는다. 낮은 점수도 경고색이 아니라 **해당 감정의 색**으로 표시한다 (PRD 6.5).

---

## 7. 상태 관리

성격에 따라 저장 위치를 나눈다.

| 도구 | 대상 | 예 |
|---|---|---|
| **Zustand** | 게임 중 계속 변하는 클라이언트 상태 | `connection` `room` `participants` `game` `round` `camera` `submission` |
| **TanStack Query** | 일반 HTTP 요청 상태 | 방 생성, 방 조회, 초기 상태 복원, 닉네임 변경 |

Socket.IO 이벤트로 지속적으로 변하는 데이터를 TanStack Query만으로 관리하려 하지 않는다 (가이드 §7).

**서버 사진을 브라우저 저장소에 넣지 않는다.** `localStorage` `sessionStorage` `IndexedDB` `Cache Storage` 전부 금지 (가이드 §5.3). 라우팅 상태·닉네임 캐시 정도의 비이미지 데이터만 예외적으로 허용한다 — 닉네임은 어차피 서버가 기억한다 (ID-04).

---

## 8. 시간 처리

Frontend 전체에서 가장 틀리기 쉬운 부분이다.

| ID | 규칙 |
|---|---|
| RD-08 | 서버가 **절대 마감 시각**을 내려주고, 클라이언트는 남은 시간을 **표시만** 한다. |

```
deadlineAt (서버 절대 시각)
      ↓
현재 시각과 비교
      ↓
남은 시간 표시
```

금지:

```
화면 진입 → 20초짜리 클라이언트 타이머 시작
```

### 시계 오차 보정

사용자 기기 시계는 몇 초씩 틀어져 있을 수 있다. `deadlineAt - Date.now()`를 그대로 쓰면 어떤 사람은 3초 일찍, 어떤 사람은 3초 늦게 끝난다.

`lib/serverTime.ts`가 서버 응답 헤더 또는 `round:revealed` 수신 시각으로 오프셋을 계산하고, 모든 카운트다운이 이 보정 시각을 쓴다. **[가정]** — PRD는 "표시만 한다"까지만 정했고 보정 방식은 정하지 않았다.

타이머가 0에 닿아도 **Frontend가 제출 마감을 판정하지 않는다.** 서버의 이벤트를 기다린다. 0 표시는 UI일 뿐이다.

---

## 9. 경계 (Boundaries)

### 항상 한다

- 서버가 준 값을 그대로 표시한다.
- 서버 절대 시각 기준으로 카운트다운한다.
- 이미지는 업로드 전에 720px / JPEG 0.8로 압축한다.
- Blob URL을 쓰고 나면 해제한다.
- 대기실을 나설 때 MediaStream 트랙을 정지한다.
- 모든 대기 상태에 남은 시간·진행 상황·남은 인원 중 하나를 보여준다.
- 실기기(iOS Safari / Android Chrome)에서 검증한 뒤 완료 처리한다.

### 먼저 물어본다

- 요구사항 ID로 추적되지 않는 UI·기능을 추가할 때.
- 새 런타임 의존성을 추가할 때 (특히 이미지·애니메이션 라이브러리).
- P1/P2 요구사항을 MVP로 끌어올릴 때.
- 서버 계약(API·이벤트)을 바꿔야 할 때.

### 절대 하지 않는다

```
❌ 점수·순위·포인트·방장 여부·제출 마감·제출 성공·라운드 완료를 FE가 결정
❌ 클라이언트 자체 타이머로 라운드 시간 계산
❌ 사진첩·파일 선택 업로드 경로 제공 (CP-03, PM-06)
❌ 촬영 이미지를 localStorage / sessionStorage / IndexedDB / Cache Storage 에 저장
❌ "판별 후 즉시 삭제" 문구 사용 (PRD v1.1에서 실제 보관 기간에 맞춰 교체됨)
❌ 타인 사진 다운로드·저장 버튼 제공 (PV-04)
❌ 서버에서 전체 결과를 받아 display:none 으로 가리기 (RS-12)
❌ Backend에서 받지 않은 결과를 추론해 표시
❌ 페이지 로드 직후 getUserMedia() 자동 호출 (PM-01)
❌ 대기실에서 카메라를 켜둔 채 유지 (PM-04)
❌ 업로드 시작을 제출 성공으로 처리
❌ 원본 해상도 이미지 전송 (CP-04)
❌ 무한 로딩 상태
❌ 감정 표시 이름·색·설명을 하드코딩 (서버가 내려준다, EM-02)
```

---

## 10. 테스트 전략

| 계층 | 대상 | 도구 |
|---|---|---|
| unit | Canvas 리사이즈 비율, 서버 시각 보정, 레일 정렬, 스킵 분모 | Vitest |
| component | 화면별 상태 렌더링, 리액션 토글, 비활성 버튼 | Testing Library |
| e2e | 링크 → 닉네임 → 권한 → 대기실 → 촬영 → 결과 | Playwright (mock 서버) |
| **실기기** | **카메라 전 구간** | 수동 체크리스트 |

### 실기기 체크리스트 (필수)

가이드 §13이 명시한 대로, 아래는 **Desktop Chrome에서 동작한다고 완료 처리하지 않는다.**

```
[iOS Safari 최신 2개 버전 / Android Chrome 최신 2개 버전]

□ 최초 권한 요청 다이얼로그가 버튼 탭으로만 뜬다
□ 권한 거부 후 설정 안내 시트가 해당 OS 경로를 보여준다
□ 설정에서 허용 후 복귀 → 대기실 입장
□ 대기실에서 카메라 표시등이 꺼져 있다
□ 촬영 화면 진입 시 권한 다이얼로그가 다시 뜨지 않는다
□ 전화 수신 → 복귀 시 프리뷰 자동 재개
□ 앱 전환 → 복귀 시 프리뷰 자동 재개
□ 화면 잠금 → 복귀 시 프리뷰 자동 재개
□ 자동 재개 실패 시 "카메라 다시 켜기" 버튼 노출
□ 다른 앱이 카메라 점유 중 → 거부와 구분되는 메시지
□ 세로 모드 고정, 가로 회전 시 레이아웃 붕괴 없음
□ Blob 업로드 성공
□ Wi-Fi ↔ LTE 전환 후 소켓 재연결 + 상태 복원
□ 페이지 새로고침 후 현재 라운드 복귀
□ 서버 마감 시각과 화면 타이머 일치 (2기기 동시 비교)
```

### 커버리지

`camera/capture.ts`, `lib/serverTime.ts`, 레일 정렬 로직처럼 **순수 계산**은 라인 커버리지 90% 이상. **[가정]** — UI 컴포넌트는 수치 목표를 두지 않고 위 체크리스트로 판정한다.

---

## 11. 가이드라인 반영 차이

`Frontend Development Guidelines.md`는 PRD v1.0 이전 문서다. 아래는 **가이드라인이 아니라 PRD v1.1을 따른다.**

| 가이드라인 | 위치 | PRD v1.1 · 이 스펙 |
|---|---|---|
| "좋아요 보너스"를 서버 신뢰 목록에 포함 | §3.1 | 리액션은 **점수에 반영되지 않음**. 보너스 개념 자체가 소멸 (RX-01, SC-06) |
| "❌ 좋아요 포인트 계산" | §14 | 계산할 포인트가 없다. 리액션 집계 수만 표시 |
| `realtime/handlers/like.ts` | §8 | **`reaction.ts`** + **`skip.ts`** |
| "카드가 점수 순서로 재배치" | §12 | **사진 캐러셀 + 하단 가로 순위 레일.** 재정렬은 레일 썸네일이 담당하고 **캐러셀은 바뀌지 않는다** (RS-03, C-2) |
| 언급 없음 | — | `round:skip` / `round:skipStatus` — 전원 스킵 (RS-15, C-10) |
| 언급 없음 | — | 리액션 2종 ♥ ⁇, 사진당 1회, 토글, 자기 사진 금지 (RX-01~11) |
| 언급 없음 | — | 감상 시간 `min(60, 10 + 인원×2)`초 (RS-08) |
| 언급 없음 | — | 제한시간 15/20/30초, 기본 **20초** (RD-03/04, C-5) |
| 언급 없음 | — | 방 이름·CODE 배지 **삭제**, 12자 slug 링크 전용 (C-8, C-9) |
| 언급 없음 | — | 대기실 로스터에서 **권한 상태 → 연결 상태** (RO-07, C-7) |
| 언급 없음 | — | 최종 화면 CTA는 전원 동일하게 **"새 방 만들기"** (FN-03, C-12) |

### 디자인 시안 — 확보됐고, 전부 구버전이다

`~/project/p1/emoselfie/`에 Claude Design 캔버스 6개가 있다. 전부 **2026-09-03** 작성분으로, DECISIONS.md와 PRD v1.0(09-04)보다 하루 앞선다. DECISIONS.md가 예고한 잔재를 실제 파일에서 검색한 결과 **하나도 빠짐없이 남아 있다.**

```
Play.dc.html          phase:"wait" · 건너뛰기 · 자동 제출 · seconds ?? 30 · 설렘 · 당황
RoundResult.dc.html   ranked[cursor] · canLike = final && !curIsMe · likes[id] · isHost 스킵
Lobby.dc.html         CODE {{ roomCode }} · roomName · denied · 준비 프로그레스
FinalRanking.dc.html  primaryLabel: isHost ? "한 판 더 하기"
Design Tokens.dc.html / v2   설렘 · 당황
```

**파일 단위 수정 목록은 [Design Delta.md](../emoselfie-DOCS/development/Design%20Delta.md)에 정리했다.** 구현은 그 문서를 기준으로 한다. 시안 파일 자체는 아직 수정하지 않았다.

핵심만 옮기면:

| 항목 | 내용 |
|---|---|
| 토큰 정본 | **`Design Tokens v2.dc.html`**. v1은 폐기 (v2의 hex가 PRD 5.4와 정확히 일치) |
| 감정색 | **팔레트는 그대로.** 설렘 `#FF3D86` → 무서움, 당황 `#B8F16A` → 우웩. 이름표만 이동 |
| 코드 버그 3건 | `ranked[cursor]` · `canLike`의 `final` 조건 · 증가식 `like()` — 파일에 그대로 있다 |
| 신규 화면 4개 | 3 카메라 사전 안내 · 4 참여 불가 · 9 라운드 미참여 · 11 오류 |
| 시각 언어 | v2의 스티커 팝(3px 검정 외곽선 + 하드 섀도 + Jua/Pretendard) 승계 |

---

## 12. 요구사항 추적

| 요구사항 | 모듈 |
|---|---|
| ID-04, ID-05 (표시·복원) | FE-2, FE-8 |
| RO-01, RO-03, RO-05, RO-15, RO-16 | FE-2 |
| RO-06 ~ RO-08, RO-13, RO-17 | FE-4 |
| PM-01 ~ PM-16 | FE-3 |
| RD-03, RD-08, RD-09, RD-10 | FE-5 |
| EM-02 (표시) | FE-5 |
| CP-01 ~ CP-06 | FE-5 |
| RS-01 ~ RS-15 | FE-6 |
| RX-01 ~ RX-10 | FE-6 |
| FN-01 ~ FN-04, RX-11 | FE-7 |
| PV-03, PV-04 | FE-3, FE-5, FE-6 |
| 7.1, 7.2, 7.3 | FE-1, FE-8 |
| 6.5 UI 원칙 | 전 모듈 |

BE 담당 요구사항은 `emoselfie-BE/SPEC.md` 참조.

---

## 13. 성능 목표

```
초대 링크 → 대기실 렌더링    p95 2초 이내 (4G)
라운드 상태 전환 편차         500ms 이내
```

- 초기 bundle을 작게 유지한다. 게임 시작 전에 필요 없는 코드는 lazy load한다 (가이드 §15).
- `RoundResult` `FinalRanking` `Capture`는 라우트 단위 code splitting 대상이다.
- 대기실 진입 경로(`Landing → Nickname → CameraIntro → Lobby`)가 초기 청크다.
- Motion은 결과 화면에서만 필요하므로 함께 분할한다.

---

## 14. Definition of Done

가이드 §16을 v1.0 기준으로 갱신했다.

**기능**
- [ ] 요구사항 ID가 명확하다.
- [ ] 정상 flow가 동작한다.
- [ ] Backend 상태를 기준으로 동작한다.

**Mobile**
- [ ] iOS Safari에서 검증했다.
- [ ] Android Chrome에서 검증했다.

**Camera**
- [ ] 최초 권한 요청 flow 정상.
- [ ] 거부 flow 정상 (설정 안내 시트 포함).
- [ ] 앱 전환 후 복구 가능.

**Image**
- [ ] 장변 720px 이하로 리사이즈된다.
- [ ] JPEG 0.8로 변환된다.
- [ ] 원본을 서버로 보내지 않는다.
- [ ] 로컬에 영구 저장하지 않는다. Blob URL을 해제한다.

**Realtime**
- [ ] reconnect가 동작한다.
- [ ] reload 이후 현재 게임 상태를 복원한다.
- [ ] 서버 deadline과 UI 타이머가 일치한다.

**Result**
- [ ] 서버가 안 준 결과를 추론해 표시하지 않는다.
- [ ] 레일이 재정렬되어도 캐러셀이 바뀌지 않는다.

- [ ] `lint` · `typecheck` · `test` 전부 통과.

---

## 15. 최우선 순서

막히면 이 순서로 판단한다.

1. 모바일 카메라가 안정적으로 동작하는가
2. 사용자가 권한 요청 과정을 이해할 수 있는가
3. 촬영부터 제출까지 빠르게 진행되는가
4. 실시간 게임 상태가 서버와 일치하는가
5. 재접속했을 때 게임으로 복귀할 수 있는가
6. 이미지가 불필요하게 저장되거나 전송되지 않는가
7. 결과 화면이 재미있고 자연스럽게 움직이는가
