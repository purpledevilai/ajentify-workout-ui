'use client';

import { Input } from '@/components/ui/input';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutTimer } from '@/components/workout-timer';

export interface SetData {
  set_id?: string;
  set_number?: number;
  reps?: number | null;
  weight?: number | null;
  duration?: number | null;
  rest_time?: number | null;
  tempo?: string | null;
  target_reps?: number;
  target_weight?: number;
  actual_reps?: number | null;
  actual_weight?: number | null;
  completed?: boolean;
}

interface SetRowProps {
  set: SetData;
  index: number;
  onChange: (updated: Partial<SetData>) => void;
}

function formatDuration(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${seconds}s`;
}

export function SetRow({ set, index, onChange }: SetRowProps) {
  const targetReps = set.target_reps ?? set.reps;
  const targetWeight = set.target_weight ?? set.weight;
  const hasDuration = set.duration != null && set.duration > 0;
  const hasRestTime = set.rest_time != null && set.rest_time > 0;
  const isDone = set.completed ?? false;
  const setNum = set.set_number ?? index + 1;

  function handleToggleDone() {
    const nowDone = !isDone;
    const updates: Partial<SetData> = { completed: nowDone };
    if (nowDone && set.actual_reps == null && targetReps != null) {
      updates.actual_reps = targetReps;
    }
    if (nowDone && set.actual_weight == null && targetWeight != null) {
      updates.actual_weight = targetWeight;
    }
    onChange(updates);
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl px-4 py-3 transition-colors',
          isDone
            ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
            : 'bg-muted/40 border border-transparent',
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-base">
          {setNum}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {hasDuration
              ? `Hold ${formatDuration(set.duration!)}`
              : targetReps != null
                ? `${targetReps} reps${targetWeight != null ? ` × ${targetWeight} lbs` : ''}`
                : 'AMRAP'}
            {hasRestTime ? ` · ${set.rest_time}s rest` : ''}
          </p>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                inputMode="numeric"
                placeholder={hasDuration ? 'sec' : 'Reps'}
                value={set.actual_reps ?? ''}
                onChange={(e) => onChange({ actual_reps: e.target.value ? Number(e.target.value) : undefined })}
                className="h-11 text-center text-lg font-semibold"
              />
            </div>
            <div className="flex-1">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="lbs"
                value={set.actual_weight ?? ''}
                onChange={(e) => onChange({ actual_weight: e.target.value ? Number(e.target.value) : undefined })}
                className="h-11 text-center text-lg font-semibold"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleDone}
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-full transition-all active:scale-95',
            isDone
              ? 'bg-green-500 text-white shadow-md'
              : 'bg-muted hover:bg-muted-foreground/10 border-2 border-muted-foreground/20',
          )}
        >
          <Check className={cn('size-6', isDone ? 'opacity-100' : 'opacity-30')} strokeWidth={3} />
        </button>
      </div>

      {hasDuration && !isDone && (
        <WorkoutTimer seconds={set.duration!} label="Hold" />
      )}

      {isDone && hasRestTime && (
        <WorkoutTimer seconds={set.rest_time!} label="Rest" />
      )}
    </div>
  );
}
