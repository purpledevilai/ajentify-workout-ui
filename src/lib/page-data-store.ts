import { create } from 'zustand';

interface PageDataState {
  pageName: string;
  pageData: Record<string, unknown>;
  actions: Record<string, { description: string }>;
  setPageData: (
    pageName: string,
    data: Record<string, unknown>,
    actions?: Record<string, { description: string }>,
  ) => void;
}

export const usePageDataStore = create<PageDataState>()((set) => ({
  pageName: '',
  pageData: {},
  actions: {},
  setPageData: (pageName, data, actions = {}) =>
    set({ pageName, pageData: data, actions }),
}));
