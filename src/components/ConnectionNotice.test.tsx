import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { ConnectionNotice } from './ConnectionNotice';

afterEach(() => vi.useRealTimers());
it('단절 10초 후 재연결과 처음으로 액션을 표시하고 이탈 시 타이머를 제거한다', () => {
  vi.useFakeTimers();
  const view = render(<MemoryRouter><ConnectionNotice connection="reconnecting" /></MemoryRouter>);
  expect(screen.queryByRole('button', { name: '다시 연결' })).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(9_999));
  expect(screen.queryByRole('button', { name: '다시 연결' })).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole('button', { name: '다시 연결' })).toBeVisible();
  expect(screen.getByRole('link', { name: '처음으로' })).toHaveAttribute('href', '/');
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
