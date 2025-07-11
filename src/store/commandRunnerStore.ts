import { create } from "zustand";
import { killPty } from "../services/tauriApi";

const COMMAND_RUNNER_CANCELLED = "COMMAND_RUNNER_CANCELLED";

interface CommandRunnerState {
  isVisible: boolean;
  initialCommand: string | null;
  isFinished: boolean;
  _resolve: ((output: string) => void) | null;
  _reject: ((reason?: any) => void) | null;
  setFinished: () => void;
  _setState: (partial: Partial<CommandRunnerState>) => void;
}

const useCommandRunnerStore = create<CommandRunnerState>((set) => ({
  isVisible: false,
  initialCommand: null,
  isFinished: false,
  _resolve: null,
  _reject: null,
  setFinished: () => set({ isFinished: true }),
  _setState: (partial) => set(partial),
}));

export const openCommandRunner = (
  initialCommand: string | null
): Promise<string> => {
  return new Promise((resolve, reject) => {
    useCommandRunnerStore.getState()._setState({
      isVisible: true,
      initialCommand,
      isFinished: false,
      _resolve: resolve,
      _reject: reject,
    });
  });
};

export const closeCommandRunner = async () => {
  await killPty();
  const { _reject } = useCommandRunnerStore.getState();
  _reject?.(COMMAND_RUNNER_CANCELLED);
  useCommandRunnerStore.getState()._setState({
    isVisible: false,
    initialCommand: null,
    isFinished: false,
    _resolve: null,
    _reject: null,
  });
};

export const captureCommandRunnerOutput = (output: string) => {
  const { _resolve } = useCommandRunnerStore.getState();
  _resolve?.(output);
  closeCommandRunner();
};

export const isCommandRunnerCancelled = (error: unknown): boolean => {
  return error === COMMAND_RUNNER_CANCELLED;
};

// Export the hook for component usage
export { useCommandRunnerStore };