import { create } from 'zustand';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

type UpdateStatus = 'idle' | 'pending' | 'downloading' | 'ready' | 'error';

interface UpdateState {
  status: UpdateStatus;
  updateInfo: Update | null;
  error: string | null;
  check: () => Promise<void>;
  install: () => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: 'idle',
  updateInfo: null,
  error: null,

  check: async () => {
    // Skip check for pre-release versions or if an update process is already running
    if (__APP_VERSION__.includes('-') || get().status !== 'idle') {
      console.log('Skipping update check.');
      return;
    }

    set({ status: 'pending', error: null });

    try {
      const update = await check();
      if (update) {
        set({ status: 'downloading', updateInfo: update });
        await update.downloadAndInstall();
        set({ status: 'ready' });
      } else {
        set({ status: 'idle' });
      }
    } catch (e: any) {
      console.error('Update check/download failed:', e);
      set({ status: 'error', error: e.toString() });
    }
  },

  install: async () => {
    if (get().status === 'ready') {
      await relaunch();
    }
  },
}));