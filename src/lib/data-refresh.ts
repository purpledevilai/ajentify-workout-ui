import { create } from 'zustand';

interface DataRefreshState {
  version: number;
  bump: () => void;
}

export const useDataRefresh = create<DataRefreshState>()((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
