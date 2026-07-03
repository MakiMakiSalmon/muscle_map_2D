import { expect, test, type Page } from '@playwright/test';

const MUSCLE_IDS = [
  'head', 'chest', 'back', 'abs',
  'shoulders_left', 'shoulders_right',
  'biceps_left', 'biceps_right',
  'triceps_left', 'triceps_right',
  'forearms_left', 'forearms_right',
  'thighs_left', 'thighs_right',
  'calves_left', 'calves_right',
] as const;

const nowIso = '2026-07-03T03:00:00.000Z';

type MuscleId = typeof MUSCLE_IDS[number];

interface CurrentEntry {
  savedValue: number;
  currentValue: number;
  recordedAt: string;
  recoveryHoursRemaining: number;
}

async function mockApi(page: Page) {
  const current = Object.fromEntries(
    MUSCLE_IDS.map((muscleId) => [
      muscleId,
      {
        savedValue: 0,
        currentValue: 0,
        recordedAt: nowIso,
        recoveryHoursRemaining: 0,
      },
    ]),
  ) as Record<MuscleId, CurrentEntry>;

  const fatigueHistory: Record<string, unknown[]> = {};
  const workoutSessions: unknown[] = [];
  const exercises = [
    {
      id: 'push-up',
      nameJa: '腕立て伏せ',
      nameEn: 'Push-up',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['triceps', 'shoulders'],
    },
  ];

  await page.route('**/api/fatigue/current', async (route) => {
    await route.fulfill({ json: { data: current } });
  });

  await page.route('**/api/fatigue/history**', async (route) => {
    const url = new URL(route.request().url());
    const muscleId = url.searchParams.get('muscleId') ?? 'chest';
    await route.fulfill({ json: { history: fatigueHistory[muscleId] ?? [] } });
  });

  await page.route('**/api/fatigue', async (route) => {
    const body = await route.request().postDataJSON() as { muscleId: MuscleId; value: number };
    const snapshot = {
      id: `manual-${body.muscleId}`,
      muscleId: body.muscleId,
      value: body.value,
      recordedAt: nowIso,
      createdAt: nowIso,
      source: 'manual',
      workoutSessionId: null,
    };
    current[body.muscleId] = {
      savedValue: body.value,
      currentValue: body.value,
      recordedAt: nowIso,
      recoveryHoursRemaining: 24,
    };
    fatigueHistory[body.muscleId] = [snapshot];
    await route.fulfill({ json: { snapshot } });
  });

  await page.route('**/api/exercises**', async (route) => {
    await route.fulfill({ json: { exercises } });
  });

  await page.route('**/api/workout/history**', async (route) => {
    await route.fulfill({ json: { sessions: workoutSessions, nextCursor: null } });
  });

  await page.route('**/api/workout', async (route) => {
    const body = await route.request().postDataJSON() as {
      performedAt: string;
      exercises: { exerciseId: string; sets: number; reps: number | null; weightKg: number | null }[];
    };
    const session = {
      id: 'workout-1',
      performedAt: body.performedAt,
      exercises: body.exercises,
      fatigueImpacts: {
        chest: 24,
        shoulders_left: 12,
        shoulders_right: 12,
        triceps_left: 12,
        triceps_right: 12,
      },
    };
    current.chest = {
      savedValue: 64,
      currentValue: 64,
      recordedAt: body.performedAt,
      recoveryHoursRemaining: 30,
    };
    workoutSessions.unshift(session);
    await route.fulfill({ json: { session, fatigueImpacts: session.fatigueImpacts } });
  });
}

test('ログインから主要フローを通せる', async ({ page }) => {
  await mockApi(page);

  await page.goto('/login');
  await page.getByRole('button', { name: 'Googleでログイン' }).click();

  const chestLayer = (label: string) => page.locator(`svg [role="button"][aria-label="${label}"]`);

  await expect(chestLayer('胸部 0%')).toBeVisible();
  await chestLayer('胸部 0%').click();

  const chestBefore = chestLayer('胸部 0%');
  await expect(chestBefore).toHaveAttribute('fill', '#dddddd');

  await page.getByRole('slider', { name: /疲労度スライダー/ }).fill('40');
  await page.getByRole('button', { name: '確定' }).click();

  const chestAfterManualSave = chestLayer('胸部 40%');
  await expect(chestAfterManualSave).toBeVisible();
  await expect(chestAfterManualSave).toHaveAttribute('fill', '#ffd700');

  await page.getByRole('button', { name: 'トレーニング' }).click();
  await page.getByPlaceholder('種目を検索...').fill('腕立て');
  await page.getByRole('button', { name: /腕立て伏せ/ }).click();
  await page.getByRole('button', { name: '保存して反映' }).click();

  await expect(chestLayer('胸部 64%')).toBeVisible();

  await page.goto('/workout/history');
  await expect(page.getByRole('heading', { name: 'トレーニング履歴' })).toBeVisible();
  await expect(page.getByText('腕立て伏せ 3×10')).toBeVisible();
  await expect(page.getByText(/影響: .*胸部\+24%/)).toBeVisible();
});
