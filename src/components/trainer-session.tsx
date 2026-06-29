'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
import { useAjentifyStores } from '@ajentify/chat';
import { ChatView } from '@ajentify/chat/ui';
import { useDataRefresh } from '@/lib/data-refresh';
import { usePageDataStore } from '@/lib/page-data-store';
import { usePageActionStore } from '@/lib/page-action-store';
import { useVoiceLayout, type VoiceLayout } from '@/lib/voice-layout-store';
import { Mic, MicOff, PhoneOff, Loader2, Maximize2, Minimize2, MessageSquare, X, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { localDateString } from '@/lib/local-date';

export type ConversationType = 'onboarding' | 'in_workout' | 'post_workout' | 'general';

type ToolHandler = (input: Record<string, any>) => Promise<string> | string;

function buildUserContextPromptArgs() {
  const now = new Date();
  const upcomingDates: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    upcomingDates.push(`${dayName} ${localDateString(d)}`);
  }
  return {
    user_context: [
      `Current date and time: ${now.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`,
      `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
      `Today's date (ISO): ${localDateString(now)}`,
      `Upcoming dates (day-of-week to ISO date):\n${upcomingDates.join('\n')}`,
    ].join('\n'),
  };
}

export function useConversationType(): { type: ConversationType; workoutId?: string } {
  const pathname = usePathname();
  const pageData = usePageDataStore((s) => s.pageData);

  const workoutMatch = pathname.match(/^\/workout\/(.+)$/);
  if (workoutMatch) {
    const workoutId = workoutMatch[1];
    const status = pageData?.status as string | undefined;
    if (status === 'completed') {
      return { type: 'post_workout', workoutId };
    }
    return { type: 'in_workout', workoutId };
  }

  const hasWorkouts = pageData?.total_workouts !== undefined
    ? (pageData.total_workouts as number) > 0
    : true;

  if (pathname === '/dashboard' && !hasWorkouts) {
    return { type: 'onboarding' };
  }

  return { type: 'general' };
}

function triggerSummarize(contextId: string, conversationType: string) {
  api.post('/conversations/summarize', {
    context_id: contextId,
    conversation_type: conversationType,
  }).catch((err) => {
    console.warn('[TrainerSession] summarize failed (non-critical):', err);
  });
}

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
    submit_feedback: async (input) => {
      const result = await api.post('/feedback', {
        message: input.message,
        source: input.source ?? 'user',
        app_version: '1.0.0',
        page: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });
      return JSON.stringify(result);
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

function VoiceSession({
  conversationType,
  workoutId,
  onSwitchToText,
  onClose,
}: {
  conversationType: ConversationType;
  workoutId?: string;
  onSwitchToText: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
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
  const [error, setError] = useState<string | null>(null);
  const [agentReady, setAgentReady] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const contextIdRef = useRef<string | null>(null);

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
    useCallback(
      async ({ tool_calls }: { tool_calls: ClientSideToolCall[] }) => {
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
      },
      [store],
    ),
  );

  useAgentRoomEvent('speech_detected', useCallback((p: { text: string }) => setTranscript(p.text), []));
  useAgentRoomEvent('ai_sentence', useCallback((p: { sentence: string }) => setAgentText(p.sentence), []));

  useAgentRoomEvent('calibration_status', useCallback((p: { status: string }) => {
    setCalibrating(p.status === 'started');
  }, []));

  useAgentRoomEvent('agent_status', useCallback((p: { status: string }) => {
    if (p.status === 'ready') {
      setAgentReady(true);
      setCalibrating(false);
    } else if (p.status === 'calibrating') {
      setCalibrating(true);
    }
  }, []));

  useEffect(() => {
    if (!mediaStream) return;
    return monitorMicStream(mediaStream, setUserVolume);
  }, [mediaStream]);

  useEffect(() => {
    if (!agentMediaStream) return;
    return monitorInboundMediaStream(agentMediaStream, setAgentVolume);
  }, [agentMediaStream]);

  const hasStartedRef = useRef(false);
  const stores = useAjentifyStores();

  useEffect(() => {
    if (isConnected || isConnecting || hasStartedRef.current) return;
    hasStartedRef.current = true;

    (async () => {
      try {
        stores.contexts.getState().clearCurrentContext();
        const created = await stores.contexts.getState().createContext({
          prompt_args: buildUserContextPromptArgs(),
          conversation_type: conversationType,
          workout_id: workoutId,
        } as any);
        contextIdRef.current = created.context_id;

        const token = await stores.contexts.getState().generateAccessToken();
        await store.getState().initialize(created.context_id, token);
      } catch (err) {
        console.error('[VoiceSession] setup failed', err);
        setError(err instanceof Error ? err.message : 'Connection failed');
        hasStartedRef.current = false;
      }
    })();
  }, [isConnected, isConnecting, store, stores, conversationType, workoutId]);

  function handleDisconnect() {
    store.getState().disconnect();
    if (contextIdRef.current) {
      triggerSummarize(contextIdRef.current, conversationType);
    }
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
  const isWarmingUp = isConnected && !agentReady;

  if (layout === 'compact') {
    return (
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-3 rounded-full bg-background border shadow-xl px-4 py-3 transition-all animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div
          className={cn(
            'relative flex size-10 items-center justify-center rounded-full transition-all duration-500 shrink-0',
            isWarmingUp ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-primary/10',
          )}
          style={{ transform: `scale(${agentScale})` }}
        >
          {isConnecting ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : isWarmingUp ? (
            <div className="size-5 rounded-full bg-amber-400/60 animate-pulse" />
          ) : (
            <div className="size-5 rounded-full bg-primary/30" />
          )}
        </div>
        {isWarmingUp ? (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex-1 truncate">
            {calibrating ? 'Calibrating...' : 'Warming up...'}
          </p>
        ) : agentText ? (
          <p className="text-xs flex-1 truncate text-muted-foreground italic">{agentText}</p>
        ) : (
          <span className="flex-1 sm:hidden" />
        )}
        <div className="flex items-center gap-1.5 sm:gap-1.5">
          <Button variant="ghost" size="icon" onClick={onSwitchToText} className="size-10 sm:size-8 rounded-full" title="Switch to text">
            <MessageSquare className="size-4 sm:size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleToggleLayout} className="size-10 sm:size-8 rounded-full">
            <Maximize2 className="size-4 sm:size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleMute}
            disabled={!isConnected}
            className={cn(
              'size-10 sm:size-8 rounded-full transition-transform duration-150',
              audioMuted && 'bg-destructive/10 text-destructive',
            )}
            style={{ transform: !audioMuted ? `scale(${micScale})` : undefined }}
          >
            {audioMuted ? <MicOff className="size-4 sm:size-3.5" /> : <Mic className="size-4 sm:size-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDisconnect}
            className="size-10 sm:size-8 rounded-full text-destructive hover:bg-destructive/10"
          >
            <PhoneOff className="size-4 sm:size-3.5" />
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
              {error
                ? 'Connection Error'
                : isConnecting
                  ? 'Connecting...'
                  : isWarmingUp
                    ? (calibrating ? 'Calibrating...' : 'Warming up...')
                    : isConnected
                      ? 'AI Trainer'
                      : 'Starting...'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {error
                ?? (isWarmingUp
                  ? 'Hold on, getting ready...'
                  : isConnected
                    ? "I'm listening"
                    : 'Setting up voice connection')}
            </p>
          </div>
          <div
            className={cn(
              'relative flex size-24 items-center justify-center rounded-full transition-all duration-500',
              isWarmingUp ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-primary/10',
            )}
            style={{ transform: `scale(${agentScale})` }}
          >
            <div className={cn(
              'absolute inset-0 rounded-full animate-pulse transition-colors duration-500',
              isWarmingUp ? 'bg-amber-200/30 dark:bg-amber-700/20' : 'bg-primary/5',
            )} />
            {isConnecting ? (
              <Loader2 className="size-8 animate-spin text-primary" />
            ) : isWarmingUp ? (
              <div className="size-10 rounded-full bg-amber-400/40 animate-pulse" />
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
            <p className="text-xs text-center max-w-[280px] text-muted-foreground">You: {transcript}</p>
          )}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onSwitchToText} className="size-12 rounded-full" title="Switch to text">
              <MessageSquare className="size-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleToggleLayout} className="size-12 rounded-full" title="Minimize">
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
            <Button variant="destructive" size="icon" onClick={handleDisconnect} className="size-12 rounded-full">
              <PhoneOff className="size-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TextSession({
  conversationType,
  workoutId,
  onSwitchToVoice,
  onClose,
}: {
  conversationType: ConversationType;
  workoutId?: string;
  onSwitchToVoice: () => void;
  onClose: () => void;
}) {
  const stores = useAjentifyStores();
  const hasInitRef = useRef(false);
  const contextIdRef = useRef<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (hasInitRef.current) return;
    hasInitRef.current = true;

    stores.contexts.getState().clearCurrentContext();
    stores.currentContext
      .getState()
      .startNewContext({
        prompt_args: buildUserContextPromptArgs(),
        conversation_type: conversationType,
        workout_id: workoutId,
      } as any)
      .then(() => {
        contextIdRef.current = stores.contexts.getState().contextId ?? null;
      })
      .catch(console.error);
  }, [stores, conversationType, workoutId]);

  function handleClose() {
    const ctxId = stores.contexts.getState().contextId ?? contextIdRef.current;
    if (ctxId) {
      triggerSummarize(ctxId, conversationType);
    }
    onClose();
  }

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-3 rounded-full bg-background border shadow-xl px-4 py-3 sm:px-4 sm:py-3 transition-all animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
          <MessageSquare className="size-5 text-primary" />
        </div>
        <span className="text-sm font-medium flex-1 truncate">AI Trainer</span>
        <div className="flex items-center gap-1.5 sm:gap-1.5">
          <Button variant="ghost" size="icon" onClick={onSwitchToVoice} className="size-10 sm:size-8 rounded-full" title="Switch to voice">
            <Mic className="size-4 sm:size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMinimized(false)} className="size-10 sm:size-8 rounded-full" title="Expand">
            <Maximize2 className="size-4 sm:size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose} className="size-10 sm:size-8 rounded-full text-destructive hover:bg-destructive/10" title="Close">
            <X className="size-4 sm:size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg p-0 gap-0 h-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h3 className="text-sm font-semibold">AI Trainer</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onSwitchToVoice} className="size-8" title="Switch to voice">
              <Mic className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMinimized(true)} className="size-8" title="Minimize">
              <Minimize2 className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleClose} className="size-8">
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ChatView showHeader={false} inputPlaceholder="Type a message..." classNames={{ root: 'h-full' }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

type SessionMode = 'closed' | 'text' | 'voice';

interface TrainerSessionProps {
  prominent?: boolean;
  className?: string;
  conversationType?: ConversationType;
  workoutId?: string;
}

function TrainerFAB({ onText, onVoice }: { onText: () => void; onVoice: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col-reverse items-end gap-2">
      <Button
        size="icon"
        className={cn(
          'size-14 rounded-full shadow-lg hover:shadow-xl transition-all',
          expanded && 'bg-muted text-muted-foreground hover:bg-muted',
        )}
        variant={expanded ? 'outline' : 'default'}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <X className="size-6" /> : <Dumbbell className="size-6" />}
      </Button>

      {expanded && (
        <>
          <Button
            size="icon"
            className="size-12 rounded-full shadow-lg transition-all animate-in slide-in-from-bottom-2 fade-in duration-150 bg-background"
            variant="outline"
            onClick={() => { setExpanded(false); onText(); }}
            title="Text chat"
          >
            <MessageSquare className="size-5" />
          </Button>
          <Button
            size="icon"
            className="size-12 rounded-full shadow-lg transition-all animate-in slide-in-from-bottom-4 fade-in duration-200"
            onClick={() => { setExpanded(false); onVoice(); }}
            title="Voice chat"
          >
            <Mic className="size-5" />
          </Button>
        </>
      )}
    </div>
  );
}

export function TrainerSession({ prominent = false, className, conversationType: propType, workoutId: propWorkoutId }: TrainerSessionProps) {
  const [mode, setMode] = useState<SessionMode>('closed');
  const detected = useConversationType();
  const conversationType = propType ?? detected.type;
  const workoutId = propWorkoutId ?? detected.workoutId;

  function handleClose() {
    setMode('closed');
  }

  return (
    <>
      {mode === 'closed' && (
        <>
          {prominent ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className={cn('gap-2 rounded-full px-8 shadow-lg hover:shadow-xl transition-all', className)}
                onClick={() => setMode('voice')}
              >
                <Mic className="size-5" />
                {conversationType === 'post_workout' ? 'Tell your Trainer (voice)' : 'Talk to your AI Trainer'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={cn('gap-2 rounded-full px-8 shadow-lg hover:shadow-xl transition-all', className)}
                onClick={() => setMode('text')}
              >
                <MessageSquare className="size-5" />
                {conversationType === 'post_workout' ? 'Tell your Trainer (text)' : 'Chat with your AI Trainer'}
              </Button>
            </div>
          ) : (
            <TrainerFAB
              onText={() => setMode('text')}
              onVoice={() => setMode('voice')}
            />
          )}
        </>
      )}

      {mode === 'text' && (
        <TextSession
          conversationType={conversationType}
          workoutId={workoutId}
          onSwitchToVoice={() => setMode('voice')}
          onClose={handleClose}
        />
      )}

      {mode === 'voice' && (
        <AjentifyVoiceProvider>
          <VoiceSession
            conversationType={conversationType}
            workoutId={workoutId}
            onSwitchToText={() => setMode('text')}
            onClose={handleClose}
          />
        </AjentifyVoiceProvider>
      )}
    </>
  );
}
