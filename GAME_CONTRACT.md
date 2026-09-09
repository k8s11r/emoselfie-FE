# 게임 화면·복원 연동 계약

작성: 2026-09-08. 프론트엔드 구현 기준을 기록한다. **백엔드 합의·실서버 완료 문서가 아니다.**

## 현재 서버에서 확인한 범위

- BE `app/realtime/server.py`의 `announce_round`와 `app/domain/round/runner.py`는 게임 공개·결과 이벤트를 발행한다. FE는 BE 명세 §13.2의 페이로드를 검증해 처리한다.
- `app/domain/room/service.py:lobby_snapshot`은 waiting 이외 상태에서 `SERVICE_UNAVAILABLE`을 반환한다. `app/api/rooms.py`의 `/state`는 이 함수와 LobbyState를 사용한다.
- `app/realtime/server.py:connect`도 waiting 이외에는 `SERVICE_UNAVAILABLE`을 반환한다.
- 따라서 기존 연결에서 게임 이벤트를 처리하는 FE 경로와, 게임 중 새로고침·재접속의 실서버 완주는 서로 다른 완료 범위다. 후자는 서버 구현이 필요하다.
- `/media` 응답은 현재 BE `app/api/media.py`에서 `Cache-Control: private, no-store`를 설정한다. FE는 같은 출처의 서명 URL을 이미지로 표시하고, 오류 시 사진 자리표시자를 표시한다.

## FE에서 연결한 흐름

`RoomPage` 세션/입장 → `RoomSession` 소켓 소유 → 게임 screen resolver.

| 입력 | 화면/처리 |
|---|---|
| game:started | 게임 시작 대기 |
| round:revealed | 감정 카운트다운 → 서버 시각 기준 촬영 |
| submission:status | 제출 인원 표시 |
| HTTP 202 processing | 제출 인정 → 결과 대기, 이전 결과 snapshot 조회 |
| submission:scored | 참여자 사진·상태·잠정 순위 upsert |
| round:finalized | 서버 확정 점수·순위·포인트와 감상 타이머 |
| round:missed / missedUpdate | 감정·사진·점수 없는 scoring/viewing 대기 |
| round:closed / voided | 사진·촬영 토큰 제거, 다음 진행 대기 |
| game:finished | 서버 최종 순위·mostLoved·중단 사유 |
| disconnect / session:superseded | 카메라·결과 DOM 제거, 조작 잠금 |
| 재가입 / foreground / online | `/state` 재조회·시계 재동기화 |

순위·점수·포인트·다음 라운드 시작을 클라이언트에서 계산하지 않는다. 카운트다운 종료만 서버의 countdownEndsAtMs로 전환하고, 마감 0초는 입력을 잠글 뿐 전송 중 제출을 미제출로 확정하지 않는다.

## 복원 wire shape

기준 스키마: `src/api/game.ts:gameSnapshotSchema`. HTTP 루트에는 `room`, `me`, `participants`, `game`, `serverTimeMs`가 필요하다. `room:joined`는 동일한 game 블록을 사용하지만 시각은 필수가 아니다.

- lobby: `game:null` 또는 `{screen:"lobby"}`.
- countdown/capture: BE §14의 currentRound 예시를 사용한다. `roundId`, `index`, `emotion`, `status`, `countdownEndsAtMs`, `deadlineAtMs`, `captureToken`, `mySubmission:{status:"none"}` 필수. 선택적 activeCount가 없으면 snapshot의 active 참여자 수를 사용한다.
- lobby_waiting_next: `{screen:"lobby_waiting_next"}`.
- error_room_closed: `{screen:"error_room_closed"}` 또는 room.status=closed.

**아래 컨테이너 필드·미제출/무효 snapshot의 세부 구조는 명세에 완전한 예시가 없어 FE에서 제안한 계약이다. BE와 확정해야 한다.**

### result

```typescript
{
  screen: 'result',
  currentRound: {
    roundId: string,
    index: number,
    status: 'capturing' | 'scoring' | 'finalized',
    mySubmission: {
      status: 'processing' | 'submitted' | 'no_face' | 'failed',
      submissionId?: string
    },
    viewingEndsAtMs?: number | null
  },
  scoredSubmissions: SubmissionScored[], // §13.2 submission:scored와 같은 각 원소
  finalized: RoundFinalized | null,    // §13.2 round:finalized
  reactions: ReactionUpdated[],        // §13.2 reaction:updated
  skipStatus: RoundSkipStatus | null   // §13.2 round:skipStatus
}
```

결과 화면은 시안의 감정 칩을 위해 `currentRound.emotion`을 사용한다. 없으면 직전 `round:revealed` 값을 잇고, 둘 다 없으면 칩을 표시하지 않는다. 빈 결과는 빈 배열과 null로 명시한다. 컨테이너 필드가 빠지거나 다른 roundId의 결과가 섞이면 복원을 거부하고 재시도를 표시한다. 순위 레일은 개별 currentRank/확정 rank만 사용한다. 전체 processing/missed 레일과 내 리액션·스킵 상태는 B-2/B-3 계약 이후 확장한다.

### round_missed / voided countdown / final

```typescript
{ screen: 'round_missed', currentRound: {
  roundId: string, index: number, phase: 'scoring' | 'viewing', nextRoundAtMs?: number
} }
{ screen: 'countdown', currentRound: {
  roundId: string, index: number, status: 'voided', nextRoundAtMs: number
} }
{ screen: 'final', aborted: boolean, reason: null | 'engine_unavailable' | 'not_enough_players',
  ranking: GameFinishedRanking[], mostLoved: { participantId: string, likeCount: number } | null
}
```

final의 ranking/mostLoved 원소는 §13.2 game:finished와 동일하다. 미제출 snapshot에서는 감정과 결과 필드를 허용된 내부 모델에 옮기지 않는다. FE에서 보이지 않는 것과 서버가 데이터를 보내지 않는 것은 별개의 검증 항목이다.

## 복원 경합과 제출 제한

- 최초 진입/새로고침은 세션→state→소켓 순서다. 소켓은 화면별로 다시 만들지 않는다.
- 재접속/foreground는 기존 연결을 유지하며 state를 읽는다. 조회 중 room 이벤트 또는 제출 인정이 발생하면 이전 응답을 폐기하고 최대 3회 재조회한다. 전체 요청은 10초로 제한하고, 단절/종료/이탈 시 중단한다.
- 로컬 요청 generation은 취소된 이전 응답을 차단한다. **서버 revision/event replay가 없으므로 이것만으로 모든 이벤트 유실·역전이 해결되지는 않는다.** B-5는 여전히 필요하다.
- JPEG 검증 뒤 roundId별 전송 잠금을 잡는다. 응답 유실·토큰 오류 시 현재 상태만 조회하고 같은 토큰을 자동 재전송하지 않는다. 같은 라운드를 none으로 복원해도 전송 잠금을 풀지 않는다.
- 조회가 도착하기 전 사용자 제출의 202가 성공하면 오래된 조회를 폐기한다. 202보다 먼저 도착한 viewer 이벤트는 제한된 임시 큐에 보관하고 202 이후에만 표시한다. 라운드 변경·종료 시 큐를 지운다.
- 202 뒤 이전 결과 backlog를 백그라운드에서 조회한다. 현재 BE 미지원 또는 조회 실패 때는 도착한 결과를 유지하고 이전 결과 재조회 안내를 표시한다. B-11의 실제 서버 backlog 구현이 필요하다.
- 브라우저 새로고침을 가로지르는 전송 멱등성과 안전한 토큰 재발급은 서버 계약(B-4) 없이는 보장할 수 없다. 이미지·토큰을 브라우저 영구 저장소에 저장하지 않는다.
- 리액션·스킵 명령은 BE §13.2 C→S(`reaction:sent`, `round:skip`)를 ack와 함께 보낸다. 총수는 서버 이벤트 값만 대입하고 로컬에서 더하지 않으며, ack 실패는 눌림 표시를 되돌린다. **새로고침·재접속 뒤 내 리액션과 스킵 선택을 복원할 snapshot 필드가 없다(B-3).** 서버가 토글 결과를 ack에 담지 않으므로 내 표시는 세션 안에서만 유효하다.

## 검증 방법

- `npm run test`, `npm run lint`, `npm run build` (TypeScript 검사 포함).
- 개발 서버 `/__preview/game`: 결과·최종·미제출 UI 예시. 운영 빌드에는 포함하지 않는다. 예시 사진 토큰은 실제 데이터가 아니므로 자리표시자가 정상이다.
- 상태/복원 fixture: `src/tests/fixtures/game.ts`. source-derived 이벤트·capture fixture와 제안한 결과 snapshot을 주석으로 구분했다.
- 실서버 체크: 두 세션의 시작→촬영→202→결과→다음 라운드→최종, 모든 screen에서 reload/재접속, 뒤늦은 제출자의 이전 결과, 단절 중 202 응답 유실, 미제출자 응답 필드와 미디어 거부, 실제 모바일 카메라 정리. 서버의 게임 state/재접속 구현 후 수행한다.
