import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import FatigueSlider from '../FatigueSlider';
import FatigueInputTab from '../FatigueInputTab';
import { useFatigueHistory } from '@/hooks/useFatigue';
import { useSaveFatigue } from '@/hooks/useSaveFatigue';
import type { CurrentFatigueEntry } from '@/types/domain';

vi.mock('@/hooks/useFatigue', () => ({
  useFatigueHistory: vi.fn(),
}));

vi.mock('@/hooks/useSaveFatigue', () => ({
  useSaveFatigue: vi.fn(),
}));

type SaveOptions = {
  onSuccess?: () => void;
};

let latestSaveOptions: SaveOptions | undefined;
let saveMock: ReturnType<typeof vi.fn>;

function makeEntry(
  overrides: Partial<CurrentFatigueEntry> = {},
): CurrentFatigueEntry {
  return {
    savedValue: 80,
    currentValue: 50,
    recordedAt: '2026-07-02T00:00:00.000Z',
    recoveryHoursRemaining: 12,
    ...overrides,
  };
}

beforeEach(() => {
  latestSaveOptions = undefined;
  saveMock = vi.fn((_vars: unknown, options?: SaveOptions) => {
    latestSaveOptions = options;
  });

  vi.mocked(useFatigueHistory).mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useFatigueHistory>);
  vi.mocked(useSaveFatigue).mockReturnValue({
    mutate: saveMock,
    isPending: false,
  } as unknown as ReturnType<typeof useSaveFatigue>);
});

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

describe('FatigueInputTab', () => {
  it('減衰済みエントリでは currentValue でスライダーを初期化する', () => {
    render(<FatigueInputTab muscleId="chest" entry={makeEntry()} />);

    expect(screen.getByRole('slider')).toHaveValue('50');
  });

  it('currentValue の tick 更新では操作中の draft を維持する', () => {
    const { rerender } = render(
      <FatigueInputTab muscleId="chest" entry={makeEntry()} />,
    );

    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } });

    rerender(
      <FatigueInputTab
        muscleId="chest"
        entry={makeEntry({ currentValue: 49, recoveryHoursRemaining: 11.9 })}
      />,
    );

    expect(screen.getByRole('slider')).toHaveValue('20');
  });

  it('保存成功後は最新の currentValue で再初期化する', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <FatigueInputTab muscleId="chest" entry={makeEntry()} />,
    );

    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } });
    await user.click(screen.getByRole('button', { name: '確定' }));

    expect(saveMock).toHaveBeenCalledWith(
      { muscleId: 'chest', value: 20 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    rerender(
      <FatigueInputTab
        muscleId="chest"
        entry={makeEntry({ savedValue: 20, currentValue: 19 })}
      />,
    );
    expect(screen.getByRole('slider')).toHaveValue('20');

    act(() => {
      latestSaveOptions?.onSuccess?.();
    });

    expect(screen.getByRole('slider')).toHaveValue('19');
  });
});
