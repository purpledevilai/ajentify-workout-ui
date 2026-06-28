import { defineClientSideTools } from '@ajentify/chat';
import { api } from './api';
import { useDataRefresh } from './data-refresh';

type WorkoutTools = {
  get_user_profile: {
    args: Record<string, never>;
    result: unknown;
  };
  save_user_profile: {
    args: Record<string, unknown>;
    result: unknown;
  };
  create_workout: {
    args: Record<string, unknown>;
    result: unknown;
  };
  get_workouts: {
    args: { date?: string };
    result: unknown;
  };
  update_workout: {
    args: { workout_id: string; [key: string]: unknown };
    result: unknown;
  };
  add_calendar_entries: {
    args: { month: string; entries: unknown[] };
    result: unknown;
  };
  navigate: {
    args: { path: string };
    result: { navigated: boolean };
  };
  submit_feedback: {
    args: { message: string; source?: string };
    result: unknown;
  };
};

export function createWorkoutTools(routerPush: (path: string) => void) {
  const bump = () => useDataRefresh.getState().bump();

  return defineClientSideTools<WorkoutTools>({
    get_user_profile: async () => {
      return api.get('/profile');
    },
    save_user_profile: async (args) => {
      const result = await api.put('/profile', args);
      bump();
      return result;
    },
    create_workout: async (args) => {
      const result = await api.post('/workouts', args);
      bump();
      return result;
    },
    get_workouts: async (args) => {
      const params = args.date ? `?date=${args.date}` : '';
      return api.get(`/workouts${params}`);
    },
    update_workout: async (args) => {
      const { workout_id, ...body } = args;
      const result = await api.put(`/workouts/${workout_id}`, body);
      bump();
      return result;
    },
    add_calendar_entries: async (args) => {
      const result = await api.put(`/calendar/${args.month}`, { entries: args.entries });
      bump();
      return result;
    },
    navigate: async (args) => {
      routerPush(args.path);
      return { navigated: true };
    },
    submit_feedback: async (args) => {
      return api.post('/feedback', {
        message: args.message,
        source: args.source ?? 'user',
        app_version: '1.0.0',
        page: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });
    },
  });
}
