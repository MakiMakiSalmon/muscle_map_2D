import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import Modal from '../Modal';

describe('Modal', () => {
  it('Tab と Shift+Tab でモーダル内のフォーカスが循環する', async () => {
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={vi.fn()} title="テストモーダル">
        <button>最初</button>
        <button>最後</button>
      </Modal>,
    );

    const close = screen.getByRole('button', { name: '閉じる' });
    const first = screen.getByRole('button', { name: '最初' });
    const last = screen.getByRole('button', { name: '最後' });

    await waitFor(() => expect(close).toHaveFocus());

    await user.tab();
    expect(first).toHaveFocus();

    await user.tab();
    expect(last).toHaveFocus();

    await user.tab();
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it('閉じたときに呼び出し元へフォーカスを戻す', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>呼び出し元</button>
          <Modal
            isOpen={open}
            onClose={() => {
              onClose();
              setOpen(false);
            }}
            title="テストモーダル"
          >
            <button>内容</button>
          </Modal>
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: '呼び出し元' });
    await user.click(trigger);

    await waitFor(() => expect(screen.getByRole('button', { name: '閉じる' })).toHaveFocus());
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
