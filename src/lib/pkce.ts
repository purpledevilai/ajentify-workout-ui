const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
  '130533488030-fumf39v9i18u2sp4dpmqfdfrffhv5dtv.apps.googleusercontent.com';

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return base64url(bytes.buffer);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64url(hash);
}

export function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return base64url(bytes.buffer);
}

const PKCE_KEY = 'ajentify_pkce';

interface PkceStash {
  code_verifier: string;
  state: string;
  provider: string;
}

export function stashPkce(verifier: string, state: string, provider: string): void {
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ code_verifier: verifier, state, provider }));
}

export function popPkce(): PkceStash | null {
  const raw = sessionStorage.getItem(PKCE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PKCE_KEY);
  try {
    return JSON.parse(raw) as PkceStash;
  } catch {
    return null;
  }
}

export function getGoogleOAuthUrl(state: string, codeChallenge: string): string {
  const redirectUri = `${window.location.origin}/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
