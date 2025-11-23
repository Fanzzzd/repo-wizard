import { create } from 'zustand';

interface TooltipState {
  content: React.ReactNode | null;
  position: { x: number; y: number };
  isVisible: boolean;
  showTooltip: (
    content: React.ReactNode,
    position: { x: number; y: number }
  ) => void;
  hideTooltip: () => void;
  updatePosition: (position: { x: number; y: number }) => void;
}

export const useTooltipStore = create<TooltipState>((set) => ({
  content: null,
  position: { x: 0, y: 0 },
  isVisible: false,
  showTooltip: (content, position) =>
    set({ isVisible: true, content, position }),
  hideTooltip: () => set({ isVisible: false }),
  updatePosition: (position) => set({ position }),
}));
