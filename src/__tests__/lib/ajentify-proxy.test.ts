import { createAjentifyProxyHandler } from '@/lib/ajentify-proxy';

global.fetch = jest.fn();

const mockFetch = global.fetch as jest.Mock;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('createAjentifyProxyHandler', () => {
  it('sends POST to /ajentify/proxy with auth header', async () => {
    const getToken = () => 'my-token';
    const handler = createAjentifyProxyHandler(getToken);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 'success' }),
    });

    const request = { type: 'chat', payload: { message: 'hi' } };
    const result = await handler(request as any);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/ajentify/proxy',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer my-token',
        }),
        body: JSON.stringify(request),
      }),
    );
    expect(result).toEqual({ result: 'success' });
  });

  it('sends without auth header when token is null', async () => {
    const getToken = () => null;
    const handler = createAjentifyProxyHandler(getToken);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 'ok' }),
    });

    const request = { type: 'chat', payload: {} };
    await handler(request as any);

    const callHeaders = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders.Authorization).toBeUndefined();
  });

  it('throws on non-ok response', async () => {
    const getToken = () => 'token';
    const handler = createAjentifyProxyHandler(getToken);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const request = { type: 'chat', payload: {} };
    await expect(handler(request as any)).rejects.toThrow('Proxy chat failed: 500');
  });
});
