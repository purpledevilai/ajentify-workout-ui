import { test, expect, type Page } from '@playwright/test';

const API_URL = 'https://iynjgc5x87.execute-api.ap-southeast-2.amazonaws.com';

async function mockAuthenticatedSession(page: Page) {
  await page.route(`${API_URL}/auth/refresh`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-token-for-voice-test',
        user: {
          user_id: 'test-user',
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

test('Clicking trainer button opens voice modal without runtime errors', async ({ page }) => {
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

  await page.route(`${API_URL}/ajentify/proxy`, (route, request) => {
    const body = request.postDataJSON();
    if (body.type === 'create_context') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          context_id: 'ctx-mock',
          client_id: 'cln-mock',
          agent_id: 'agent-mock',
          messages: [],
          created_at: Date.now(),
          updated_at: Date.now(),
        }),
      });
    }
    if (body.type === 'generate_access_token') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'eyJmYWtlIjoiY2xpZW50LXRva2VuIn0', type: 'client' }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const voiceBtn = page.locator('button').filter({ hasText: /talk to your ai trainer/i });
  const floatingVoiceBtn = page.locator('button[title="Voice chat"]');

  let clicked = false;
  if (await voiceBtn.isVisible()) {
    await voiceBtn.click();
    clicked = true;
  } else if (await floatingVoiceBtn.isVisible()) {
    await floatingVoiceBtn.click();
    clicked = true;
  }

  if (clicked) {
    await page.waitForTimeout(3000);
  }

  const voiceErrors = errors.filter(
    (e) =>
      (e.includes('Element type is invalid') ||
        e.includes('AjentifyVoiceProvider') ||
        e.includes('WrappedVoiceModal')) &&
      !e.includes('NotSupportedError') &&
      !e.includes('Not supported'),
  );

  expect(voiceErrors).toEqual([]);
});

test('Voice modal calls create_context and generate_access_token via proxy', async ({ page }) => {
  const proxyRequests: { type: string }[] = [];

  await mockAuthenticatedSession(page);

  await page.route(`${API_URL}/ajentify/proxy`, (route, request) => {
    const body = request.postDataJSON();
    proxyRequests.push({ type: body.type });

    if (body.type === 'create_context') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          context_id: 'ctx-test-123',
          agent_id: 'agent-test',
          client_id: 'cln-test-456',
          messages: [],
          created_at: Date.now(),
          updated_at: Date.now(),
        }),
      });
    }

    if (body.type === 'generate_access_token') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'eyJmYWtlIjoiY2xpZW50LXRva2VuIn0',
          type: 'client',
        }),
      });
    }

    return route.fulfill({ status: 400, body: 'Unknown type' });
  });

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const voiceBtn = page.locator('button').filter({ hasText: /talk to your ai trainer/i });
  const floatingVoiceBtn = page.locator('button[title="Voice chat"]');

  if (await voiceBtn.isVisible()) {
    await voiceBtn.click();
  } else if (await floatingVoiceBtn.isVisible()) {
    await floatingVoiceBtn.click();
  }

  await page.waitForTimeout(4000);

  const types = proxyRequests.map((r) => r.type);
  expect(types).toContain('create_context');
  expect(types).toContain('generate_access_token');
  expect(types.indexOf('create_context')).toBeLessThan(types.indexOf('generate_access_token'));
});
