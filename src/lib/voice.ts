'use client';

// Re-export @ajentify/voice through a local module so Turbopack
// resolves the ESM "use client" package correctly.
export {
  AjentifyVoiceProvider,
  useAgentRoom,
  useAgentRoomStore,
  useAgentRoomEvent,
  useMediaDevices,
  monitorMicStream,
  monitorInboundMediaStream,
} from '@ajentify/voice';

export type {
  AjentifyVoiceConfig,
  AjentifyVoiceProviderProps,
} from '@ajentify/voice';
