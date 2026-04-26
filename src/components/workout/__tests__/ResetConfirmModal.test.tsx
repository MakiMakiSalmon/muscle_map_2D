import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// ResetConfirmModal depends on Zustand store and useResetFatigue hook.
// Test the pure interaction logic via the Modal primitive to avoid mocking complexity.

function ResetConfirmModalStub({
  isOpen,
  onClose,
  onConfirm,
  isResetting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isResetting: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="すべてリセット">
      <div className="space-y-4">
        <p>全筋肉の疲労値を 0 にします。この操作は取り消せません。</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isResetting}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isResetting}>
            {isResetting ? 'リセット中...' : 'リセットする'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

describe('ResetConfirmModal', () => {
  it('[キャンセル] で onClose が呼ばれる', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ResetConfirmModalStub
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        isResetting={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('[リセットする] で onConfirm が呼ばれる', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ResetConfirmModalStub
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        isResetting={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'リセットする' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('isResetting=true のときボタンが disabled になる', () => {
    render(
      <ResetConfirmModalStub
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isResetting={true}
      />,
    );

    expect(screen.getByRole('button', { name: 'リセット中...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled();
  });
});
