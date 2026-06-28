import { test, expect, type Page } from '@playwright/test';

/**
 * This test validates that the authenticated app shell
 * (which includes TrainerSession) renders
 * without "Element type is invalid" or other runtime errors.
 */

const API_URL = 'https://iynjgc5x87.execute-api.ap-southeast-2.amazonaws.com';

async function mockAuthenticatedSession(page: Page) {
  await page.route(`${API_URL}/auth/refresh`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-token-for-render-test',
        user: {
          user_id: 'test-user-id',
          email: 'test@test.com',
          first_name: 'Test',
          last_name: 'User',
        },
      }),
    }),
  );
  await page.route(`${API_URL}/workouts**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workouts: [] }),
    }),
  );
}

test('AppShell with TrainerSession renders without runtime errors', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await mockAuthenticatedSession(page);
  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  await page.waitForTimeout(3000);

  const voiceProviderErrors = errors.filter(
    (e) =>
      e.includes('Element type is invalid') ||
      e.includes('AjentifyVoiceProvider') ||
      e.includes('getSnapshot should be cached'),
  );

  if (voiceProviderErrors.length > 0) {
    console.log('--- RUNTIME ERRORS DETECTED ---');
    voiceProviderErrors.forEach((e) => console.log(e));
    console.log('--- END ERRORS ---');
  }

  expect(voiceProviderErrors).toEqual([]);
});
