import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NicknameSetup } from './NicknameSetup';

describe('NicknameSetup', () => {
  it('2~10자로 정리한 닉네임만 제출한다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NicknameSetup initialNickname="" pending={false} error={null} onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox', { name: '닉네임' });
    const submit = screen.getByRole('button', { name: '다음' });
    expect(submit).toBeDisabled();

    await user.type(input, '  모모  ');
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledWith('모모');
  });

  it('늦게 도착한 기본값이 사용자가 입력한 초안을 덮지 않는다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const view = render(<NicknameSetup initialNickname="" pending={false} error={null} onSubmit={onSubmit} />);
    const input = screen.getByRole('textbox', { name: '닉네임' });

    await user.type(input, '내초안');
    view.rerender(<NicknameSetup initialNickname="서버이름" pending={false} error={null} onSubmit={onSubmit} />);

    expect(input).toHaveValue('내초안');
  });
});
