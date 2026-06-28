import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  stashPkce,
  popPkce,
  getGoogleOAuthUrl,
} from '@/lib/pkce';

describe('generateCodeVerifier', () => {
  it('produces a base64url string of expected length', () => {
    const verifier = generateCodeVerifier();
    expect(typeof verifier).toBe('string');
    expect(verifier.length).toBeGreaterThan(0);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('generateCodeChallenge', () => {
  it('produces a different string from the verifier (S256)', async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    expect(typeof challenge).toBe('string');
    expect(challenge).not.toBe(verifier);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('generateState', () => {
  it('produces a base64url string', () => {
    const state = generateState();
    expect(typeof state).toBe('string');
    expect(state.length).toBeGreaterThan(0);
    expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('stashPkce and popPkce', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('correctly stores and retrieves PKCE data', () => {
    stashPkce('verifier-123', 'state-456', 'google');
    const result = popPkce();
    expect(result).toEqual({
      code_verifier: 'verifier-123',
      state: 'state-456',
      provider: 'google',
    });
  });

  it('clears data after pop', () => {
    stashPkce('verifier-123', 'state-456', 'google');
    popPkce();
    const result = popPkce();
    expect(result).toBeNull();
  });

  it('returns null when nothing stashed', () => {
    const result = popPkce();
    expect(result).toBeNull();
  });
});

describe('getGoogleOAuthUrl', () => {
  beforeEach(() => {
    delete (window as any).location;
    (window as any).location = { origin: 'http://localhost:3001' };
  });

  it('constructs a valid Google OAuth URL with all params', () => {
    const url = getGoogleOAuthUrl('test-state', 'test-challenge');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');

    const parsed = new URL(url);
    expect(parsed.searchParams.get('client_id')).toBe(
      '130533488030-fumf39v9i18u2sp4dpmqfdfrffhv5dtv.apps.googleusercontent.com',
    );
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3001/callback');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('scope')).toBe('openid email profile');
    expect(parsed.searchParams.get('state')).toBe('test-state');
    expect(parsed.searchParams.get('code_challenge')).toBe('test-challenge');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('access_type')).toBe('offline');
    expect(parsed.searchParams.get('prompt')).toBe('consent');
  });
});
