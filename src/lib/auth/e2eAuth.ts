export const E2E_AUTH_TOKEN = process.env.NEXT_PUBLIC_E2E_AUTH_TOKEN;

export function isE2EAuthEnabled(): boolean {
  return Boolean(E2E_AUTH_TOKEN);
}

export function getE2EAuthToken(): string | null {
  return E2E_AUTH_TOKEN ?? null;
}

export const E2E_USER = {
  displayName: 'E2E User',
  email: 'e2e@example.test',
};
