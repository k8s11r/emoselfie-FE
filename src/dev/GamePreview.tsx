import { useState } from 'react';
import { CameraLayoutPreview } from './CameraLayoutPreview';
import { FinalScreen, ResultScreen, WaitingScreen } from '../features/game/GameScreens';
import { emotionFixture, finishedFixture, finalizedFixture, scoredFixture } from '../tests/fixtures/game';
import { resultView } from '../stores/gameState';

// Development-only route. Fixtures never initiate mutations or join a real room.
export default function GamePreview() {
  const [startedAt, setStartedAt] = useState(Date.now);
  const [screen, setScreen] = useState<'result' | 'final' | 'missed' | 'capture'>('result');
  return <>
    <nav aria-label="개발용 화면 선택" className="rank-rail">
      {(['result', 'final', 'missed', 'capture'] as const).map((value) => <button type="button" key={value} onClick={() => { setStartedAt(Date.now()); setScreen(value); }}>{value === 'result' ? '라운드 결과' : value === 'final' ? '최종 순위' : value === 'capture' ? '촬영 레이아웃' : '미제출'}</button>)}
    </nav>
    <p className="field-help">개발용 예시 · 실제 게임 데이터가 아니며 사진은 만료 자리표시자로 표시합니다.</p>
    {screen === 'capture' ? <CameraLayoutPreview /> : null}
    {screen === 'result' ? <ResultScreen roundCount={5} participantId="41" onReact={async () => {}} onSkip={async () => {}}
      game={{ ...resultView({ roundId: '87', index: 3, emotion: emotionFixture }),
        cards: [scoredFixture, { ...scoredFixture, participantId: '41', submissionId: '914', nickname: '지수', currentRank: 2, status: 'failed', targetScore: null, mediaToken: 'preview-expired' }],
        finalized: true, results: finalizedFixture.results, viewingEndsAtMs: startedAt + 30_000,
        reactions: { '913': { like: 4, question: 1 } }, skipStatus: { skipped: 1, total: 5 } }} /> : null}
    {screen === 'final' ? <FinalScreen roundCount={5} participantId="43" game={{ ...finishedFixture, ranking: [
      finishedFixture.ranking[0],
      { rank: 2, participantId: '43', nickname: '지수', colorTag: 3, totalPoints: 270, likeCount: 4, questionCount: 1 },
      { rank: 3, participantId: '44', nickname: '현우', colorTag: 2, totalPoints: 240, likeCount: 2, questionCount: 3 },
      { rank: 4, participantId: '45', nickname: '윤아', colorTag: 4, totalPoints: 180, likeCount: 1, questionCount: 5 },
    ] }} /> : null}
    {screen === 'missed' ? <WaitingScreen title="이번 라운드를 놓쳤어요" description="곧 다음 진행을 안내할게요." endsAtMs={startedAt + 15_000} /> : null}
  </>;
}
