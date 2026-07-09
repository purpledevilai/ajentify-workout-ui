import { defineClientSideTools } from '@ajentify/chat';
import { api } from './api';
import { useDataRefresh } from './data-refresh';
import { usePageDataStore } from './page-data-store';
import { usePageActionStore } from './page-action-store';
import { localDateString } from './local-date';

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
    args: { date?: string; start_date?: string; end_date?: string };
    result: unknown;
  };
  update_workout: {
    args: { workout_id: string; [key: string]: unknown };
    result: unknown;
  };
  patch_workout: {
    args: { workout_id: string; [key: string]: unknown };
    result: unknown;
  };
  delete_workout: {
    args: { workout_id: string };
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
  get_page_data: {
    args: Record<string, never>;
    result: unknown;
  };
  do_page_action: {
    args: { action?: string; key?: string; args?: Record<string, unknown>; [key: string]: unknown };
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
      const params = new URLSearchParams();
      if (args.date) {
        params.set('date', args.date);
      } else {
        const now = new Date();
        const startDate = args.start_date ?? localDateString(new Date(now.getTime() - 7 * 86400000));
        const endDate = args.end_date ?? localDateString(now);
        params.set('start_date', startDate);
        params.set('end_date', endDate);
      }
      return api.get(`/workouts?${params.toString()}`);
    },
    update_workout: async (args) => {
      const { workout_id, ...body } = args;
      const result = await api.put(`/workouts/${workout_id}`, body);
      bump();
      return result;
    },
    patch_workout: async (args) => {
      const { workout_id, ...body } = args;
      const result = await api.patch(`/workouts/${workout_id}`, body);
      bump();
      return result;
    },
    delete_workout: async (args) => {
      await api.delete(`/workouts/${args.workout_id}`);
      bump();
      return { success: true, deleted: args.workout_id };
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
    get_page_data: async () => {
      const { pageName, pageData, actions } = usePageDataStore.getState();
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      return { data: { page: pageName, path, ...pageData }, actions };
    },
    do_page_action: async (args) => {
      const key = args.action ?? args.key;
      const actionArgs = (args.args ?? args) as Record<string, unknown>;

      if (key === 'refresh_data') {
        bump();
        return { ok: true };
      }

      if (key === 'set_voice_layout') {
        return { ok: true, note: 'voice layout not applicable in text mode' };
      }

      if (typeof key === 'string') {
        const result = await usePageActionStore.getState().execute(key, actionArgs);
        return result;
      }

      return { error: 'No action specified' };
    },
  });
}
