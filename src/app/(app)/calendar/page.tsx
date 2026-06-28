'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { WorkoutCard, type WorkoutCardData } from '@/components/workout-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react';
import { useDataRefresh } from '@/lib/data-refresh';
import { usePageDataStore } from '@/lib/page-data-store';
import { cn } from '@/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';

interface CalendarWorkout {
  date: string;
  workouts: WorkoutCardData[];
}

export default function CalendarPage() {
  const dataVersion = useDataRefresh((s) => s.version);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workoutDates, setWorkoutDates] = useState<CalendarWorkout[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const monthStr = format(currentMonth, 'yyyy-MM');
    setLoading(true);
    api.get<{ calendar: { entries?: CalendarWorkout[] } }>(`/calendar/${monthStr}`)
      .then((res) => setWorkoutDates(res.calendar?.entries ?? []))
      .catch(() => setWorkoutDates([]))
      .finally(() => setLoading(false));
  }, [currentMonth, dataVersion]);

  useEffect(() => {
    usePageDataStore.getState().setPageData(
      'calendar',
      {
        current_month: format(currentMonth, 'yyyy-MM'),
        selected_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        entries: workoutDates,
      },
      {
        select_date: { description: 'Select a date on the calendar by date string (yyyy-MM-dd)' },
        next_month: { description: 'Navigate to the next month' },
        prev_month: { description: 'Navigate to the previous month' },
      },
    );
  }, [currentMonth, selectedDate, workoutDates]);

  const workoutDateSet = useMemo(() => {
    const set = new Set<string>();
    workoutDates.forEach((wd) => set.add(wd.date));
    return set;
  }, [workoutDates]);

  const selectedWorkouts = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return workoutDates.find((wd) => wd.date === dateStr)?.workouts ?? [];
  }, [selectedDate, workoutDates]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <CardTitle className="text-lg">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-2">{d}</div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map((d) => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const hasWorkout = workoutDateSet.has(dateStr);
                    const isSelected = selectedDate && isSameDay(d, selectedDate);
                    const isCurrentMonth = isSameMonth(d, currentMonth);

                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(d)}
                        className={cn(
                          'relative flex flex-col items-center justify-center py-2 rounded-lg text-sm transition-colors',
                          !isCurrentMonth && 'text-muted-foreground/40',
                          isCurrentMonth && 'hover:bg-muted',
                          isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                          isToday(d) && !isSelected && 'font-bold text-primary',
                        )}
                      >
                        {format(d, 'd')}
                        {hasWorkout && (
                          <div className={cn(
                            'absolute bottom-1 size-1.5 rounded-full',
                            isSelected ? 'bg-primary-foreground' : 'bg-primary',
                          )} />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDate && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" />
            {format(selectedDate, 'EEEE, MMMM d')}
          </h3>
          {selectedWorkouts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {selectedWorkouts.map((workout) => (
                <WorkoutCard key={workout.workout_id} workout={workout} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-8 text-muted-foreground">
                <Dumbbell className="size-8 mb-2 opacity-30" />
                <p>No workouts scheduled</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
