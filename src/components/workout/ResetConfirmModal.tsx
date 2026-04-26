'use client';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useUIStore } from '@/stores/uiStore';
import { useResetFatigue } from '@/hooks/useFatigue';

export default function ResetConfirmModal() {
  const { isResetModalOpen, closeResetModal } = useUIStore();
  const { mutate: reset, isPending } = useResetFatigue();

  const handleConfirm = () => {
    reset(undefined, {
      onSuccess: () => closeResetModal(),
    });
  };

  return (
    <Modal isOpen={isResetModalOpen} onClose={closeResetModal} title="すべてリセット">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          全筋肉の疲労値を 0 にします。
          <br />
          この操作は取り消せません。
        </p>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={closeResetModal}
            disabled={isPending}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? 'リセット中...' : 'リセットする'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
