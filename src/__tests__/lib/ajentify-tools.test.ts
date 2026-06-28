jest.mock('@ajentify/chat', () => ({
  defineClientSideTools: jest.fn((tools: any) => tools),
}), { virtual: true });

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
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
    expect(tools.update_user_profile).toBeDefined();
    expect(tools.create_workout).toBeDefined();
    expect(tools.get_workouts).toBeDefined();
    expect(tools.update_workout).toBeDefined();
    expect(tools.navigate).toBeDefined();
  });

  it('get_user_profile calls api.get /profile', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    mockApi.get.mockResolvedValueOnce({ name: 'John' });

    const result = await tools.get_user_profile({} as any);
    expect(mockApi.get).toHaveBeenCalledWith('/profile');
    expect(result).toEqual({ name: 'John' });
  });

  it('update_user_profile calls api.put /profile', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    mockApi.put.mockResolvedValueOnce({ updated: true });

    const result = await tools.update_user_profile({ first_name: 'Jane' } as any);
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

  it('get_workouts calls api.get /workouts without params when no date', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    mockApi.get.mockResolvedValueOnce([]);

    const result = await tools.get_workouts({} as any);
    expect(mockApi.get).toHaveBeenCalledWith('/workouts');
    expect(result).toEqual([]);
  });

  it('update_workout calls api.put /workouts/:id', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);
    mockApi.put.mockResolvedValueOnce({ updated: true });

    const result = await tools.update_workout({ workout_id: 'w1', name: 'Leg Day' } as any);
    expect(mockApi.put).toHaveBeenCalledWith('/workouts/w1', { name: 'Leg Day' });
    expect(result).toEqual({ updated: true });
  });

  it('navigate calls routerPush with correct path', async () => {
    const routerPush = jest.fn();
    const tools = createWorkoutTools(routerPush);

    const result = await tools.navigate({ path: '/dashboard' } as any);
    expect(routerPush).toHaveBeenCalledWith('/dashboard');
    expect(result).toEqual({ navigated: true });
  });
});
