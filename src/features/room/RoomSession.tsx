import { useEffect, useState } from 'react';
import { uploadSubmission, validateCaptureImage } from '../../api/submissions';
import { connectRoomSocket, sendRoomCommand } from '../../realtime/socket';
import { restoreCurrentRoom } from '../../realtime/restore';
import { useRoomStore } from '../../stores/roomStore';
import { serverNow } from '../../time/serverClock';
import { ConnectionNotice } from '../../components/ConnectionNotice';
import { ErrorView } from '../../components/ErrorView';
import { StickerButton } from '../../components/StickerButton';
import { CaptureStage } from '../game/CaptureStage';
import { FinalScreen, ResultScreen, WaitingScreen } from '../game/GameScreens';
import { describeUploadError, SubmissionFailure } from '../game/submissionOutcome';
import { Lobby } from '../lobby/Lobby';

export function RoomSession({ slug }: { slug: string }) {
  const state = useRoomStore();
  const game = state.game;
  const closed = Boolean(state.closedReason || state.snapshot?.room.status === 'closed' || state.snapshot?.game?.screen === 'error_room_closed');
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (closed) return;
    return connectRoomSocket(slug);
  }, [slug, closed]);
  useEffect(() => {
    const timer = setInterval(() => setNow(serverNow()), 250);
    return () => clearInterval(timer);
  }, []);

  if (closed) return <ErrorView title="종료된 방이에요" description="새 방을 만들어 친구들을 다시 초대해 주세요." />;
  if (!state.snapshot) return <WaitingScreen title="방을 준비하고 있어요" description="참여 정보를 확인하고 있어요." />;
  if (state.restoreError) return <ErrorView title="게임 상태를 확인해 주세요" description={state.restoreError} onRetry={() => { void restoreCurrentRoom(); }} />;
  if (state.restoring) return <WaitingScreen title="게임을 이어갈 준비 중이에요" description="현재 라운드와 제출 상태를 확인하고 있어요." />;
  if (!game) return <Lobby />;

  const disconnected = state.connection !== 'connected';
  // Hide media and stop the camera during a disconnected/duplicate session.
  if (disconnected) return <ConnectionNotice key={state.connection === 'superseded' ? 'superseded' : 'disconnected'} connection={state.connection} />;
  const refresh = <StickerButton tone="plain" onClick={() => { void restoreCurrentRoom(); }}>현재 상태 확인</StickerButton>;
  const roundCount = state.snapshot.room.settings.roundCount;
  if (game.screen === 'final') return <FinalScreen game={game} participantId={state.snapshot.me.participantId} roundCount={roundCount} />;
  if (game.screen === 'result') {
    const roundId = game.roundId;
    return <>{state.restoreWarning ? <div role="status"><p>{state.restoreWarning}</p><StickerButton tone="plain" onClick={() => { void restoreCurrentRoom(true); }}>이전 결과 다시 확인</StickerButton></div> : null}
      <ResultScreen key={roundId} game={game} roundCount={roundCount} participantId={state.snapshot.me.participantId}
        onReact={(submissionId, type) => sendRoomCommand('reaction:sent', { submissionId, type })}
        onSkip={() => sendRoomCommand('round:skip', { roundId })} /></>;
  }
  if (game.screen === 'starting' || game.screen === 'lobby_waiting_next') return <><WaitingScreen title={game.screen === 'starting' ? '게임을 시작해요' : '다음 게임을 기다려 주세요'} description="서버에서 진행 소식을 받으면 이어서 안내할게요." />{refresh}</>;
  if (game.screen === 'round_missed') return <><WaitingScreen title="이번 라운드를 놓쳤어요" description={game.index >= roundCount ? '마지막 라운드가 끝나면 최종 결과를 안내할게요.' : game.phase === 'scoring' ? '라운드가 끝나기를 기다리고 있어요.' : '곧 다음 진행을 안내할게요.'} endsAtMs={game.nextRoundAtMs} />{refresh}</>;
  // D-5: a voided round is discarded without a rerun, so no score is coming for it.
  if (game.screen === 'waiting') return <><WaitingScreen title={game.reason === 'voided' ? '이번 라운드는 무효예요' : '다음 진행을 기다려 주세요'}
    description={game.reason === 'voided' ? '채점을 마치지 못해 이번 라운드는 점수 없이 넘어가요. 다음 진행은 서버 안내를 따를게요.' : '서버에서 다음 라운드나 최종 결과를 준비하고 있어요.'}
    endsAtMs={game.nextRoundAtMs} />{refresh}</>;
  if (game.screen === 'countdown' && now < game.countdownEndsAtMs) return <WaitingScreen title={`${game.emotion.emoji} ${game.emotion.displayName}`} description={game.emotion.hint} endsAtMs={game.countdownEndsAtMs} />;

  async function submit(image: Blob) {
    const current = useRoomStore.getState().game;
    if (!current || (current.screen !== 'capture' && current.screen !== 'countdown') || serverNow() >= current.deadlineAtMs) {
      throw new SubmissionFailure('CAPTURE_LOCKED', '촬영 시간이 끝났어요. 서버 확인을 기다려 주세요.', 'locked');
    }
    // Validation precedes the one-use token guard so a local bad image can be retaken.
    const invalid = validateCaptureImage(image);
    if (invalid) throw describeUploadError(invalid);
    if (!useRoomStore.getState().beginUpload(current.roundId)) {
      throw new SubmissionFailure('ALREADY_SENDING', '이미 보낸 사진의 접수를 확인하고 있어요.', 'locked');
    }
    try {
      await uploadSubmission({ slug, roundId: current.roundId, captureToken: current.captureToken, image });
      useRoomStore.getState().acceptUpload(current.roundId);
      if (useRoomStore.getState().game?.screen === 'result') void restoreCurrentRoom(true);
    } catch (error) {
      // A transport failure may already have consumed the capture token. Do not resend.
      const failure = describeUploadError(error);
      if (failure.code === 'DEADLINE_PASSED') {
        useRoomStore.getState().applyGameEvent({ type: 'round:missed', payload: { roundId: current.roundId, index: current.index, roundCount: state.snapshot!.room.settings.roundCount, phase: 'scoring' } });
      } else if (failure.code === 'ALREADY_SUBMITTED') {
        // The server already holds an accepted photo, so keep the accepted path and read its results.
        useRoomStore.getState().acceptUpload(current.roundId);
        void restoreCurrentRoom(true);
      } else if (useRoomStore.getState().uploadRoundId === current.roundId) {
        await restoreCurrentRoom();
      }
      throw failure;
    }
  }
  const pending = state.uploadRoundId === game.roundId;
  return <>
    <CaptureStage key={game.roundId} emotion={game.emotion} round={game.index} totalRounds={roundCount}
      submittedCount={game.submitted} participantCount={game.total} submissionEndsAtMs={game.deadlineAtMs}
      locked={now >= game.deadlineAtMs || pending} onSubmit={submit} />
    {pending || now >= game.deadlineAtMs ? <><p role="status">제출 여부는 서버 확인 후 안내해요.</p>{refresh}</> : null}
  </>;
}
