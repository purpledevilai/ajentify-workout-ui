import { useAuthStore, bootstrapAuth, User } from '@/lib/auth-store';

const mockUser: User = {
  user_id: 'user-123',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
};

global.fetch = jest.fn();

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    user: null,
    isLoading: true,
  });
  (global.fetch as jest.Mock).mockReset();
});

describe('useAuthStore', () => {
  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(true);
  });

  it('setAuth sets token, user, and isLoading false', () => {
    useAuthStore.getState().setAuth('token-abc', mockUser);
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('token-abc');
    expect(state.user).toEqual(mockUser);
    expect(state.isLoading).toBe(false);
  });

  it('clearAuth clears token and user, sets isLoading false', () => {
    useAuthStore.getState().setAuth('token-abc', mockUser);
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('setLoading updates isLoading', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
  });
});

describe('bootstrapAuth', () => {
  it('calls /auth/refresh and sets auth on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new-token', user: mockUser }),
    });

    await bootstrapAuth();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-token');
    expect(state.user).toEqual(mockUser);
    expect(state.isLoading).toBe(false);
  });

  it('clears auth when response is not ok', async () => {
    useAuthStore.getState().setAuth('old-token', mockUser);
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    await bootstrapAuth();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('clears auth on fetch error', async () => {
    useAuthStore.getState().setAuth('old-token', mockUser);
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await bootstrapAuth();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });
});
