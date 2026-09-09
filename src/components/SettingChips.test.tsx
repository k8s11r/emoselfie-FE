import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettingChips } from './SettingChips';

describe('SettingChips', () => {
  it('라디오 그룹에서 하나의 설정을 선택한다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingChips
        legend="라운드 수"
        name="rounds"
        value={5}
        options={[{ value: 3, label: '3' }, { value: 5, label: '5' }]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('radio', { name: '5' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: '3' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});

