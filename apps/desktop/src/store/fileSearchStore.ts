import { create } from 'zustand';
import type { FileNode, SearchResult } from '../bindings';
import { fileSearchService } from '../services/fileSearchService';
import { useSettingsStore } from './settingsStore';
import { useWorkspaceStore } from './workspaceStore';

// Helper function to collect all file paths within a directory node
function getAllFilesInPath(rootNode: FileNode, targetPath: string): string[] {
  const files: string[] = [];

  function traverse(node: FileNode) {
    if (node.path === targetPath || node.path.startsWith(`${targetPath}/`)) {
      if (!node.isDirectory) {
        files.push(node.path);
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    } else if (node.children && targetPath.startsWith(node.path)) {
      // Continue traversing if target path might be in this subtree
      node.children.forEach(traverse);
    }
  }

  traverse(rootNode);
  return files;
}

interface FileSearchState {
  // Modal state
  isOpen: boolean;

  // Search state
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  selectedIndex: number;
  selectedFiles: Set<string>;

  // Actions
  openModal: () => void;
  closeModal: () => void;
  setQuery: (query: string) => void;
  setResults: (results: SearchResult[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  setSelectedIndex: (index: number) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  toggleFileSelection: (filePath: string) => Promise<void>;
  selectCurrentFile: () => void;
  selectAndClose: () => void;
  reset: () => void;

  // Search functions
  performSearch: (query: string) => void;
}

export const useFileSearchStore = create<FileSearchState>((set, get) => ({
  // Initial state
  isOpen: false,
  query: '',
  results: [],
  isSearching: false,
  selectedIndex: 0,
  selectedFiles: new Set<string>(),

  // Modal actions
  openModal: () => {
    set({
      isOpen: true,
      query: '',
      results: [],
      selectedIndex: 0,
      selectedFiles: new Set<string>(),
    });
  },

  closeModal: () => {
    set({
      isOpen: false,
      query: '',
      results: [],
      selectedIndex: 0,
      selectedFiles: new Set<string>(),
    });
  },

  // Search state actions
  setQuery: (query: string) => {
    set({ query });
    get().performSearch(query);
  },

  setResults: (results: SearchResult[]) => {
    set({
      results,
      selectedIndex: 0, // Reset selection when results change
      isSearching: false,
    });
  },

  setIsSearching: (isSearching: boolean) => {
    set({ isSearching });
  },

  setSelectedIndex: (index: number) => {
    const { results } = get();
    const clampedIndex = Math.max(0, Math.min(index, results.length - 1));
    set({ selectedIndex: clampedIndex });
  },

  selectNext: () => {
    const { selectedIndex, results } = get();
    if (results.length > 0) {
      const nextIndex = (selectedIndex + 1) % results.length;
      set({ selectedIndex: nextIndex });
    }
  },

  selectPrevious: () => {
    const { selectedIndex, results } = get();
    if (results.length > 0) {
      const prevIndex =
        selectedIndex === 0 ? results.length - 1 : selectedIndex - 1;
      set({ selectedIndex: prevIndex });
    }
  },

  toggleFileSelection: async (filePath: string) => {
    const { selectedFiles, results } = get();
    const newSelectedFiles = new Set(selectedFiles);

    // Find the result to check if it's a directory
    const result = results.find((r) => r.path === filePath);
    const isDirectory = result?.isDirectory ?? false;

    if (isDirectory) {
      // Handle directory selection
      try {
        // Get all files within this directory from the workspace store's file tree
        const { fileTree } = useWorkspaceStore.getState();
        if (!fileTree) return;

        const directoryFiles = getAllFilesInPath(fileTree, filePath);
        const isCurrentlySelected = directoryFiles.every((file) =>
          newSelectedFiles.has(file)
        );

        if (isCurrentlySelected) {
          // Deselect all files in directory
          directoryFiles.forEach((file) => {
            newSelectedFiles.delete(file);
          });
        } else {
          // Select all files in directory
          directoryFiles.forEach((file) => {
            newSelectedFiles.add(file);
          });
        }
      } catch (error) {
        console.error('Error handling directory selection:', error);
        return;
      }
    } else {
      // Handle file selection
      if (newSelectedFiles.has(filePath)) {
        newSelectedFiles.delete(filePath);
      } else {
        newSelectedFiles.add(filePath);
      }
    }

    set({ selectedFiles: newSelectedFiles });

    // Sync with workspace selected files
    const { setSelectedFilePaths } = useWorkspaceStore.getState();
    setSelectedFilePaths(Array.from(newSelectedFiles));
  },

  selectCurrentFile: () => {
    const { results, selectedIndex } = get();
    if (results.length > 0 && selectedIndex < results.length) {
      const selectedResult = results[selectedIndex];
      get().toggleFileSelection(selectedResult.path);
    }
  },

  selectAndClose: () => {
    const { results, selectedIndex, selectedFiles } = get();

    // If no files are manually selected, select the current highlighted file
    if (
      selectedFiles.size === 0 &&
      results.length > 0 &&
      selectedIndex < results.length
    ) {
      const selectedResult = results[selectedIndex];
      const { addSelectedFilePath, setActiveFilePath } =
        useWorkspaceStore.getState();
      addSelectedFilePath(selectedResult.path);
      setActiveFilePath(selectedResult.path);
    }

    get().closeModal();
  },

  reset: () => {
    set({
      query: '',
      results: [],
      isSearching: false,
      selectedIndex: 0,
      selectedFiles: new Set<string>(),
    });
  },

  // Search function with debouncing
  performSearch: (query: string) => {
    const { rootPath } = useWorkspaceStore.getState();
    const { respectGitignore, customIgnorePatterns } =
      useSettingsStore.getState();

    if (!rootPath) {
      return;
    }

    set({ isSearching: true });

    const settings = {
      respectGitignore,
      customIgnorePatterns,
    };

    fileSearchService.searchFilesDebounced(
      query,
      rootPath,
      settings,
      (results: SearchResult[]) => {
        // Only update if this is still the current query
        if (get().query === query) {
          get().setResults(results);
        }
      }
    );
  },
}));
