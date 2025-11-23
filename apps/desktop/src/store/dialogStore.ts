import { create } from 'zustand';

interface DialogOptions {
  title: string;
  content: React.ReactNode;
  type?: 'alert' | 'confirm';
  status?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

interface DialogState {
  isOpen: boolean;
  options: DialogOptions | null;
  onResolve: ((confirmed: boolean) => void) | null;
  open: (opts: DialogOptions) => Promise<boolean>;
  close: (confirmed: boolean) => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  isOpen: false,
  options: null,
  onResolve: null,
  open: (opts) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options: { type: 'alert', status: 'info', ...opts },
        onResolve: resolve,
      });
    });
  },
  close: (confirmed: boolean) => {
    set((state) => {
      state.onResolve?.(confirmed);
      return { isOpen: false, onResolve: null, options: null };
    });
  },
}));
