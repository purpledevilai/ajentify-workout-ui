import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = `pw-test-${Date.now()}@test.ajentify.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_FIRST = 'Playwright';
const TEST_LAST = 'Tester';

const consoleErrors: string[] = [];

function trackConsoleErrors(page: Page) {
  consoleErrors.length = 0;
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });
}

function expectNoFatalErrors() {
  const fatal = consoleErrors.filter(
    (e) =>
      e.includes('Element type is invalid') ||
      e.includes('getSnapshot should be cached') ||
      e.includes('Uncaught') ||
      e.includes('Unhandled'),
  );
  expect(fatal).toEqual([]);
}

// ─── Public pages (no auth) ────────────────────────────────────────

test.describe('Public pages', () => {
  test('Landing page loads without errors', async ({ page }) => {
    trackConsoleErrors(page);
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started', exact: true }).first()).toBeVisible();
    expectNoFatalErrors();
  });

  test('Login page renders form correctly', async ({ page }) => {
    trackConsoleErrors(page);
    await page.goto('/login');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
    expectNoFatalErrors();
  });

  test('Signup page renders form correctly', async ({ page }) => {
    trackConsoleErrors(page);
    await page.goto('/signup');
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    expectNoFatalErrors();
  });

  test('Reset password page renders form correctly', async ({ page }) => {
    trackConsoleErrors(page);
    await page.goto('/reset-password');
    await expect(page.getByText('Reset password')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
    expectNoFatalErrors();
  });

  test('Login shows error for invalid credentials', async ({ page }) => {
    trackConsoleErrors(page);
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('nonexistent@test.com');
    await page.locator('input[id="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|wrong|error/i)).toBeVisible({ timeout: 10000 });
    expectNoFatalErrors();
  });

  test('Signup calls correct API endpoint', async ({ page }) => {
    trackConsoleErrors(page);
    await page.goto('/signup');

    let apiPath = '';
    page.on('request', (req) => {
      if (req.url().includes('/auth/')) {
        apiPath = new URL(req.url()).pathname;
      }
    });

    await page.locator('#firstName').fill(TEST_FIRST);
    await page.locator('#lastName').fill(TEST_LAST);
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[id="password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();

    await page.waitForTimeout(3000);
    expect(apiPath).toBe('/auth/create-account');
    expectNoFatalErrors();
  });
});

// ─── Protected pages (need auth) ──────────────────────────────────

test.describe('Protected pages (auth redirect)', () => {
  test('Dashboard redirects to login when not authenticated', async ({ page }) => {
    trackConsoleErrors(page);
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expectNoFatalErrors();
  });

  test('Calendar redirects to login when not authenticated', async ({ page }) => {
    trackConsoleErrors(page);
    await page.goto('/calendar');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expectNoFatalErrors();
  });

  test('Profile redirects to login when not authenticated', async ({ page }) => {
    trackConsoleErrors(page);
    await page.goto('/profile');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expectNoFatalErrors();
  });
});

// ─── Authenticated flow ──────────────────────────────────────────

test.describe('Authenticated pages', () => {
  const API_URL = 'https://iynjgc5x87.execute-api.ap-southeast-2.amazonaws.com';

  async function mockAuthenticatedSession(page: Page) {
    await page.route(`${API_URL}/auth/refresh`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-access-token',
          user: {
            user_id: 'pw-test-user',
            email: TEST_EMAIL,
            first_name: TEST_FIRST,
            last_name: TEST_LAST,
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
    await page.route(`${API_URL}/profile`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: { user_id: 'pw-test-user', goals: '', experience: '' } }),
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

  test('Dashboard renders without runtime errors', async ({ page }) => {
    trackConsoleErrors(page);
    await mockAuthenticatedSession(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/dashboard');
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    expectNoFatalErrors();
  });

  test('Calendar page renders without runtime errors', async ({ page }) => {
    trackConsoleErrors(page);
    await mockAuthenticatedSession(page);
    await page.goto('/calendar', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/calendar');
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    expectNoFatalErrors();
  });

  test('Profile page renders without runtime errors', async ({ page }) => {
    trackConsoleErrors(page);
    await mockAuthenticatedSession(page);
    await page.goto('/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/profile');
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    expectNoFatalErrors();
  });
});

// ─── Navigation & Links ─────────────────────────────────────────

test.describe('Navigation', () => {
  test('Login page → Signup page link works', async ({ page }) => {
    trackConsoleErrors(page);
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await page.waitForURL(/\/signup/);
    await expect(page.getByText('Create your account')).toBeVisible();
    expectNoFatalErrors();
  });

  test('Signup page → Login page link works', async ({ page }) => {
    trackConsoleErrors(page);
    await page.goto('/signup');
    await page.getByRole('link', { name: /sign in/i }).click();
    await page.waitForURL(/\/login/);
    await expect(page.getByText('Welcome back')).toBeVisible();
    expectNoFatalErrors();
  });

  test('Login page → Reset password link works', async ({ page }) => {
    trackConsoleErrors(page);
    await page.goto('/login');
    await page.getByRole('link', { name: /forgot password/i }).click();
    await page.waitForURL(/\/reset-password/);
    await expect(page.getByText('Reset password')).toBeVisible();
    expectNoFatalErrors();
  });
});
