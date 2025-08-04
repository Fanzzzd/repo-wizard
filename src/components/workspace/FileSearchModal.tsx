import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, File, Folder, Check } from 'lucide-react';
import { useFileSearchStore } from '../../store/fileSearchStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { FileTypeIcon } from './FileTypeIcon';

interface SearchResultItemProps {
  result: {
    path: string;
    relativePath: string;
    name: string;
    parentDir: string;
    score: number;
    isDirectory: boolean;
  };
  isSelected: boolean;
  isFileSelected: boolean;
  onSelect: () => void;
  onToggleSelection: () => void;
}

function SearchResultItem({
  result,
  isSelected,
  isFileSelected,
  onSelect,
  onToggleSelection,
}: SearchResultItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  // Scroll into view when selected
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isSelected]);

  const handleClick = () => {
    onSelect(); // Still update selection for keyboard navigation
    onToggleSelection(); // Also toggle file selection
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection();
  };

  return (
    <div
      ref={itemRef}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100'
          : 'hover:bg-gray-50 text-gray-700 dark:hover:bg-gray-700 dark:text-gray-300'
      }`}
      onClick={handleClick}
      title={result.relativePath}
    >
      {/* File icon */}
      <div className="flex-shrink-0">
        <FileTypeIcon filename={result.name} isDirectory={result.isDirectory} />
      </div>

      {/* File info */}
      <div className="flex-grow overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{result.name}</span>
          {result.parentDir && (
            <>
              <span className="text-gray-400 dark:text-gray-500 text-sm">
                in
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-sm truncate">
                {result.parentDir || '/'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Selection indicator */}
      <div
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
          isFileSelected
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'border-gray-300 hover:border-blue-400 dark:border-gray-500 dark:hover:border-blue-500'
        }`}
        onClick={handleToggleClick}
      >
        {isFileSelected && <Check size={12} />}
      </div>
    </div>
  );
}

export function FileSearchModal() {
  const {
    isOpen,
    query,
    results,
    isSearching,
    selectedIndex,
    selectedFiles,
    closeModal,
    setQuery,
    selectNext,
    selectPrevious,
    selectCurrentFile,
    selectAndClose,
    toggleFileSelection,
    setSelectedIndex,
  } = useFileSearchStore();

  const { rootPath } = useWorkspaceStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeModal();
          break;
        case 'ArrowDown':
          e.preventDefault();
          selectNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectPrevious();
          break;
        case 'Enter':
          e.preventDefault();
          if (e.metaKey || e.ctrlKey) {
            // Cmd/Ctrl+Enter: select current file and keep modal open
            selectCurrentFile();
          } else {
            // Enter: select and close
            selectAndClose();
          }
          break;
        case 'Tab':
          e.preventDefault();
          // Tab: add to selection without closing
          selectCurrentFile();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    selectNext,
    selectPrevious,
    selectCurrentFile,
    selectAndClose,
    closeModal,
  ]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleResultSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleResultToggle = (filePath: string) => {
    toggleFileSelection(filePath);
  };

  if (!isOpen || !rootPath) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/20 z-50 flex items-start justify-center pt-20"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
          onClick={e => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <Search
              size={20}
              className="text-gray-400 dark:text-gray-500"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Search files..."
              className="flex-grow text-lg bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500 dark:text-gray-100"
            />
            {isSearching && (
              <div className="flex-shrink-0">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.trim() === '' ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <File
                  size={48}
                  className="mx-auto mb-4 text-gray-300 dark:text-gray-600"
                />
                <p className="text-lg font-medium">Search for files</p>
                <p className="text-sm mt-1">
                  Type to search for files in your project
                </p>
                <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 space-y-1">
                  <div>• ↑↓ to navigate</div>
                  <div>• Enter to select and close</div>
                  <div>• Tab to add to selection</div>
                  <div>• Cmd+Enter to multi-select</div>
                </div>
              </div>
            ) : results.length === 0 && !isSearching ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Folder
                  size={48}
                  className="mx-auto mb-4 text-gray-300 dark:text-gray-600"
                />
                <p className="text-lg font-medium">No files found</p>
                <p className="text-sm mt-1">Try adjusting your search query</p>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => (
                  <SearchResultItem
                    key={result.path}
                    result={result}
                    isSelected={index === selectedIndex}
                    isFileSelected={selectedFiles.has(result.path)}
                    onSelect={() => handleResultSelect(index)}
                    onToggleSelection={() => handleResultToggle(result.path)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedFiles.size > 0 && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}{' '}
                selected
              </span>
              <button
                onClick={closeModal}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}