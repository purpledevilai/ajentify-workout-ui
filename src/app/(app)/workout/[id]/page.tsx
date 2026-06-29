'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { SetRow, type SetData } from '@/components/set-row';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle, Loader2, Dumbbell, ChevronDown, ChevronUp, Trophy, MessageSquare, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataRefresh } from '@/lib/data-refresh';
import { usePageDataStore } from '@/lib/page-data-store';
import { TrainerSession } from '@/components/trainer-session';

interface ExerciseData {
  exercise_id?: string;
  name: string;
  equipment?: string | null;
  notes?: string;
  sets: SetData[];
}

interface ExerciseBlockData {
  block_id?: string;
  structure_type: 'straight' | 'superset' | 'circuit' | 'drop_set';
  rounds?: number | null;
  exercises: ExerciseData[];
}

interface WorkoutDetail {
  workout_id: string;
  name: string;
  date: string;
  status: 'planned' | 'pending' | 'in_progress' | 'completed';
  exercise_blocks: ExerciseBlockData[];
}

const structureLabels: Record<string, string> = {
  straight: 'Straight Sets',
  superset: 'Superset',
  circuit: 'Circuit',
  drop_set: 'Drop Set',
};

export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataVersion = useDataRefresh((s) => s.version);
  const setPageData = usePageDataStore((s) => s.setPageData);

  useEffect(() => {
    api.get<{ workout: WorkoutDetail }>(`/workouts/${id}`)
      .then((res) => setWorkout(res.workout))
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, router, dataVersion]);

  useEffect(() => {
    if (!workout) return;
    const exercises = workout.exercise_blocks.flatMap((b) =>
      b.exercises.map((ex) => ({
        name: ex.name,
        equipment: ex.equipment,
        sets: ex.sets.length,
      })),
    );
    setPageData(
      'workout',
      {
        workout_id: workout.workout_id,
        name: workout.name,
        date: workout.date,
        status: workout.status,
        exercises,
        total_blocks: workout.exercise_blocks.length,
      },
      {
        refresh_data: { description: 'Reload workout data' },
      },
    );
  }, [workout, setPageData]);

  const debouncedSave = useCallback(
    (updated: WorkoutDetail) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        api.put(`/workouts/${updated.workout_id}`, { exercise_blocks: updated.exercise_blocks }).catch(console.error);
      }, 1500);
    },
    [],
  );

  function handleSetChange(blockIdx: number, exerciseIdx: number, setIdx: number, changes: Partial<SetData>) {
    if (!workout) return;
    const next = structuredClone(workout);
    const set = next.exercise_blocks[blockIdx].exercises[exerciseIdx].sets[setIdx];
    Object.assign(set, changes);
    setWorkout(next);
    debouncedSave(next);
  }

  function handleNotesChange(blockIdx: number, exerciseIdx: number, notes: string) {
    if (!workout) return;
    const next = structuredClone(workout);
    next.exercise_blocks[blockIdx].exercises[exerciseIdx].notes = notes;
    setWorkout(next);
    debouncedSave(next);
  }

  function toggleNotes(key: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleComplete() {
    if (!workout) return;
    setCompleting(true);
    try {
      await api.put(`/workouts/${workout.workout_id}`, { status: 'completed', exercise_blocks: workout.exercise_blocks });
      setWorkout({ ...workout, status: 'completed' });
    } catch {
      // silently fail
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!workout) return null;

  const totalSets = workout.exercise_blocks.reduce(
    (sum, b) => sum + b.exercises.reduce((s, e) => s + e.sets.length, 0),
    0,
  );
  const completedSets = workout.exercise_blocks.reduce(
    (sum, b) => sum + b.exercises.reduce((s, e) => s + e.sets.filter((st) => st.completed).length, 0),
    0,
  );
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const allCompleted = completedSets === totalSets && totalSets > 0;

  let exerciseCounter = 0;

  function isCircuitWithRounds(block: ExerciseBlockData): boolean {
    const rounds = block.rounds ?? 1;
    return block.structure_type === 'circuit' && rounds > 1;
  }

  function getCircuitRoundCount(block: ExerciseBlockData): number {
    return block.rounds ?? 1;
  }

  function getCurrentRound(block: ExerciseBlockData): number {
    const totalRounds = getCircuitRoundCount(block);
    for (let r = 0; r < totalRounds; r++) {
      const roundComplete = block.exercises.every((ex) => {
        const set = ex.sets[r];
        return set?.completed;
      });
      if (!roundComplete) return r;
    }
    return totalRounds - 1;
  }

  function renderExercise(
    exercise: ExerciseData,
    blockIdx: number,
    exerciseIdx: number,
    exerciseNum: number,
    setIndices?: number[],
  ) {
    const notesKey = `${blockIdx}-${exerciseIdx}`;
    const notesOpen = expandedNotes.has(notesKey);
    const setsToRender = setIndices ?? exercise.sets.map((_, i) => i);
    const exerciseCompleted = setsToRender.every((i) => exercise.sets[i]?.completed);

    return (
      <div key={`${exercise.exercise_id ?? notesKey}-${setIndices?.[0] ?? 'all'}`} className="space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl font-bold text-lg transition-colors',
              exerciseCompleted
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                : 'bg-primary/10 text-primary',
            )}
          >
            {exerciseCompleted ? <CheckCircle className="size-5" /> : exerciseNum}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight">{exercise.name}</h2>
            {exercise.equipment && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {exercise.equipment}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {setsToRender.map((setIdx) => {
            const set = exercise.sets[setIdx];
            if (!set) return null;
            return (
              <SetRow
                key={set.set_id ?? setIdx}
                set={set}
                index={setIdx}
                onChange={(changes) => handleSetChange(blockIdx, exerciseIdx, setIdx, changes)}
              />
            );
          })}
        </div>

        {!setIndices && (
          <>
            <button
              type="button"
              onClick={() => toggleNotes(notesKey)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {notesOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {exercise.notes ? 'View notes' : 'Add notes'}
            </button>

            {notesOpen && (
              <Textarea
                placeholder="Notes for this exercise..."
                value={exercise.notes ?? ''}
                onChange={(e) => handleNotesChange(blockIdx, exerciseIdx, e.target.value)}
                className="resize-none text-base"
                rows={3}
              />
            )}
          </>
        )}
      </div>
    );
  }

  function renderCircuitBlock(block: ExerciseBlockData, blockIdx: number) {
    const totalRounds = getCircuitRoundCount(block);
    const currentRound = getCurrentRound(block);
    const allRoundsComplete = block.exercises.every((ex) =>
      ex.sets.slice(0, totalRounds).every((s) => s.completed),
    );

    return (
      <div key={block.block_id ?? blockIdx} className="space-y-4">
        {/* Circuit header */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 px-2 flex items-center gap-1.5">
            <RotateCcw className="size-3.5" />
            Circuit &middot; {totalRounds} Rounds
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Round pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 px-1">
          {Array.from({ length: totalRounds }, (_, r) => {
            const roundComplete = block.exercises.every((ex) => ex.sets[r]?.completed);
            const isCurrent = r === currentRound && !allRoundsComplete;

            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`circuit-${blockIdx}-round-${r}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all shrink-0',
                  roundComplete
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                    : isCurrent
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 ring-2 ring-orange-400/50'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {roundComplete && <CheckCircle className="size-4" />}
                Round {r + 1}
              </button>
            );
          })}
        </div>

        {/* Round sections */}
        {Array.from({ length: totalRounds }, (_, r) => {
          const roundComplete = block.exercises.every((ex) => ex.sets[r]?.completed);
          const isCurrent = r === currentRound && !allRoundsComplete;

          return (
            <div
              key={r}
              id={`circuit-${blockIdx}-round-${r}`}
              className={cn(
                'rounded-2xl border-2 p-4 space-y-4 transition-colors scroll-mt-32',
                roundComplete
                  ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20'
                  : isCurrent
                    ? 'border-orange-300 bg-orange-50/30 dark:border-orange-700 dark:bg-orange-950/10'
                    : 'border-border/50 bg-muted/20',
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  'text-sm font-bold',
                  roundComplete
                    ? 'text-green-700 dark:text-green-400'
                    : isCurrent
                      ? 'text-orange-700 dark:text-orange-400'
                      : 'text-muted-foreground',
                )}>
                  Round {r + 1} of {totalRounds}
                </span>
                {roundComplete && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="size-4" />
                    <span className="text-xs font-semibold">Complete</span>
                  </div>
                )}
              </div>

              {block.exercises.map((exercise, exerciseIdx) =>
                renderExercise(exercise, blockIdx, exerciseIdx, exerciseIdx + 1, [r]),
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="size-10 shrink-0">
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{workout.name}</h1>
            <p className="text-xs text-muted-foreground">{workout.date}</p>
          </div>
          {workout.status === 'completed' && (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <Trophy className="size-5" />
              <span className="text-sm font-semibold">Done</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {workout.status !== 'completed' && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>{completedSets} of {totalSets} sets</span>
              <span className="font-semibold text-foreground">{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Exercises */}
      <div className="px-4 py-4 space-y-8">
        {workout.exercise_blocks.map((block, blockIdx) => {
          if (isCircuitWithRounds(block)) {
            return renderCircuitBlock(block, blockIdx);
          }

          const showBlockLabel = block.structure_type !== 'straight' || block.exercises.length > 1;
          return (
            <div key={block.block_id ?? blockIdx} className="space-y-6">
              {showBlockLabel && (
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
                    {structureLabels[block.structure_type] ?? 'Straight Sets'}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              {block.exercises.map((exercise, exerciseIdx) => {
                exerciseCounter++;
                return renderExercise(exercise, blockIdx, exerciseIdx, exerciseCounter);
              })}
            </div>
          );
        })}
      </div>

      {/* Finish button at end of content */}
      {workout.status !== 'completed' && (
        <div className="px-4 pt-4 pb-8">
          <Button
            className="w-full gap-2 h-14 text-lg font-bold rounded-xl"
            size="lg"
            disabled={completing}
            onClick={handleComplete}
          >
            {completing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : allCompleted ? (
              <Trophy className="size-5" />
            ) : (
              <CheckCircle className="size-5" />
            )}
            {allCompleted ? 'Finish Workout!' : `Complete (${progressPct}%)`}
          </Button>
        </div>
      )}

      {/* Debrief prompt for completed workouts */}
      {workout.status === 'completed' && (
        <div className="px-4 pt-4 pb-8">
          <TrainerSession
            prominent
            conversationType="post_workout"
            workoutId={workout.workout_id}
          />
        </div>
      )}
    </div>
  );
}
