import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import MuscleLayer from '../MuscleLayer';

describe('MuscleLayer', () => {
  it('クリックで onClick が呼ばれる', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <svg>
        <MuscleLayer
          muscleId="chest"
          currentValue={60}
          isSelected={false}
          onClick={onClick}
          pathData="M 62,70 L 138,70 L 140,140 L 60,140 Z"
          fillColor="#ffd700"
        />
      </svg>,
    );

    await user.click(screen.getByRole('button', { name: /胸部/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('isSelected=true のとき青いストロークが付く', () => {
    const { container } = render(
      <svg>
        <MuscleLayer
          muscleId="chest"
          currentValue={60}
          isSelected={true}
          onClick={vi.fn()}
          pathData="M 62,70 L 138,70 L 140,140 L 60,140 Z"
          fillColor="#ffd700"
        />
      </svg>,
    );

    const path = container.querySelector('path');
    expect(path?.getAttribute('stroke')).toBe('#1d4ed8');
    expect(path?.getAttribute('stroke-width')).toBe('2');
  });

  it('aria-label に筋肉名と疲労値が含まれる', () => {
    render(
      <svg>
        <MuscleLayer
          muscleId="back"
          currentValue={40}
          isSelected={false}
          onClick={vi.fn()}
          pathData="M 62,70 L 138,70 L 140,196 L 60,196 Z"
          fillColor="#ffd700"
        />
      </svg>,
    );

    expect(screen.getByRole('button', { name: /背中.*40%/ })).toBeDefined();
  });
});
