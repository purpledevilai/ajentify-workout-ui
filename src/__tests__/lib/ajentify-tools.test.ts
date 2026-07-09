jest.mock('@ajentify/chat', () => ({
  defineClientSideTools: jest.fn((tools: any) => tools),
}), { virtual: true });

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/lib/data-refresh', () => ({
  useDataRefresh: {
    getState: () => ({ bump: jest.fn() }),
  },
}));

jest.mock('@/lib/page-data-store', () => ({
  usePageDataStore: {
    getState: () => ({
      pageName: 'dashboard',
      pageData: { total_workouts: 5 },
      actions: { refresh_data: { description: 'Reload data' } },
    }),
  },
}));

jest.mock('@/lib/page-action-store', () => ({
  usePageActionStore: {
    getState: () => ({
      execute: jest.fn().mockResolvedValue({ ok: true }),
    }),
  },
}));

jest.mock('@/lib/local-date', () => ({
  localDateString: jest.fn(() => '2024-01-01'),
}));

import { createWorkoutTools } from '@/lib/ajentify-tools';
import { api } from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createWorkoutTools', () => {
  it('returns defined tools', () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    expect(tools).toBeDefined();
    expect(tools.get_user_profile).toBeDefined();
    expect(tools.save_user_profile).toBeDefined();
    expect(tools.create_workout).toBeDefined();
    expect(tools.get_workouts).toBeDefined();
    expect(tools.update_workout).toBeDefined();
    expect(tools.patch_workout).toBeDefined();
    expect(tools.delete_workout).toBeDefined();
    expect(tools.navigate).toBeDefined();
    expect(tools.submit_feedback).toBeDefined();
    expect(tools.get_page_data).toBeDefined();
    expect(tools.do_page_action).toBeDefined();
  });

  it('get_user_profile calls api.get /profile', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    mockApi.get.mockResolvedValueOnce({ name: 'John' });

    const result = await tools.get_user_profile({} as any);
    expect(mockApi.get).toHaveBeenCalledWith('/profile');
    expect(result).toEqual({ name: 'John' });
  });

  it('save_user_profile calls api.put /profile', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    mockApi.put.mockResolvedValueOnce({ updated: true });

    const result = await tools.save_user_profile({ first_name: 'Jane' } as any);
    expect(mockApi.put).toHaveBeenCalledWith('/profile', { first_name: 'Jane' });
    expect(result).toEqual({ updated: true });
  });

  it('create_workout calls api.post /workouts', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    mockApi.post.mockResolvedValueOnce({ id: 'w1' });

    const result = await tools.create_workout({ type: 'strength' } as any);
    expect(mockApi.post).toHaveBeenCalledWith('/workouts', { type: 'strength' });
    expect(result).toEqual({ id: 'w1' });
  });

  it('get_workouts calls api.get /workouts with date param', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    mockApi.get.mockResolvedValueOnce([]);

    const result = await tools.get_workouts({ date: '2024-01-01' } as any);
    expect(mockApi.get).toHaveBeenCalledWith('/workouts?date=2024-01-01');
    expect(result).toEqual([]);
  });

  it('get_workouts defaults to 7-day range when no date given', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    mockApi.get.mockResolvedValueOnce([]);

    await tools.get_workouts({} as any);
    const calledUrl = mockApi.get.mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/\/workouts\?start_date=.*&end_date=.*/);
  });

  it('update_workout calls api.put /workouts/:id', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    mockApi.put.mockResolvedValueOnce({ updated: true });

    const result = await tools.update_workout({ workout_id: 'w1', name: 'Leg Day' } as any);
    expect(mockApi.put).toHaveBeenCalledWith('/workouts/w1', { name: 'Leg Day' });
    expect(result).toEqual({ updated: true });
  });

  it('patch_workout calls api.patch /workouts/:id', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    mockApi.patch.mockResolvedValueOnce({ patched: true });

    const result = await tools.patch_workout({ workout_id: 'w1', name: 'Push Day' } as any);
    expect(mockApi.patch).toHaveBeenCalledWith('/workouts/w1', { name: 'Push Day' });
    expect(result).toEqual({ patched: true });
  });

  it('delete_workout calls api.delete /workouts/:id', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    mockApi.delete.mockResolvedValueOnce(undefined);

    const result = await tools.delete_workout({ workout_id: 'w1' } as any);
    expect(mockApi.delete).toHaveBeenCalledWith('/workouts/w1');
    expect(result).toEqual({ success: true, deleted: 'w1' });
  });

  it('navigate calls routerPush with correct path', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);

    const result = await tools.navigate({ path: '/dashboard' } as any);
    expect(routerPush).toHaveBeenCalledWith('/dashboard');
    expect(result).toEqual({ navigated: true });
  });

  it('get_page_data returns page store state', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);

    const result = await tools.get_page_data({} as any);
    expect(result).toEqual({
      data: { page: 'dashboard', path: window.location.pathname, total_workouts: 5 },
      actions: { refresh_data: { description: 'Reload data' } },
    });
  });

  it('do_page_action handles refresh_data', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);

    const result = await tools.do_page_action({ action: 'refresh_data' } as any);
    expect(result).toEqual({ ok: true });
  });

  it('do_page_action handles set_voice_layout gracefully in text mode', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);

    const result = await tools.do_page_action({ action: 'set_voice_layout', args: { mode: 'compact' } } as any);
    expect(result).toEqual({ ok: true, note: 'voice layout not applicable in text mode' });
  });
});
