import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import FatigueSlider from '../FatigueSlider';

describe('FatigueSlider', () => {
  it('initialValue で初期化される', () => {
    render(
      <FatigueSlider
        muscleId="chest"
        initialValue={65}
        onSave={vi.fn()}
        isSaving={false}
      />,
    );

    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('65');
  });

  it('[確定] 押下で onSave が現在のドラフト値で呼ばれる', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <FatigueSlider
        muscleId="chest"
        initialValue={50}
        onSave={onSave}
        isSaving={false}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: '確定' });
    await user.click(confirmButton);

    expect(onSave).toHaveBeenCalledWith(50);
  });

  it('isSaving=true のとき確定ボタンが disabled になる', () => {
    render(
      <FatigueSlider
        muscleId="chest"
        initialValue={50}
        onSave={vi.fn()}
        isSaving={true}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: '保存中...' });
    expect(confirmButton).toBeDisabled();
  });
});
