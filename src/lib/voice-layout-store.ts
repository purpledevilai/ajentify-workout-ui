import { create } from 'zustand';

export type VoiceLayout = 'center' | 'compact';

interface VoiceLayoutState {
  layout: VoiceLayout;
  setLayout: (layout: VoiceLayout) => void;
}

export const useVoiceLayout = create<VoiceLayoutState>()((set) => ({
  layout: 'center',
  setLayout: (layout) => set({ layout }),
}));
