import { create } from 'zustand';

export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isLoading: boolean;
  bootstrapped: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  user: null,
  isLoading: true,
  bootstrapped: false,
  setAuth: (token, user) => set({ accessToken: token, user, isLoading: false }),
  clearAuth: () => set({ accessToken: null, user: null, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

let bootstrapPromise: Promise<boolean> | null = null;

/**
 * Attempt to restore the session by calling /auth/refresh with the
 * HttpOnly cookie. Mirrors the ajentify-web bootstrap pattern.
 */
export function bootstrapAuth(): Promise<boolean> {
  const { bootstrapped, accessToken } = useAuthStore.getState();

  if (bootstrapped) return Promise.resolve(accessToken !== null);

  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        useAuthStore.getState().clearAuth();
        useAuthStore.setState({ bootstrapped: true });
        return false;
      }

      const data = await res.json();
      useAuthStore.getState().setAuth(data.access_token, data.user);
      useAuthStore.setState({ bootstrapped: true });
      return true;
    } catch {
      useAuthStore.getState().clearAuth();
      useAuthStore.setState({ bootstrapped: true });
      return false;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}
