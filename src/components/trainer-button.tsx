'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import {
  AjentifyVoiceProvider,
  useAgentRoom,
  useAgentRoomStore,
  useAgentRoomEvent,
  monitorMicStream,
  monitorInboundMediaStream,
} from '@/lib/voice';
import type { ClientSideToolCall } from '@ajentify/voice';
import { useDataRefresh } from '@/lib/data-refresh';
import { usePageDataStore } from '@/lib/page-data-store';
import { usePageActionStore } from '@/lib/page-action-store';
import { useVoiceLayout, type VoiceLayout } from '@/lib/voice-layout-store';
import { Mic, MicOff, PhoneOff, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';

interface TrainerButtonProps {
  prominent?: boolean;
  className?: string;
}

type ToolHandler = (input: Record<string, any>) => Promise<string> | string;

function createVoiceToolHandlers(
  routerPush: (path: string) => void,
  getPathname: () => string,
  onDataMutated: () => void,
  setLayout: (layout: VoiceLayout) => void,
): Record<string, ToolHandler> {
  return {
    get_user_profile: async () => {
      const result = await api.get('/profile');
      return JSON.stringify(result);
    },
    save_user_profile: async (input) => {
      const result = await api.put('/profile', input);
      onDataMutated();
      return JSON.stringify(result);
    },
    create_workout: async (input) => {
      const result = await api.post('/workouts', input);
      onDataMutated();
      return JSON.stringify(result);
    },
    get_workouts: async (input) => {
      const params = input.date ? `?date=${input.date}` : '';
      const result = await api.get(`/workouts${params}`);
      return JSON.stringify(result);
    },
    update_workout: async (input) => {
      const { workout_id, ...body } = input;
      const result = await api.put(`/workouts/${workout_id}`, body);
      onDataMutated();
      return JSON.stringify(result);
    },
    add_calendar_entries: async (input) => {
      const result = await api.put(`/calendar/${input.month}`, { entries: input.entries });
      onDataMutated();
      return JSON.stringify(result);
    },
    navigate: (input) => {
      routerPush(input.path);
      return JSON.stringify({ navigated: true, path: input.path });
    },
    get_page_data: () => {
      const { pageName, pageData, actions } = usePageDataStore.getState();
      return JSON.stringify({
        data: { page: pageName, path: getPathname(), ...pageData },
        actions,
      });
    },
    do_page_action: async (input) => {
      const key = input.action ?? input.key;
      const args = input.args ?? input;

      if (key === 'set_voice_layout') {
        const mode = args.mode ?? args.layout ?? 'compact';
        setLayout(mode as VoiceLayout);
        return JSON.stringify({ ok: true, layout: mode });
      }

      if (key === 'refresh_data') {
        onDataMutated();
        return JSON.stringify({ ok: true });
      }

      const result = await usePageActionStore.getState().execute(key, args);
      return JSON.stringify(result);
    },
  };
}

function VoiceModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const userName = user?.first_name ?? 'there';
  const bumpData = useDataRefresh((s) => s.bump);
  const layout = useVoiceLayout((s) => s.layout);
  const setLayout = useVoiceLayout((s) => s.setLayout);
  const store = useAgentRoomStore();
  const isConnecting = useAgentRoom((s: any) => s.isConnecting);
  const isConnected = useAgentRoom((s: any) => s.isConnected);
  const audioMuted = useAgentRoom((s: any) => s.audioMuted);
  const mediaStream = useAgentRoom((s: any) => s.mediaStream);
  const agentMediaStream = useAgentRoom((s: any) => s.agentMediaStream);

  const [userVolume, setUserVolume] = useState(0);
  const [agentVolume, setAgentVolume] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [agentText, setAgentText] = useState('');

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const toolHandlers = useRef(
    createVoiceToolHandlers(
      (p) => router.push(p),
      () => pathnameRef.current,
      bumpData,
      setLayout,
    ),
  );

  useAgentRoomEvent(
    'on_client_side_tool_calls',
    useCallback(async ({ tool_calls }: { tool_calls: ClientSideToolCall[] }) => {
      const tool_responses = await Promise.all(
        tool_calls.map(async (call) => {
          const handler = toolHandlers.current[call.tool_name];
          let response: string;
          if (handler) {
            try {
              response = await handler(call.tool_input);
            } catch (err) {
              response = JSON.stringify({
                error: err instanceof Error ? err.message : 'Tool execution failed',
              });
            }
          } else {
            response = JSON.stringify({ error: `Unknown tool: ${call.tool_name}` });
          }
          return { tool_call_id: call.tool_call_id, response };
        }),
      );

      store.getState().send('client_side_tool_responses', { tool_responses });
    }, [store]),
  );

  useAgentRoomEvent('speech_detected', useCallback((p: { text: string }) => setTranscript(p.text), []));
  useAgentRoomEvent('ai_sentence', useCallback((p: { sentence: string }) => setAgentText(p.sentence), []));
  useAgentRoomEvent('agent_finished_speaking', useCallback(() => {}, []));

  useEffect(() => {
    if (!mediaStream) return;
    return monitorMicStream(mediaStream, setUserVolume);
  }, [mediaStream]);

  useEffect(() => {
    if (!agentMediaStream) return;
    return monitorInboundMediaStream(agentMediaStream, setAgentVolume);
  }, [agentMediaStream]);

  const [error, setError] = useState<string | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!accessToken || isConnected || isConnecting || hasStartedRef.current) return;
    hasStartedRef.current = true;

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

    (async () => {
      try {
        const now = new Date();
        const userContext = [
          `Name: ${user?.first_name ?? 'Unknown'} ${user?.last_name ?? ''}`.trim(),
          `Current date and time: ${now.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`,
          `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
          `Today's date (ISO): ${now.toISOString().slice(0, 10)}`,
        ].join('\n');

        const ctxRes = await fetch(`${API_URL}/ajentify/proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            type: 'create_context',
            request: {
              prompt_args: { user_context: userContext },
              invoke_agent_message: true,
            },
          }),
        });
        if (!ctxRes.ok) throw new Error(`Create context failed: ${ctxRes.status}`);
        const ctx = await ctxRes.json();

        const tokenRes = await fetch(`${API_URL}/ajentify/proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ type: 'generate_access_token' }),
        });
        if (!tokenRes.ok) throw new Error(`Generate token failed: ${tokenRes.status}`);
        const tokenData = await tokenRes.json();
        const clientToken = typeof tokenData === 'string' ? tokenData : tokenData.token;

        await store.getState().initialize(ctx.context_id, clientToken);
      } catch (err) {
        console.error('[VoiceModal] setup failed', err);
        setError(err instanceof Error ? err.message : 'Connection failed');
        hasStartedRef.current = false;
      }
    })();
  }, [accessToken, isConnected, isConnecting, store]);

  function handleDisconnect() {
    store.getState().disconnect();
    setLayout('center');
    onClose();
  }

  function handleToggleMute() {
    store.getState().toggleMute();
  }

  function handleToggleLayout() {
    setLayout(layout === 'center' ? 'compact' : 'center');
  }

  const micScale = 1 + (userVolume / 255) * 0.3;
  const agentScale = 1 + (agentVolume / 255) * 0.4;

  if (layout === 'compact') {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-background border shadow-xl px-4 py-3 transition-all animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div
          className="relative flex size-10 items-center justify-center rounded-full bg-primary/10 transition-transform duration-150 shrink-0"
          style={{ transform: `scale(${agentScale})` }}
        >
          {isConnecting ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <div className="size-5 rounded-full bg-primary/30" />
          )}
        </div>

        {agentText && (
          <p className="text-xs max-w-[200px] truncate text-muted-foreground italic">
            {agentText}
          </p>
        )}

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleLayout}
            className="size-8 rounded-full"
          >
            <Maximize2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleMute}
            disabled={!isConnected}
            className={cn(
              'size-8 rounded-full transition-transform duration-150',
              audioMuted && 'bg-destructive/10 text-destructive',
            )}
            style={{ transform: !audioMuted ? `scale(${micScale})` : undefined }}
          >
            {audioMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDisconnect}
            className="size-8 rounded-full text-destructive hover:bg-destructive/10"
          >
            <PhoneOff className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) handleDisconnect(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">Voice Trainer</DialogTitle>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-semibold">
              {error ? 'Connection Error' : isConnecting ? 'Connecting...' : isConnected ? 'AI Trainer' : 'Starting...'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {error ?? (isConnected ? `Hey ${userName}, I'm listening` : 'Setting up voice connection')}
            </p>
          </div>

          <div
            className="relative flex size-24 items-center justify-center rounded-full bg-primary/10 transition-transform duration-150"
            style={{ transform: `scale(${agentScale})` }}
          >
            <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
            {isConnecting ? (
              <Loader2 className="size-8 animate-spin text-primary" />
            ) : (
              <div className="size-10 rounded-full bg-primary/20" />
            )}
          </div>

          {agentText && (
            <p className="text-sm text-center max-w-[280px] text-muted-foreground italic">
              &ldquo;{agentText}&rdquo;
            </p>
          )}

          {transcript && (
            <p className="text-xs text-center max-w-[280px] text-muted-foreground">
              You: {transcript}
            </p>
          )}

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleLayout}
              className="size-12 rounded-full"
              title="Minimize"
            >
              <Minimize2 className="size-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleMute}
              disabled={!isConnected}
              className={cn(
                'size-12 rounded-full transition-transform duration-150',
                audioMuted && 'bg-destructive/10 text-destructive border-destructive/20',
              )}
              style={{ transform: !audioMuted ? `scale(${micScale})` : undefined }}
            >
              {audioMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDisconnect}
              className="size-12 rounded-full"
            >
              <PhoneOff className="size-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TrainerButton({ prominent = false, className }: TrainerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {prominent ? (
        <Button
          size="lg"
          className={cn(
            'gap-2 rounded-full px-8 shadow-lg hover:shadow-xl transition-all',
            className,
          )}
          onClick={() => setOpen(true)}
        >
          <Mic className="size-5" />
          Talk to your AI Trainer
        </Button>
      ) : (
        <Button
          size="icon"
          className={cn(
            'fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-lg hover:shadow-xl transition-all',
            className,
          )}
          onClick={() => setOpen(true)}
        >
          <Mic className="size-6" />
        </Button>
      )}
      {open && (
        <AjentifyVoiceProvider>
          <VoiceModal onClose={() => setOpen(false)} />
        </AjentifyVoiceProvider>
      )}
    </>
  );
}
