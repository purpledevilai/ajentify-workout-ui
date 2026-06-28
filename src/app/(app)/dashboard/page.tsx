'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { WorkoutCard, type WorkoutCardData } from '@/components/workout-card';
import { TrainerSession } from '@/components/trainer-session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataRefresh } from '@/lib/data-refresh';
import { usePageDataStore } from '@/lib/page-data-store';
import { Dumbbell, Sparkles, TrendingUp, Target } from 'lucide-react';
import { localDateString } from '@/lib/local-date';

interface DashboardData {
  has_plan: boolean;
  todays_workouts: WorkoutCardData[];
  stats?: {
    workouts_this_week: number;
    streak_days: number;
    total_workouts: number;
  };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const dataVersion = useDataRefresh((s) => s.version);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = localDateString();
    Promise.all([
      api.get<{ workouts: WorkoutCardData[] }>(`/workouts?date=${today}`).catch(() => ({ workouts: [] })),
      api.get<{ workouts: WorkoutCardData[] }>('/workouts').catch(() => ({ workouts: [] })),
    ])
      .then(([todayRes, allRes]) => {
        const todaysWorkouts = todayRes.workouts ?? [];
        const allWorkouts = allRes.workouts ?? [];
        setData({
          has_plan: allWorkouts.length > 0,
          todays_workouts: todaysWorkouts,
          stats: allWorkouts.length > 0
            ? {
                total_workouts: allWorkouts.filter((w: WorkoutCardData) => w.status === 'completed').length,
                workouts_this_week: 0,
                streak_days: 0,
              }
            : undefined,
        });
      })
      .catch(() => setData({ has_plan: false, todays_workouts: [], stats: undefined }))
      .finally(() => setLoading(false));
  }, [dataVersion]);

  useEffect(() => {
    if (!data) return;
    usePageDataStore.getState().setPageData(
      'dashboard',
      {
        has_plan: data.has_plan,
        todays_workouts: data.todays_workouts,
        stats: data.stats,
      },
      {
        show_workout: { description: 'Navigate to view a specific workout by workout_id' },
        refresh_data: { description: 'Reload dashboard data to reflect recent changes' },
      },
    );
  }, [data]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  const hasPlan = data?.has_plan && data.todays_workouts.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Hey {user?.first_name ?? 'there'} 👋
        </h2>
        <p className="text-muted-foreground">
          {hasPlan ? "Here's your training for today." : "Let's get you started with a workout plan."}
        </p>
      </div>

      {!hasPlan ? (
        <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="flex flex-col items-center gap-6 py-12">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="size-8 text-primary" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <CardTitle className="text-xl">Talk to your AI Trainer</CardTitle>
              <CardDescription className="text-base">
                Start a voice conversation to tell your trainer about your goals, experience level,
                and available equipment. They&apos;ll create a personalized workout plan just for you.
              </CardDescription>
            </div>
            <TrainerSession prominent />
          </CardContent>
        </Card>
      ) : (
        <>
          {data?.stats && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                  <TrendingUp className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.stats.workouts_this_week}</div>
                  <p className="text-xs text-muted-foreground">workouts completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Streak</CardTitle>
                  <Target className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.stats.streak_days}</div>
                  <p className="text-xs text-muted-foreground">days in a row</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                  <Dumbbell className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.stats.total_workouts}</div>
                  <p className="text-xs text-muted-foreground">workouts logged</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-4">Today&apos;s Workouts</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {data!.todays_workouts.map((workout) => (
                <WorkoutCard key={workout.workout_id} workout={workout} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
