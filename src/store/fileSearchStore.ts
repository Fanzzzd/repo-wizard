import { create } from "zustand";
import { fileSearchService, type SearchResult } from "../services/fileSearchService";
import { useWorkspaceStore } from "./workspaceStore";
import { useSettingsStore } from "./settingsStore";

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
  toggleFileSelection: (filePath: string) => void;
  selectCurrentFile: () => void;
  selectAndClose: () => void;
  reset: () => void;
  
  // Search functions
  performSearch: (query: string) => void;
}

export const useFileSearchStore = create<FileSearchState>((set, get) => ({
  // Initial state
  isOpen: false,
  query: "",
  results: [],
  isSearching: false,
  selectedIndex: 0,
  selectedFiles: new Set<string>(),

  // Modal actions
  openModal: () => {
    set({
      isOpen: true,
      query: "",
      results: [],
      selectedIndex: 0,
      selectedFiles: new Set<string>(),
    });
  },

  closeModal: () => {
    set({
      isOpen: false,
      query: "",
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
      isSearching: false 
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
      const prevIndex = selectedIndex === 0 ? results.length - 1 : selectedIndex - 1;
      set({ selectedIndex: prevIndex });
    }
  },

  toggleFileSelection: (filePath: string) => {
    const { selectedFiles } = get();
    const newSelectedFiles = new Set(selectedFiles);
    
    if (newSelectedFiles.has(filePath)) {
      newSelectedFiles.delete(filePath);
    } else {
      newSelectedFiles.add(filePath);
    }
    
    set({ selectedFiles: newSelectedFiles });
    
    // Add to workspace selected files
    const { addSelectedFilePath, removeSelectedFilePath } = useWorkspaceStore.getState();
    if (newSelectedFiles.has(filePath)) {
      addSelectedFilePath(filePath);
    } else {
      removeSelectedFilePath(filePath);
    }
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
    if (selectedFiles.size === 0 && results.length > 0 && selectedIndex < results.length) {
      const selectedResult = results[selectedIndex];
      const { addSelectedFilePath, setActiveFilePath } = useWorkspaceStore.getState();
      addSelectedFilePath(selectedResult.path);
      setActiveFilePath(selectedResult.path);
    }
    
    get().closeModal();
  },

  reset: () => {
    set({
      query: "",
      results: [],
      isSearching: false,
      selectedIndex: 0,
      selectedFiles: new Set<string>(),
    });
  },

  // Search function with debouncing
  performSearch: (query: string) => {
    const { rootPath } = useWorkspaceStore.getState();
    const { respectGitignore, customIgnorePatterns } = useSettingsStore.getState();
    
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