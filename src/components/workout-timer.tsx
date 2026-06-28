'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkoutTimerProps {
  seconds: number;
  label: string;
  onComplete?: () => void;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins > 0) {
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }
  return `${secs}`;
}

export function WorkoutTimer({ seconds, label, onComplete }: WorkoutTimerProps) {
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  function start() {
    setRemaining(seconds);
    setState('running');

    clearTimer();
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const left = Math.max(0, seconds - elapsed);
      setRemaining(left);

      if (left <= 0) {
        clearTimer();
        setState('done');
        try { navigator.vibrate?.([200, 100, 200, 100, 200]); } catch {}
        onComplete?.();
      }
    }, 250);
  }

  function stop() {
    clearTimer();
    setState('idle');
    setRemaining(seconds);
  }

  function reset() {
    setState('idle');
    setRemaining(seconds);
  }

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={start}
        className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-primary font-semibold text-sm active:scale-95 transition-all w-full justify-center"
      >
        <Timer className="size-4" />
        {label} ({formatTime(seconds)})
      </button>
    );
  }

  const pct = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 100;

  if (state === 'done') {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-950/30 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">Done!</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 active:scale-95 transition-all"
          >
            <RotateCcw className="size-5 text-green-600 dark:text-green-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-primary bg-primary/5 px-4 py-4">
      <div
        className="absolute inset-0 bg-primary/10 transition-all duration-300 ease-linear"
        style={{ width: `${pct}%` }}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold tabular-nums">{formatTime(remaining)}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <button
          type="button"
          onClick={stop}
          className="flex size-10 items-center justify-center rounded-full bg-destructive/10 active:scale-95 transition-all"
        >
          <X className="size-5 text-destructive" />
        </button>
      </div>
    </div>
  );
}
