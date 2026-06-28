import { test, expect, type Page } from '@playwright/test';

const API_URL = 'https://iynjgc5x87.execute-api.ap-southeast-2.amazonaws.com';

const fakeUser = {
  user_id: 'test-user',
  email: 'test@test.com',
  first_name: 'Test',
  last_name: 'User',
};

/**
 * Mock the /auth/refresh endpoint to simulate a valid session cookie.
 * This mimics what happens when the browser has a valid HttpOnly cookie.
 */
async function mockRefreshSuccess(page: Page) {
  await page.route(`${API_URL}/auth/refresh`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'fake-access-token', user: fakeUser }),
    }),
  );
}

async function mockRefreshFailure(page: Page) {
  await page.route(`${API_URL}/auth/refresh`, (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Missing refresh token' }),
    }),
  );
}

/** Stub all authenticated API calls to prevent 401 cascades. */
async function mockApiCalls(page: Page) {
  await page.route(`${API_URL}/workouts**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workouts: [] }),
    }),
  );
  await page.route(`${API_URL}/profile`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ profile: { user_id: 'test-user', goals: '', experience: '' } }),
    }),
  );
  await page.route(`${API_URL}/calendar/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ calendar: { entries: [] } }),
    }),
  );
}

test('Bootstrap calls /auth/refresh and stays on dashboard when cookie is valid', async ({ page }) => {
  await mockRefreshSuccess(page);
  await mockApiCalls(page);

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  expect(page.url()).toContain('/dashboard');
});

test('Bootstrap redirects to login when refresh cookie is missing/expired', async ({ page }) => {
  await mockRefreshFailure(page);

  await page.goto('/dashboard');
  await page.waitForURL(/\/login/, { timeout: 10000 });

  expect(page.url()).toContain('/login');
});

test('Auth persists across page refresh (cookie-based)', async ({ page }) => {
  await mockRefreshSuccess(page);
  await mockApiCalls(page);

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  expect(page.url()).toContain('/dashboard');

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  expect(page.url()).toContain('/dashboard');
});

test('Navigating between pages preserves auth', async ({ page }) => {
  await mockRefreshSuccess(page);
  await mockApiCalls(page);

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  expect(page.url()).toContain('/dashboard');

  // Navigate via URL (simulates clicking a link) — auth should persist in-memory
  await page.goto('/calendar', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  expect(page.url()).toContain('/calendar');

  await page.goto('/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  expect(page.url()).toContain('/profile');
});

test('Login redirect preserves next param', async ({ page }) => {
  await mockRefreshFailure(page);

  await page.goto('/calendar');
  await page.waitForURL(/\/login/, { timeout: 10000 });

  expect(page.url()).toContain('next=');
  expect(page.url()).toContain('%2Fcalendar');
});
