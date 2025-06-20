import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FileNode } from "../types";

interface WorkspaceState {
  rootPath: string | null;
  fileTree: FileNode | null;
  activeFilePath: string | null;
  selectedFilePaths: string[];
  refreshCounter: number;
  setRootPath: (path: string | null) => void;
  setFileTree: (fileTree: FileNode | null) => void;
  setActiveFilePath: (path: string | null) => void;
  setSelectedFilePaths: (paths: string[]) => void;
  addSelectedFilePath: (path: string) => void;
  removeSelectedFilePath: (path: string) => void;
  triggerFileTreeRefresh: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      rootPath: null,
      fileTree: null,
      activeFilePath: null,
      selectedFilePaths: [],
      refreshCounter: 0,
      setRootPath: (path) =>
        set({
          rootPath: path,
          fileTree: null,
          activeFilePath: null,
          selectedFilePaths: [],
        }),
      setFileTree: (fileTree) => set({ fileTree }),
      setActiveFilePath: (path) => set({ activeFilePath: path }),
      setSelectedFilePaths: (paths) => set({ selectedFilePaths: paths }),
      addSelectedFilePath: (path) =>
        set((state) => ({
          selectedFilePaths: [...state.selectedFilePaths, path],
        })),
      removeSelectedFilePath: (path) =>
        set((state) => ({
          selectedFilePaths: state.selectedFilePaths.filter((p) => p !== path),
        })),
      triggerFileTreeRefresh: () =>
        set((state) => ({ refreshCounter: state.refreshCounter + 1 })),
    }),
    {
      name: "repo-wizard-workspace",
      partialize: (state) => ({
        rootPath: state.rootPath,
        activeFilePath: state.activeFilePath,
        selectedFilePaths: state.selectedFilePaths,
      }),
    }
  )
);