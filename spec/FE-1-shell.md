# FE-1 · shell

**의존** 없음
**요구사항** RD-08, ID-08, 7.2, 7.3 · 가이드 §3, §7, §8
**화면** 없음 (인프라 계층)

---

## 목표

모든 화면이 딛고 설 바닥을 만든다. 라우팅, 소켓 1개, 스토어, **서버 시각 기준 카운트다운**.

특히 시간 처리를 여기서 한 번에 해결한다. 화면마다 각자 타이머를 돌리면 RD-08이 반드시 깨진다.

---

## 라우팅

PRD 6.1 화면 목록과 1:1.

| 경로 | 화면 | # |
|---|---|---|
| `/` | 랜딩 | 1 |
| `/r/:slug` | 진입점 → 상태에 따라 분기 | — |
| `/r/:slug/nickname` | 닉네임 설정 | 2 |
| `/r/:slug/camera` | 카메라 사전 안내 | 3 |
| `/r/:slug/blocked` | 참여 불가 안내 | 4 |
| `/r/:slug/lobby` | 대기실 | 5 |
| `/r/:slug/reveal` | 라운드 시작 | 6 |
| `/r/:slug/capture` | 촬영 | 7 |
| `/r/:slug/result` | 라운드 결과 | 8 |
| `/r/:slug/missed` | 라운드 미참여 안내 | 9 |
| `/r/:slug/final` | 최종 결과 | 10 |
| `/error` | 오류 | 11 |

**화면 전환의 주체는 서버다.** 사용자가 URL을 직접 쳐도 서버 상태와 다르면 서버 상태가 이긴다. `round:revealed`를 받으면 `/reveal`로, `round:missed`를 받으면 `/missed`로 라우터가 따라간다.

세로 모드 고정 (PRD 6.5).

---

## 소켓

```
src/realtime/
  socket.ts            연결 1개. 재연결 정책. 이벤트 등록
  handlers/
    room.ts            room:joined host:changed room:closed
                       participant:updated participant:removed
    round.ts           game:started round:revealed round:finalized
                       round:missed round:closed game:finished
    submission.ts      submission:status submission:scored
    reaction.ts        reaction:updated
    skip.ts            round:skipStatus
```

이벤트 처리 코드를 화면 컴포넌트에 흩어놓지 않는다 (가이드 §8).

```
Socket.IO → Event Handler → Zustand → React
```

- 소켓 인스턴스는 앱 전체에 **하나**. 화면마다 새로 만들지 않는다.
- 인증은 쿠키로 자동. handshake에 UUID를 실어 보내지 않는다 (`HttpOnly`라 읽을 수도 없다).
- 모든 이벤트 페이로드에 타입을 붙인다. `src/types/events.ts`에 BE 계약과 대응하는 정의를 둔다.
- 알 수 없는 이벤트는 조용히 무시하고 개발 모드에서만 경고한다.

`participantId`로 자기를 식별한다. UUID는 서버가 절대 내려주지 않는다 (ID-08).

---

## 스토어 (Zustand)

| 스토어 | 담는 것 |
|---|---|
| `connection` | 소켓 상태, 재연결 시도 횟수, 마지막 동기화 시각 |
| `room` | slug, 설정(라운드 수·제한시간), 상태, 내 방장 여부 |
| `participants` | 참여자 목록, 연결 상태, 색상 태그 |
| `game` | 총 라운드 수, 현재 라운드 번호, 진행 상태 |
| `round` | 감정 정보, `revealAt`, `deadlineAt`, 제출 현황, 결과, 리액션, 스킵 현황 |
| `camera` | 권한 상태, 스트림 참조, 프리뷰 준비 여부 |
| `submission` | 내 캡처 Blob, 업로드 상태, 재시도 횟수 |

**서버가 준 값을 그대로 담는다.** 스토어에서 점수를 재계산하거나 순위를 매기지 않는다. 정렬처럼 표시에 필요한 파생값은 selector로 만들되, 그 값으로 게임 판정을 하지 않는다.

TanStack Query는 방 생성·조회·복원·닉네임 변경 같은 일회성 HTTP에만 쓴다 (가이드 §7).

---

## 서버 시각 — 이 모듈의 핵심

| ID | 규칙 |
|---|---|
| RD-08 | 서버가 절대 마감 시각을 내려주고, 클라이언트는 남은 시간을 **표시만** 한다. |

```ts
/** RD-08: 서버 절대 시각 기준. 클라이언트 자체 카운트 금지 */
useServerCountdown(deadlineAt: string): { remainingMs: number }
```

금지:

```
화면 진입 → 20초짜리 setInterval 시작
```

### 시계 오차 보정

사용자 기기 시계는 몇 초씩 틀어져 있다. `deadlineAt - Date.now()`를 그대로 쓰면 사람마다 다른 시각에 타이머가 0이 된다. 7.2의 "클라이언트 간 편차 500ms 이내"가 여기서 깨진다.

`lib/serverTime.ts`가 오프셋을 유지한다. **[가정]** — PRD는 보정 방식을 정하지 않았다.

```
서버 응답의 Date 헤더 (또는 이벤트 수신 시각)
      ↓
offset = serverTime - clientTime
      ↓
now() = Date.now() + offset
```

모든 카운트다운이 이 `now()`를 쓴다. `Date.now()`를 직접 호출하는 코드를 lint 룰로 막는다. **[가정]**

### 타이머가 0에 닿았을 때

**아무것도 하지 않는다.** 화면을 바꾸지 않고, 제출을 마감하지 않고, 결과를 요청하지 않는다. 서버의 이벤트를 기다린다.

0 표시는 UI일 뿐이다. 마감 판정은 서버가 요청 수신 시각으로 한다 (CP-08).

잔여 10초부터 색을 바꿔 강조하되 **진동·소리로 압박하지 않는다** (PRD 6.2).

---

## 오류 화면 (화면 11)

| 상황 | 처리 |
|---|---|
| 방 없음·종료됨 | "방을 찾을 수 없어요" + 방 만들기 제안 (RO-15) |
| 방 정원 초과 | "방이 가득 찼어요" + 새로고침 재시도 (RO-06) |
| 연결 끊김 | 재연결 진행 상황 표시. FE-8이 담당 |
| 서버 점검 | 안내 문구 |

**무한 로딩 상태를 만들지 않는다** (PRD 6.5, 가이드 §11). 모든 대기 화면에 남은 시간·진행 상황·남은 인원 중 하나가 보여야 한다.

---

## 테스트

- `deadlineAt`이 절대 시각 문자열로 들어와 남은 시간이 계산된다
- 기기 시계를 +5초 조작해도 보정 후 남은 시간이 동일하다
- 타이머 0 도달 시 화면 전환·제출 마감이 **일어나지 않는다**
- `round:revealed` 수신 → `/reveal`로 라우팅
- `round:missed` 수신 → `/missed`로 라우팅
- URL 직접 입력이 서버 상태와 다르면 서버 상태로 교정
- 소켓 인스턴스가 앱 전체에서 1개
- 알 수 없는 이벤트가 앱을 죽이지 않는다
- 이벤트 페이로드 어디에도 UUID 필드가 없다 (ID-08)

---

## 하지 않는 것

```
❌ 화면 진입 시 클라이언트 자체 타이머 시작
❌ Date.now() 직접 호출
❌ 타이머 0에서 FE가 마감·전환 결정
❌ 화면 컴포넌트에 소켓 이벤트 핸들러 작성
❌ 화면마다 소켓 인스턴스 생성
❌ 스토어에서 점수·순위 재계산
❌ UUID를 handshake·페이로드에서 기대
❌ 무한 로딩 화면
❌ 타이머 진동·소리 알림
```
