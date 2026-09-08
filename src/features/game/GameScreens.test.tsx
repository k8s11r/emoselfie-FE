import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { FinalScreen, ResultScreen } from './GameScreens';
import { resultView } from '../../stores/gameState';
import { finalizedFixture, finishedFixture, scoredFixture } from '../../tests/fixtures/game';

describe('result presentation', () => {
  it('서버 순위가 바뀌어도 선택한 참여자 사진을 유지하고 확정 점수·포인트를 표시한다', async () => {
    const other = { ...scoredFixture, participantId: '43', submissionId: '914', nickname: '지수', currentRank: 1, mediaToken: 'other-token' };
    const game = { ...resultView({ roundId: '87', index: 3 }), cards: [scoredFixture, other] };
    const view = render(<ResultScreen game={game} />);
    await userEvent.setup().click(screen.getByRole('button', { name: '태호' }));
    view.rerender(<ResultScreen game={{ ...game, cards: [other, scoredFixture], results: finalizedFixture.results, finalized: true, viewingEndsAtMs: finalizedFixture.viewingEndsAtMs }} />);
    expect(screen.getByRole('img', { name: '태호의 제출 사진' })).toBeVisible();
    expect(screen.getByRole('button', { name: '태호' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('91.3점')).toBeVisible();
    expect(screen.getByText('이번 라운드 100 포인트 · 누적 270 포인트')).toBeVisible();
  });
  it.each(['no_face', 'failed'] as const)('%s도 사진을 표시하고 미디어 오류는 자리표시자로 처리한다', (status) => {
    render(<ResultScreen game={{ ...resultView({ roundId: '87', index: 3 }), cards: [{ ...scoredFixture, status, targetScore: status === 'failed' ? null : 0 }] }} />);
    expect(screen.getByText(status === 'failed' ? '판정 불가' : '얼굴을 찾지 못했어요')).toBeVisible();
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('사진을 더 이상 볼 수 없어요.')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('서버 최종 순위·수상자·중단 사유를 보여 준다', () => {
    render(<MemoryRouter><FinalScreen game={{ ...finishedFixture, aborted: true, reason: 'not_enough_players' }} /></MemoryRouter>);
    expect(screen.getByText('380 포인트')).toBeVisible();
    expect(screen.getByText('태호 · 7개')).toBeVisible();
    expect(screen.getByText('참여 인원이 부족해 게임이 종료됐어요.')).toBeVisible();
    expect(screen.getByRole('link', { name: '새 방 만들기' })).toHaveAttribute('href', '/');
  });
});
