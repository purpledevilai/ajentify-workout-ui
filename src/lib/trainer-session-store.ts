import { create } from 'zustand';

export type ConversationType = 'onboarding' | 'in_workout' | 'post_workout' | 'general';

export type SessionMode = 'closed' | 'text' | 'voice';

interface OpenOptions {
  conversationType?: ConversationType;
  workoutId?: string;
}

interface TrainerSessionState {
  mode: SessionMode;
  /** Captured when the session is opened so it survives navigation. */
  conversationType?: ConversationType;
  workoutId?: string;
  open: (mode: 'text' | 'voice', opts?: OpenOptions) => void;
  /** Switch between text and voice without losing the captured context. */
  setMode: (mode: 'text' | 'voice') => void;
  close: () => void;
}

/**
 * The session lives in a store rather than in page state so the trainer
 * session (and its voice connection) survives route changes — the agent can
 * navigate the app mid-conversation without the provider unmounting.
 */
export const useTrainerSession = create<TrainerSessionState>()((set) => ({
  mode: 'closed',
  conversationType: undefined,
  workoutId: undefined,
  open: (mode, opts) =>
    set({ mode, conversationType: opts?.conversationType, workoutId: opts?.workoutId }),
  setMode: (mode) => set({ mode }),
  close: () => set({ mode: 'closed', conversationType: undefined, workoutId: undefined }),
}));
