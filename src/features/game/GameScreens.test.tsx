import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { FinalScreen, ResultScreen } from './GameScreens';
import { resultView } from '../../stores/gameState';
import { emotionFixture, finalizedFixture, finishedFixture, scoredFixture } from '../../tests/fixtures/game';

const other = { ...scoredFixture, participantId: '43', submissionId: '914', nickname: '지수', currentRank: 1, mediaToken: 'other-token' };
const round = { roundId: '87', index: 3, emotion: emotionFixture };

describe('result presentation', () => {
  it('서버 순위가 바뀌어도 선택한 참여자 사진을 유지하고 확정 점수·포인트를 표시한다', async () => {
    const game = { ...resultView(round), cards: [scoredFixture, other] };
    const view = render(<ResultScreen game={game} roundCount={5} />);
    expect(screen.getByRole('heading', { name: '3 / 5 라운드 결과' })).toBeVisible();
    expect(screen.getByText('놀람')).toBeVisible();

    await userEvent.setup().click(screen.getByRole('button', { name: /태호/ }));
    view.rerender(<ResultScreen game={{ ...game, cards: [other, scoredFixture], results: finalizedFixture.results, finalized: true, viewingEndsAtMs: finalizedFixture.viewingEndsAtMs }} roundCount={5} />);

    expect(screen.getByRole('img', { name: '태호의 제출 사진' })).toBeVisible();
    expect(screen.getByRole('button', { name: /태호/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('91.3점')).toBeVisible();
    expect(screen.getByText('최종 순위 확정')).toBeVisible();
  });

  it('서버가 알려준 채점 분모만큼 대기 슬롯을 두고 나머지는 익명으로 남긴다', () => {
    render(<ResultScreen game={{ ...resultView(round), cards: [{ ...scoredFixture, scoredCount: 1, scoredTotal: 3 }] }} roundCount={5} />);
    expect(screen.getByText('1 / 3 채점 완료')).toBeVisible();
    expect(screen.getAllByText('채점 중')).toHaveLength(2);
  });

  it('내가 제출하기 전에 채점된 결과는 잠긴 슬롯과 안내로 알린다', () => {
    // The server counts 3 scored, but this client only joined the audience for one of them.
    render(<ResultScreen game={{ ...resultView(round), cards: [{ ...scoredFixture, scoredCount: 3, scoredTotal: 5 }] }} roundCount={5} />);
    expect(screen.getByText('3 / 5 채점 완료')).toBeVisible();
    expect(screen.getAllByText('이전 결과')).toHaveLength(2);
    expect(screen.getAllByText('채점 중')).toHaveLength(2);
    expect(screen.getByText('내가 제출하기 전에 채점된 2명의 결과는 이 화면에서 볼 수 없어요.')).toBeVisible();
  });

  it.each(['no_face', 'failed'] as const)('%s도 사진을 표시하고 미디어 오류는 자리표시자로 처리한다', (status) => {
    render(<ResultScreen game={{ ...resultView(round), cards: [{ ...scoredFixture, status, targetScore: status === 'failed' ? null : 0 }] }} />);
    expect(screen.getByText(status === 'failed' ? '판정 불가' : '얼굴 인식 실패')).toBeVisible();
    fireEvent.error(screen.getByRole('img', { name: '태호의 제출 사진' }));
    expect(screen.getAllByText('사진을 더 이상 볼 수 없어요.').length).toBeGreaterThan(0);
  });

  it('리액션은 서버에 요청만 보내고 총수는 서버 값을 그대로 쓴다', async () => {
    const onReact = vi.fn().mockResolvedValue(undefined);
    const game = { ...resultView(round), cards: [scoredFixture], reactions: { '913': { like: 4, question: 1 } } };
    const view = render(<ResultScreen game={game} participantId="41" onReact={onReact} />);

    const like = screen.getByRole('button', { name: /좋아요 4/ });
    await userEvent.setup().click(like);
    expect(onReact).toHaveBeenCalledWith('913', 'like');
    // The count only moves when the server broadcasts it.
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /좋아요 4/ })).toBeVisible();

    view.rerender(<ResultScreen game={{ ...game, reactions: { '913': { like: 5, question: 1 } } }} participantId="41" onReact={onReact} />);
    expect(screen.getByRole('button', { name: /좋아요 5/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('내 사진에는 리액션을 보낼 수 없고 이유를 안내한다', () => {
    render(<ResultScreen game={{ ...resultView(round), cards: [scoredFixture] }} participantId={scoredFixture.participantId} onReact={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole('button', { name: /좋아요/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /에계/ })).toBeDisabled();
    expect(screen.getByText('내 사진에는 리액션을 보낼 수 없어요')).toBeVisible();
  });

  it('스킵은 전원이 누를 수 있고 서버 집계를 그대로 보여 준다', async () => {
    const onSkip = vi.fn().mockResolvedValue(undefined);
    const game = { ...resultView(round), cards: [scoredFixture], viewingEndsAtMs: finalizedFixture.viewingEndsAtMs };
    const view = render(<ResultScreen game={game} participantId="41" onSkip={onSkip} />);

    await userEvent.setup().click(screen.getByRole('button', { name: '스킵' }));
    expect(onSkip).toHaveBeenCalledTimes(1);

    view.rerender(<ResultScreen game={{ ...game, skipStatus: { skipped: 2, total: 5 } }} participantId="41" onSkip={onSkip} />);
    expect(screen.getByRole('button', { name: /넘길 준비 2 \/ 5/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('리액션 전송이 실패하면 눌린 상태를 되돌리고 알린다', async () => {
    const onReact = vi.fn().mockRejectedValue(new Error('NOT_A_VIEWER'));
    render(<ResultScreen game={{ ...resultView(round), cards: [scoredFixture] }} participantId="41" onReact={onReact} />);

    await userEvent.setup().click(screen.getByRole('button', { name: /좋아요/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('리액션을 보내지 못했어요');
    expect(screen.getByRole('button', { name: /좋아요/ })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('final presentation', () => {
  const ranking = [
    finishedFixture.ranking[0],
    { rank: 2, participantId: '41', nickname: '지수', colorTag: 3, totalPoints: 300, likeCount: 4, questionCount: 1 },
    { rank: 3, participantId: '44', nickname: '현우', colorTag: 2, totalPoints: 250, likeCount: 2, questionCount: 3 },
    { rank: 4, participantId: '45', nickname: '윤아', colorTag: 4, totalPoints: 180, likeCount: 1, questionCount: 5 },
  ];

  it('시상대·전체 순위·본인 행·수상자를 서버 값으로 보여 준다', () => {
    render(<MemoryRouter><FinalScreen game={{ ...finishedFixture, ranking }} participantId="41" roundCount={5} /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: '태호 우승!' })).toBeVisible();
    expect(screen.getByText('5라운드 합계 380 포인트')).toBeVisible();
    expect(screen.getByRole('list', { name: '상위 순위' })).toHaveTextContent('지수 (나)');
    // Ranks 1-3 sit on the podium; the scrollable list starts at 4th.
    expect(screen.getByRole('list', { name: '최종 순위' })).toHaveTextContent('윤아');
    expect(screen.getByRole('list', { name: '최종 순위' })).not.toHaveTextContent('현우');
    expect(screen.getByText('4위 ~ 4위 · 나는 2위')).toBeVisible();
    expect(screen.getByRole('region', { name: '가장 사랑받은 표정' })).toHaveTextContent('태호');
    expect(screen.getByRole('link', { name: '새 방 만들기' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: '결과 공유' })).toBeDisabled();
    expect(screen.getByRole('link', { name: '방 나가기' })).toHaveAttribute('href', '/');
  });

  it('중단 사유를 안내하고 수상자가 없으면 수상 블록을 숨긴다', () => {
    render(<MemoryRouter><FinalScreen game={{ ...finishedFixture, aborted: true, reason: 'not_enough_players', mostLoved: null }} participantId="42" /></MemoryRouter>);
    expect(screen.getByText('참여 인원이 부족해 게임이 종료됐어요.')).toBeVisible();
    expect(screen.queryByRole('region', { name: '가장 사랑받은 표정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: '최종 순위' })).not.toBeInTheDocument();
  });
});
