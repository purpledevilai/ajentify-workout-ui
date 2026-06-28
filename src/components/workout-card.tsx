'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExerciseBlockData {
  structure_type?: string;
  exercises: Array<{
    name: string;
    equipment?: string | null;
    sets: Array<Record<string, unknown>>;
  }>;
}

export interface WorkoutCardData {
  workout_id: string;
  name: string;
  date: string;
  exercise_blocks?: ExerciseBlockData[];
  /** @deprecated use exercise_blocks */
  exercises?: Array<{ name: string; sets: number; equipment?: string }>;
  status?: 'planned' | 'pending' | 'in_progress' | 'completed';
}

function flattenExercises(workout: WorkoutCardData) {
  if (workout.exercise_blocks?.length) {
    return workout.exercise_blocks.flatMap((block) =>
      block.exercises.map((ex) => ({
        name: ex.name,
        sets: Array.isArray(ex.sets) ? ex.sets.length : 0,
        equipment: ex.equipment ?? undefined,
      })),
    );
  }
  return workout.exercises ?? [];
}

const statusColors: Record<string, string> = {
  planned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export function WorkoutCard({ workout }: { workout: WorkoutCardData }) {
  const status = workout.status ?? 'planned';
  const exercises = flattenExercises(workout);

  return (
    <Link href={`/workout/${workout.workout_id}`}>
      <Card className="group transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Dumbbell className="size-4 text-primary" />
              {workout.name}
            </CardTitle>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={cn('text-xs', statusColors[status])}>
              {status.replace('_', ' ')}
            </Badge>
            <span className="text-xs text-muted-foreground">{exercises.length} exercises</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {exercises.slice(0, 3).map((ex, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{ex.name}</span>
                <span className="text-xs text-muted-foreground/70">
                  {ex.sets} sets{ex.equipment ? ` · ${ex.equipment}` : ''}
                </span>
              </div>
            ))}
            {exercises.length > 3 && (
              <p className="text-xs text-muted-foreground/60">
                +{exercises.length - 3} more
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
