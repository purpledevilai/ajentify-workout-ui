import { useAuthStore } from '@/lib/auth-store';
import { api, ApiError } from '@/lib/api';

global.fetch = jest.fn();

const mockFetch = global.fetch as jest.Mock;

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    user: null,
    isLoading: false,
  });
  mockFetch.mockReset();
  delete (window as any).location;
  (window as any).location = { href: '' };
});

describe('api.get', () => {
  it('sends GET request with auth header when token exists', async () => {
    useAuthStore.getState().setAuth('my-token', {
      user_id: '1', email: 'a@b.com', first_name: 'A', last_name: 'B',
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    });

    const result = await api.get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(result).toEqual({ data: 'test' });
  });

  it('sends GET without Authorization header when no token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    });

    await api.get('/test');

    const callHeaders = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders.Authorization).toBeUndefined();
  });
});

describe('api.post', () => {
  it('sends POST with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: '1' }),
    });

    const result = await api.post('/items', { name: 'test' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      }),
    );
    expect(result).toEqual({ id: '1' });
  });
});

describe('api.put', () => {
  it('sends PUT with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ updated: true }),
    });

    const result = await api.put('/items/1', { name: 'updated' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/items/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'updated' }),
      }),
    );
    expect(result).toEqual({ updated: true });
  });
});

describe('api.delete', () => {
  it('sends DELETE request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ deleted: true }),
    });

    const result = await api.delete('/items/1');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/items/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(result).toEqual({ deleted: true });
  });
});

describe('401 retry logic', () => {
  it('retries on 401 with refreshed token', async () => {
    useAuthStore.getState().setAuth('old-token', {
      user_id: '1', email: 'a@b.com', first_name: 'A', last_name: 'B',
    });

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'new-token', user: { user_id: '1', email: 'a@b.com', first_name: 'A', last_name: 'B' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'retried' }),
      });

    const result = await api.get('/protected');

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ data: 'retried' });
    expect(useAuthStore.getState().accessToken).toBe('new-token');
  });

  it('clears auth and redirects to /login when refresh fails', async () => {
    useAuthStore.getState().setAuth('old-token', {
      user_id: '1', email: 'a@b.com', first_name: 'A', last_name: 'B',
    });

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' })
      .mockResolvedValueOnce({ ok: false, status: 401 });

    await expect(api.get('/protected')).rejects.toThrow(ApiError);

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(window.location.href).toBe('/login');
  });
});

describe('error handling', () => {
  it('throws ApiError on non-ok responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    try {
      await api.get('/fail');
      fail('Expected ApiError to be thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(500);
      expect((e as ApiError).body).toBe('Internal Server Error');
    }
  });

  it('returns undefined for 204 responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const result = await api.delete('/items/1');
    expect(result).toBeUndefined();
  });
});

describe('api.authPost', () => {
  it('includes credentials: include', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await api.authPost('/auth/login', { email: 'test@test.com' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/auth/login',
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
      }),
    );
  });
});
