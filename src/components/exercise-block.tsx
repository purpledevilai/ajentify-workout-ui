'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ExerciseBlockData {
  structure_type: 'straight' | 'superset' | 'circuit' | 'drop_set';
  rounds?: number | null;
  exercises: Array<{
    exercise_id: string;
    name: string;
    equipment?: string;
    sets: Array<{
      set_number: number;
      target_reps?: number;
      target_weight?: number;
      actual_reps?: number;
      actual_weight?: number;
      completed?: boolean;
    }>;
    notes?: string;
  }>;
}

const structureLabels: Record<string, { label: string; color: string }> = {
  straight: { label: 'Straight Sets', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  superset: { label: 'Superset', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  circuit: { label: 'Circuit', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  drop_set: { label: 'Drop Set', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

export function ExerciseBlock({ block }: { block: ExerciseBlockData }) {
  const style = structureLabels[block.structure_type] ?? structureLabels.straight;
  const rounds = block.rounds ?? 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={style.color}>
            {style.label}
          </Badge>
          {block.structure_type === 'circuit' && rounds > 1 && (
            <Badge variant="outline" className="text-xs">
              {rounds} rounds
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {block.exercises.map((exercise) => (
          <div key={exercise.exercise_id} className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{exercise.name}</CardTitle>
              {exercise.equipment && (
                <span className="text-xs text-muted-foreground">{exercise.equipment}</span>
              )}
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground text-xs">
                    <th className="px-3 py-1.5 text-left font-medium">Set</th>
                    <th className="px-3 py-1.5 text-center font-medium">Target</th>
                    <th className="px-3 py-1.5 text-center font-medium">Actual</th>
                    <th className="px-3 py-1.5 text-center font-medium w-12">Done</th>
                  </tr>
                </thead>
                <tbody>
                  {exercise.sets.map((set) => (
                    <tr key={set.set_number} className="border-t border-border/50">
                      <td className="px-3 py-2 font-medium">{set.set_number}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {set.target_reps && `${set.target_reps} reps`}
                        {set.target_weight != null && ` @ ${set.target_weight} lbs`}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {set.actual_reps != null ? `${set.actual_reps} reps` : '—'}
                        {set.actual_weight != null && ` @ ${set.actual_weight} lbs`}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {set.completed ? '✓' : '○'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
