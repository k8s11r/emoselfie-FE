import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServerTimer } from './ServerTimer';

describe('ServerTimer', () => {
  it('11초 이상 남으면 강조하지 않는다', () => {
    render(<ServerTimer endsAtMs={11_000} now={() => 0} label="촬영 마감까지" />);
    const timer = screen.getByLabelText('촬영 마감까지 11초');
    expect(timer).toHaveTextContent('00:11');
    expect(timer).not.toHaveAttribute('data-urgent');
  });

  it('10초 이하는 색 외에 문구로도 마감 임박을 알린다', () => {
    render(<ServerTimer endsAtMs={9_400} now={() => 0} label="촬영 마감까지" />);
    const timer = screen.getByLabelText('촬영 마감까지 10초, 곧 마감');
    expect(timer).toHaveAttribute('data-urgent', 'true');
    expect(timer).toHaveTextContent('곧 마감');
  });

  it('마감 후에는 0초를 유지하고 강조를 해제한다', () => {
    render(<ServerTimer endsAtMs={0} now={() => 5_000} label="촬영 마감까지" />);
    const timer = screen.getByLabelText('촬영 마감까지 0초');
    expect(timer).toHaveTextContent('00:00');
    expect(timer).not.toHaveAttribute('data-urgent');
  });
});
