import { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import type { GameFinished, ScoredSubmission } from '../../api/game';
import type { ResultGame } from '../../stores/gameState';
import { ServerTimer } from '../../components/ServerTimer';
import { StatusBadge } from '../../components/StatusBadge';

const avatarColors = ['#FFD72F', '#FF3D86', '#8F66FF', '#5AC8FF', '#80EFD6', '#B8F16A', '#FF5A47', '#FFC07A', '#A8E6CF', '#C7B8FF', '#91D7FF', '#F7A8C4'];
// The rail reorders on every server ranking update: RS-03's 500ms settle.
const railMotion = { duration: 0.5, ease: [0.22, 1.2, 0.36, 1] } as const;

export function WaitingScreen({ title, description, endsAtMs }: { title: string; description: string; endsAtMs?: number }) {
  return <main className="game-waiting"><span aria-hidden="true">⏳</span><h1>{title}</h1><p role="status">{description}</p>{endsAtMs !== undefined ? <ServerTimer endsAtMs={endsAtMs} label="다음 진행까지" /> : null}</main>;
}

function scoreText(card: ScoredSubmission | undefined, score: number | null | undefined, status: string | undefined) {
  if (status === 'failed') return '판정 불가';
  if (status === 'no_face') return '얼굴 인식 실패';
  if (status === 'missed') return '미제출';
  return score === null || score === undefined ? (card ? '채점 중' : '—') : `${score.toFixed(1)}점`;
}

function Photo({ card, className, alt, fallback }: { card: ScoredSubmission; className: string; alt: string; fallback?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <p className={`${className} ${className}--empty`} role={fallback ? undefined : 'status'} aria-hidden={fallback ? true : undefined}>
    {fallback ?? '사진을 더 이상 볼 수 없어요.'}
  </p>;
  return <img className={className} src={`/media/${encodeURIComponent(card.mediaToken)}`} alt={alt} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

type ReactionKind = 'like' | 'question';
type ResultScreenProps = {
  game: ResultGame;
  roundCount?: number;
  participantId?: string;
  onReact?: (submissionId: string, type: ReactionKind) => Promise<void>;
  onSkip?: () => Promise<void>;
};

export function ResultScreen({ game, roundCount, participantId, onReact, onSkip }: ResultScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mine, setMine] = useState<Record<string, Partial<Record<ReactionKind, boolean>>>>({});
  const [skipRequested, setSkipRequested] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);

  const rankOf = (card: ScoredSubmission) => game.finalized
    ? game.results.find((row) => row.participantId === card.participantId)?.rank ?? Infinity
    : card.currentRank ?? Infinity;
  const rankedCards = [...game.cards].sort((a, b) => rankOf(a) - rankOf(b));
  const selected = rankedCards.find((card) => card.participantId === selectedId) ?? rankedCards[0];
  // Bind the selection to a participantId so server reordering never swaps the photo.
  if (selectedId === null && selected) setSelectedId(selected.participantId);

  const result = selected && game.results.find((row) => row.participantId === selected.participantId);
  const status = result?.status ?? selected?.status;
  const score = result?.targetScore !== undefined ? result.targetScore : selected?.targetScore;
  const rank = selected ? rankOf(selected) : Infinity;
  const counts = selected ? game.reactions[selected.submissionId] : undefined;
  const isSelf = Boolean(selected && participantId && selected.participantId === participantId);
  const myCard = participantId ? game.cards.find((card) => card.participantId === participantId) : undefined;
  const myResult = participantId ? game.results.find((row) => row.participantId === participantId) : undefined;
  const myRank = myResult?.rank ?? myCard?.currentRank ?? null;
  // Counts come from the server. A submitter joins the result audience only when the
  // server accepts their photo, so anything scored earlier never reaches this client
  // (BE §13.1 viewers; backlog is B-11). Show that gap instead of inventing cards.
  const scoredCount = Math.max(rankedCards.length, ...rankedCards.map((card) => card.scoredCount));
  const scoredTotal = Math.max(scoredCount, ...rankedCards.map((card) => card.scoredTotal));
  const earlier = scoredCount - rankedCards.length;
  const pending = scoredTotal - scoredCount;

  function move(delta: number) {
    if (!selected || rankedCards.length < 2) return;
    const index = rankedCards.findIndex((card) => card.participantId === selected.participantId);
    setSelectedId(rankedCards[(index + delta + rankedCards.length) % rankedCards.length].participantId);
  }

  async function react(type: ReactionKind) {
    if (!selected || !onReact || isSelf) return;
    const next = !mine[selected.submissionId]?.[type];
    const submissionId = selected.submissionId;
    setMine((current) => ({ ...current, [submissionId]: { ...current[submissionId], [type]: next } }));
    setCommandError(null);
    try {
      await onReact(submissionId, type);
    } catch {
      setMine((current) => ({ ...current, [submissionId]: { ...current[submissionId], [type]: !next } }));
      setCommandError('리액션을 보내지 못했어요. 잠시 후 다시 눌러 주세요.');
    }
  }

  async function skip() {
    if (!onSkip) return;
    const next = !skipRequested;
    setSkipRequested(next);
    setCommandError(null);
    try {
      await onSkip();
    } catch {
      setSkipRequested(!next);
      setCommandError('스킵 요청을 보내지 못했어요. 잠시 후 다시 눌러 주세요.');
    }
  }

  return <main className="result-page">
    <header className="result-topbar">
      <h1 className="round-chip">{game.index}{roundCount ? ` / ${roundCount}` : ''} 라운드 결과</h1>
      <StatusBadge tone={game.finalized ? 'mint' : 'plain'}>{game.finalized ? '최종 순위 확정' : '실시간 집계 중'}</StatusBadge>
    </header>

    <div className="result-topline">
      {game.emotion ? <span className="topic-chip" style={{ background: game.emotion.color }}>
        <span aria-hidden="true">{game.emotion.emoji}</span>{game.emotion.displayName}
      </span> : null}
      <p className="my-score">
        <span>내 점수</span>
        <strong>{scoreText(myCard, myResult?.targetScore ?? myCard?.targetScore, myResult?.status ?? myCard?.status)}</strong>
        <span>{myRank ? `· ${myRank}위` : '· 집계 중'}</span>
      </p>
    </div>

    {selected ? <div className="result-stage">
      <Photo key={selected.mediaToken} card={selected} className="result-stage__photo" alt={`${selected.nickname}의 제출 사진`} />
      {rankedCards.length > 1 ? <>
        <button type="button" className="result-stage__nav result-stage__nav--prev" aria-label="이전 참여자 사진" onClick={() => move(-1)}>‹</button>
        <button type="button" className="result-stage__nav result-stage__nav--next" aria-label="다음 참여자 사진" onClick={() => move(1)}>›</button>
      </> : null}
      <p className="result-stage__rank"><strong>{Number.isFinite(rank) ? `${rank}위` : '집계 중'}</strong>{selected.nickname}</p>
      <p className="result-stage__score">{scoreText(selected, score, status)}</p>
      <div className="result-stage__reactions">
        <div className="reaction-buttons">
          <button type="button" className="reaction-button reaction-button--like" aria-pressed={Boolean(mine[selected.submissionId]?.like)}
            disabled={isSelf || !onReact} onClick={() => void react('like')}>
            <span aria-hidden="true">♥</span>좋아요 {counts?.like ?? 0}
          </button>
          <button type="button" className="reaction-button reaction-button--question" aria-pressed={Boolean(mine[selected.submissionId]?.question)}
            disabled={isSelf || !onReact} onClick={() => void react('question')}>
            <span aria-hidden="true">?</span>에계 {counts?.question ?? 0}
          </button>
        </div>
        <p className="reaction-note">{isSelf ? '내 사진에는 리액션을 보낼 수 없어요' : '다시 누르면 취소돼요'}</p>
        {rankedCards.length > 1 ? <span className="result-dots" aria-hidden="true">
          {rankedCards.map((card) => <span key={card.participantId} className={card.participantId === selected.participantId ? 'result-dots__dot result-dots__dot--on' : 'result-dots__dot'} />)}
        </span> : null}
      </div>
    </div> : <div className="result-stage result-stage--empty"><p role="status">사진을 채점하고 있어요. 결과가 도착하면 여기에 표시돼요.</p></div>}

    <div className="rail-head">
      <h2>{game.finalized ? '라운드 순위' : '실시간 순위'}</h2>
      <span role="status">{scoredCount} / {scoredTotal} 채점 완료</span>
    </div>
    <nav aria-label="참여자 결과 선택">
      <motion.ul className="rank-rail">
        {rankedCards.map((card, index) => <motion.li layout transition={railMotion} key={card.participantId}>
          <button type="button" className="rail-card" aria-pressed={selected?.participantId === card.participantId}
            onClick={() => setSelectedId(card.participantId)}>
            <span className="rail-card__thumb" style={{ background: avatarColors[card.colorTag] }}>
              <Photo card={card} className="rail-card__photo" alt="" fallback={card.nickname.slice(0, 1)} />
              <span className="rail-card__rank">{Number.isFinite(rankOf(card)) ? rankOf(card) : index + 1}</span>
              <span className="rail-card__likes">♥{game.reactions[card.submissionId]?.like ?? 0}</span>
            </span>
            <span className="rail-card__name">{card.nickname}{card.participantId === participantId ? ' (나)' : ''}</span>
          </button>
        </motion.li>)}
        {Array.from({ length: earlier }, (_, index) => <li key={`earlier-${index}`} className="rail-pending">
          <span className="rail-card__thumb" aria-hidden="true">🔒</span>
          <span className="rail-card__name">이전 결과</span>
        </li>)}
        {Array.from({ length: pending }, (_, index) => <li key={`pending-${index}`} className="rail-pending">
          <span className="rail-card__thumb" aria-hidden="true">⏳</span>
          <span className="rail-card__name">채점 중</span>
        </li>)}
      </motion.ul>
      {earlier > 0 ? <p className="foot-note" role="status">내가 제출하기 전에 채점된 {earlier}명의 결과는 이 화면에서 볼 수 없어요.</p> : null}
    </nav>

    <div className="result-skip">
      {commandError ? <p className="form-error" role="alert">{commandError}</p> : null}
      <button type="button" className="skip-button" aria-pressed={skipRequested} disabled={!onSkip} onClick={() => void skip()}>
        <span>{game.skipStatus ? `넘길 준비 ${game.skipStatus.skipped} / ${game.skipStatus.total}` : '스킵'}</span>
        {/* The countdown is decorative inside the control so the button keeps a stable name. */}
        {game.viewingEndsAtMs !== null ? <span aria-hidden="true"><ServerTimer endsAtMs={game.viewingEndsAtMs} label="감상 시간" /></span> : null}
      </button>
      <p className="foot-note">{game.viewingEndsAtMs === null
        ? '채점이 끝나면 감상 시간이 시작돼요.'
        : '모두 스킵을 누르면 바로 다음 라운드로 넘어가요 · ♥는 최고, ?는 “이게 1등이라고?”'}</p>
    </div>
  </main>;
}

type FinalScreenProps = { game: GameFinished; participantId?: string; roundCount?: number };

export function FinalScreen({ game, participantId, roundCount }: FinalScreenProps) {
  const ranking = [...game.ranking].sort((a, b) => a.rank - b.rank);
  const [first, second, third] = ranking;
  const rest = ranking.slice(3);
  const myRank = ranking.find((row) => row.participantId === participantId)?.rank;
  const loved = game.mostLoved && ranking.find((row) => row.participantId === game.mostLoved?.participantId);

  const step = (row: typeof first, place: 1 | 2 | 3) => row ? <li className={`podium__slot podium__slot--${place}`}>
    {place === 1 ? <span className="podium__crown">표정 챔피언</span> : null}
    <span className="podium__avatar" style={{ background: avatarColors[row.colorTag] }} aria-hidden="true">{row.nickname.slice(0, 1)}</span>
    <span className="podium__name">{row.nickname}{row.participantId === participantId ? ' (나)' : ''}</span>
    <span className="podium__step"><strong>{row.rank}</strong><small>{row.totalPoints} 포인트</small></span>
  </li> : null;

  return <main className="final-page">
    <header className="final-topbar">
      <span className="round-chip">{roundCount ? `${roundCount}라운드 완료 · ` : ''}{ranking.length}명</span>
      <StatusBadge tone="mint">게임 종료!</StatusBadge>
    </header>

    <div className="final-hero">
      <span className="final-trophy" aria-hidden="true">🏆</span>
      <h1>{first ? `${first.nickname} 우승!` : '최종 결과'}</h1>
      <p>{game.aborted
        ? (game.reason === 'not_enough_players' ? '참여 인원이 부족해 게임이 종료됐어요.' : '채점 서비스를 사용할 수 없어 게임이 종료됐어요.')
        : first ? `${roundCount ? `${roundCount}라운드 ` : ''}합계 ${first.totalPoints} 포인트` : '모두 수고했어요!'}</p>
    </div>

    <ol className="podium" aria-label="상위 순위">{step(second, 2)}{step(first, 1)}{step(third, 3)}</ol>

    {game.mostLoved ? <section className="most-loved" aria-label="가장 사랑받은 표정">
      <span className="most-loved__mark" aria-hidden="true">♥</span>
      <p><small>가장 사랑받은 표정</small><strong>{loved?.nickname ?? '참여자'}</strong></p>
      <span className="most-loved__count">♥{game.mostLoved.likeCount}</span>
    </section> : null}

    {rest.length > 0 ? <>
      <div className="rail-head">
        <h2>전체 순위</h2>
        <span>4위 ~ {ranking.length}위{myRank ? ` · 나는 ${myRank}위` : ''}</span>
      </div>
      <ol className="final-ranking" aria-label="최종 순위">{rest.map((row) => <li key={row.participantId} className={row.participantId === participantId ? 'final-ranking__row final-ranking__row--me' : 'final-ranking__row'}>
        <span className="final-ranking__rank">{row.rank}</span>
        <span className="final-ranking__avatar" style={{ background: avatarColors[row.colorTag] }} aria-hidden="true">{row.nickname.slice(0, 1)}</span>
        <span className="final-ranking__name">{row.nickname}{row.participantId === participantId ? ' (나)' : ''}</span>
        <span className="final-ranking__counts"><span aria-label={`좋아요 ${row.likeCount}`}>♥{row.likeCount}</span><span aria-label={`에계 ${row.questionCount}`}>?{row.questionCount}</span></span>
        <strong className="final-ranking__total">{row.totalPoints} 포인트</strong>
      </li>)}</ol>
    </> : null}

    <div className="final-actions">
      <Link className="sticker-button sticker-button--pink sticker-button--full" to="/">새 방 만들기</Link>
      <div className="final-actions__row">
        <button type="button" className="sticker-button sticker-button--plain" disabled aria-describedby="share-reason">결과 공유</button>
        <Link className="sticker-button sticker-button--plain" to="/">방 나가기</Link>
      </div>
      <p id="share-reason" className="foot-note">결과 공유는 준비 중이에요 · 사진은 영구 저장하지 않아요.</p>
    </div>
  </main>;
}
