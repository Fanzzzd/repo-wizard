import { create } from 'zustand';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { fetch as httpFetch } from '@tauri-apps/plugin-http';

type UpdateStatus =
  | 'idle'
  | 'pending'
  | 'up-to-date'
  | 'downloading'
  | 'ready'
  | 'error';

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
    const { status } = get();
    if (status === 'pending' || status === 'downloading') {
      console.log('Update check already in progress.');
      return;
    }

    set({ status: 'pending', error: null });

    // In dev/pre-release, simulate the check by fetching the public manifest.
    // This allows developers to see available updates without performing a real installation.
    if (__APP_VERSION__.includes('-')) {
      console.log('DEV MODE: Simulating update check.');
      try {
        const response = await httpFetch(
          'https://github.com/Fanzzzd/repo-wizard/releases/latest/download/latest.json'
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch update manifest: ${response.status}`
          );
        }
        const manifest = await response.json();

        // This is a simulated object, not a real `Update` instance.
        // It has the properties needed by the UI dialog.
        const simulatedUpdateInfo = {
          version: manifest.version,
          body: manifest.notes,
          date: manifest.pub_date,
        };
        // We set status to ready to trigger the info dialog, but not for installation.
        set({ status: 'ready', updateInfo: simulatedUpdateInfo as any });
      } catch (e: any) {
        console.error('DEV MODE: Update simulation failed:', e);
        set({ status: 'error', error: e.toString() });
      }
      return;
    }

    // In production, use the real updater
    try {
      const update = await check();
      if (update) {
        set({ status: 'downloading', updateInfo: update });
        await update.downloadAndInstall();
        set({ status: 'ready' });
      } else {
        set({ status: 'up-to-date' });
        setTimeout(() => {
          set(s => (s.status === 'up-to-date' ? { status: 'idle' } : s));
        }, 3000);
      }
    } catch (e: any) {
      console.error('Update check/download failed:', e);
      set({ status: 'error', error: e.toString() });
    }
  },

  install: async () => {
    // In dev mode, installation is disabled. The dialog is informational only.
    if (__APP_VERSION__.includes('-')) {
      console.warn('DEV MODE: Installation is disabled.');
      return;
    }

    if (get().status === 'ready') {
      await relaunch();
    }
  },
}));
