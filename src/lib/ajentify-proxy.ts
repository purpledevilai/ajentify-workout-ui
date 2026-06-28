import type { AjentifyProxyRequest } from '@ajentify/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export function createAjentifyProxyHandler(getAccessToken: () => string | null) {
  return async function onAjentifyProxyRequest(request: AjentifyProxyRequest) {
    const accessToken = getAccessToken();
    const res = await fetch(`${API_URL}/ajentify/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`Proxy ${request.type} failed: ${res.status}`);
    return res.json();
  };
}
