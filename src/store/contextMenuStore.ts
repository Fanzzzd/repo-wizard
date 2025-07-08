import { create } from "zustand";
import type { LucideIcon } from "lucide-react";

export type ContextMenuItem =
  | {
      isSeparator: true;
    }
  | {
      label: string;
      icon?: LucideIcon;
      onClick: () => void;
      disabled?: boolean;
      isSeparator?: false;
      isDanger?: boolean;
    };

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  open: (x: number, y: number, items: ContextMenuItem[]) => void;
  close: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isOpen: false,
  position: { x: 0, y: 0 },
  items: [],
  open: (x, y, items) => {
    // This prevents the native context menu from appearing.
    // We add it with `once: true` so it cleans itself up.
    const preventNativeMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", preventNativeMenu, { once: true });
    set({ isOpen: true, position: { x, y }, items });
  },
  close: () => set({ isOpen: false, items: [] }),
}));