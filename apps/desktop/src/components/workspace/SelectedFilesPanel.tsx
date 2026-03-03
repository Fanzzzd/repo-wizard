import { ArrowDown10, ArrowDownAZ, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSelectedFileDetails } from '../../hooks/useSelectedFileDetails';
import { formatTokenCount } from '../../lib/token_estimator';
import { cn } from '../../lib/utils';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ShortenedPath } from '../common/ShortenedPath';

export function SelectedFilesPanel() {
  const {
    selectedFilePaths,
    rootPath,
    removeSelectedFilePath,
    setActiveFilePath,
    refreshCounter,
    setSelectedFilePaths,
    activeFilePath,
  } = useWorkspaceStore();
  const [sortBy, setSortBy] = useState<'name' | 'tokens'>('name');
  const { details: fileDetails, totalTokens } = useSelectedFileDetails({
    selectedFilePaths,
    rootPath,
    refreshCounter,
    onMissingPath: removeSelectedFilePath,
  });

  const sortedFiles = useMemo(() => {
    const filesWithDetails = [...fileDetails];
    if (sortBy === 'tokens') {
      return filesWithDetails.sort((a, b) => {
        if (a.isBinary !== b.isBinary) {
          return a.isBinary ? 1 : -1;
        }
        return b.tokens - a.tokens;
      });
    }
    return filesWithDetails.sort((a, b) =>
      a.shortPath.localeCompare(b.shortPath)
    );
  }, [fileDetails, sortBy]);

  return (
    <div className="p-2 flex flex-col h-full bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
      <div className="flex justify-between items-center mb-2 px-1 flex-shrink-0">
        <h3 className="text-sm font-semibold">
          Selected Files ({selectedFilePaths.length})
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSortBy('name')}
            title="Sort by name"
            className={cn(
              'p-1 rounded-md transition-colors',
              sortBy === 'name'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            <ArrowDownAZ size={16} />
          </button>
          <button
            type="button"
            onClick={() => setSortBy('tokens')}
            title="Sort by token count"
            className={cn(
              'p-1 rounded-md transition-colors',
              sortBy === 'tokens'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            <ArrowDown10 size={16} />
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilePaths([])}
            title="Clear all selected files"
            disabled={selectedFilePaths.length === 0}
            className={cn(
              'p-1 rounded-md transition-colors',
              selectedFilePaths.length === 0
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-md p-1 text-xs flex-grow overflow-y-auto border border-gray-200 dark:border-gray-700 min-h-0">
        {sortedFiles.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {sortedFiles.map(({ path, shortPath, isBinary, tokens }) => {
              return (
                <li
                  key={path}
                  className={cn(
                    'flex items-center p-1.5 rounded group select-none',
                    !isBinary && path === activeFilePath
                      ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => !isBinary && setActiveFilePath(path)}
                    disabled={isBinary}
                    className={cn(
                      'flex-grow flex items-center justify-between min-w-0 bg-transparent border-none p-0 text-inherit text-left',
                      isBinary ? 'cursor-not-allowed' : 'cursor-pointer'
                    )}
                  >
                    <ShortenedPath
                      path={shortPath}
                      className={cn(
                        'truncate font-mono',
                        isBinary ? 'text-gray-400 dark:text-gray-500' : ''
                      )}
                    />
                    <span className="text-gray-500 dark:text-gray-400 w-20 text-right flex-shrink-0 ml-2">
                      {isBinary
                        ? 'Binary File'
                        : `${formatTokenCount(tokens)} tokens`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelectedFilePath(path);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 ml-2 flex-shrink-0"
                    title={`Remove ${path.split('/').pop()}`}
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 dark:text-gray-500 p-2 text-center">
              Select files from the tree to add them to the prompt context.
            </p>
          </div>
        )}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-300 font-medium pt-2 px-1 flex-shrink-0 text-right">
        Total Tokens: ~{formatTokenCount(totalTokens)}
      </div>
    </div>
  );
}
