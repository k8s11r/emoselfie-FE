import { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import type { GameFinished, ScoredSubmission } from '../../api/game';
import type { ResultGame } from '../../stores/gameState';
import { ServerTimer } from '../../components/ServerTimer';
import { SurfaceCard } from '../../components/SurfaceCard';
import { StatusBadge } from '../../components/StatusBadge';

export function WaitingScreen({ title, description, endsAtMs }: { title: string; description: string; endsAtMs?: number }) {
  return <main className="game-waiting"><span aria-hidden="true">⏳</span><h1>{title}</h1><p role="status">{description}</p>{endsAtMs !== undefined ? <ServerTimer endsAtMs={endsAtMs} label="다음 진행까지" /> : null}</main>;
}
function ResultPhoto({ card }: { card: ScoredSubmission }) {
  const [failed, setFailed] = useState(false);
  return <div className="result-photo">{failed
    ? <p role="status">사진을 더 이상 볼 수 없어요.</p>
    : <img src={`/media/${encodeURIComponent(card.mediaToken)}`} alt={`${card.nickname}의 제출 사진`} referrerPolicy="no-referrer" onError={() => setFailed(true)} />}</div>;
}
export function ResultScreen({ game }: { game: ResultGame }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rankedCards = [...game.cards].sort((a, b) => {
    const rank = (card: ScoredSubmission) => game.finalized
      ? game.results.find((row) => row.participantId === card.participantId)?.rank ?? Infinity
      : card.currentRank ?? Infinity;
    return rank(a) - rank(b);
  });
  const selected = rankedCards.find((card) => card.participantId === selectedId) ?? rankedCards[0];
  // Bind initial selection once; subsequent server reordering keeps the same photo.
  if (selectedId === null && selected) setSelectedId(selected.participantId);
  const result = selected && game.results.find((row) => row.participantId === selected.participantId);
  const status = result?.status ?? selected?.status;
  const score = result?.targetScore !== undefined ? result.targetScore : selected?.targetScore;
  const counts = selected && game.reactions[selected.submissionId];
  return <main className="result-page">
    <header className="game-header"><h1>{game.index}라운드 결과</h1><StatusBadge tone="mint">{game.finalized ? '결과 확정' : '채점 중'}</StatusBadge></header>
    {game.viewingEndsAtMs !== null ? <ServerTimer endsAtMs={game.viewingEndsAtMs} label="감상 시간" /> : <p role="status">제출됐어요. 채점 결과를 기다리고 있어요.</p>}
    {selected ? <>
      <ResultPhoto key={selected.mediaToken} card={selected} />
      <SurfaceCard className="result-detail">
        <h2>{selected.nickname}</h2>
        <p>{status === 'failed' ? '판정 불가' : status === 'no_face' ? '얼굴을 찾지 못했어요' : `${score?.toFixed(1) ?? '—'}점`}</p>
        <p>{game.finalized ? (result?.rank ? `${result.rank}위` : '순위 없음') : (selected.currentRank ? `현재 ${selected.currentRank}위 · 잠정` : '순위 집계 중')}</p>
        {result ? <p>이번 라운드 {result.rankPoints} 포인트{result.totalPoints !== undefined ? ` · 누적 ${result.totalPoints} 포인트` : ''}</p> : null}
        {counts ? <p aria-label="받은 리액션">♥ {counts.like} · ⁇ {counts.question}</p> : null}
      </SurfaceCard>
    </> : <SurfaceCard><p role="status">사진을 채점하고 있어요. 결과가 도착하면 여기에 표시돼요.</p></SurfaceCard>}
    <nav aria-label="참여자 결과 선택"><motion.ul className="rank-rail">{rankedCards.map((card) => <motion.li layout transition={{ duration: 0.35 }} key={card.participantId}>
      <button type="button" aria-pressed={selected?.participantId === card.participantId} onClick={() => setSelectedId(card.participantId)}>{card.nickname}</button>
    </motion.li>)}</motion.ul></nav>
    {game.finalized ? <ol className="round-results" aria-label="확정 라운드 순위">{game.results.map((row) => <li key={row.participantId}>
      <span>{row.rank === null ? '—' : `${row.rank}위`} · {game.cards.find((card) => card.participantId === row.participantId)?.nickname ?? '참여자'}</span><strong>{row.status === 'missed' ? '미제출' : `${row.rankPoints} 포인트`}</strong>
    </li>)}</ol> : null}
    {game.skipStatus ? <p>다음 라운드 요청 {game.skipStatus.skipped} / {game.skipStatus.total}</p> : null}
  </main>;
}
export function FinalScreen({ game, participantId }: { game: GameFinished; participantId?: string }) {
  const winner = game.mostLoved && game.ranking.find((row) => row.participantId === game.mostLoved?.participantId);
  return <main className="final-page">
    <header><span className="final-trophy" aria-hidden="true">🏆</span><h1>최종 결과</h1></header>
    {game.aborted ? <p role="status">{game.reason === 'not_enough_players' ? '참여 인원이 부족해 게임이 종료됐어요.' : '채점 서비스를 사용할 수 없어 게임이 종료됐어요.'}</p> : <p>모두 수고했어요!</p>}
    <ol className="final-ranking" aria-label="최종 순위">{game.ranking.map((row) => <li key={row.participantId}><span>{row.rank}위</span><strong>{row.nickname}{row.participantId === participantId ? ' (나)' : ''}</strong><span>{row.totalPoints} 포인트</span></li>)}</ol>
    {game.mostLoved ? <SurfaceCard><h2>가장 많은 사랑을 받았어요 ♥</h2><p>{winner?.nickname ?? '참여자'} · {game.mostLoved.likeCount}개</p></SurfaceCard> : null}
    <Link className="sticker-button sticker-button--pink" to="/">새 방 만들기</Link>
    <button type="button" disabled>결과 공유 · 준비 중</button>
  </main>;
}
