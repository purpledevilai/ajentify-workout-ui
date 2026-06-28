import { create } from 'zustand';

type ActionHandler = (args: Record<string, unknown>) => unknown | Promise<unknown>;

interface PageActionState {
  handlers: Record<string, ActionHandler>;
  register: (key: string, handler: ActionHandler) => void;
  unregister: (key: string) => void;
  execute: (key: string, args: Record<string, unknown>) => Promise<unknown>;
}

export const usePageActionStore = create<PageActionState>()((set, get) => ({
  handlers: {},
  register: (key, handler) =>
    set((s) => ({ handlers: { ...s.handlers, [key]: handler } })),
  unregister: (key) =>
    set((s) => {
      const { [key]: _, ...rest } = s.handlers;
      return { handlers: rest };
    }),
  execute: async (key, args) => {
    const handler = get().handlers[key];
    if (!handler) return { error: `Unknown action: ${key}` };
    return handler(args);
  },
}));
