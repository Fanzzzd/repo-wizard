import { ArrowDown10, ArrowDownAZ, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppError, isFileNotFoundError } from '../../lib/error';
import { showErrorDialog } from '../../lib/errorHandler';
import { estimateTokens, formatTokenCount } from '../../lib/token_estimator';
import { cn } from '../../lib/utils';
import {
  fileExists,
  getRelativePath,
  isBinaryFile,
  readFileContent,
} from '../../services/tauriApi';
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
  } = useWorkspaceStore();
  const [fileDetails, setFileDetails] = useState<
    { path: string; shortPath: string; tokens: number; isBinary: boolean }[]
  >([]);
  const [sortBy, setSortBy] = useState<'name' | 'tokens'>('name');

  useEffect(() => {
    if (!rootPath || selectedFilePaths.length === 0) {
      setFileDetails([]);
      return;
    }

    const fetchDetails = async () => {
      const details = await Promise.all(
        selectedFilePaths.map(async (path) => {
          try {
            const shortPath = await getRelativePath(path, rootPath);
            // 1) Existence check first
            const exists = await fileExists(path);
            if (!exists) {
              console.warn(`File not found, removing from selection: ${path}`);
              removeSelectedFilePath(path);
              return null;
            }
            // 2) Binary check next - do not read binary files
            const binary = await isBinaryFile(path);
            if (binary) {
              return { path, shortPath, tokens: 0, isBinary: true };
            }
            // 3) Safe to read text content for tokens
            try {
              const content = await readFileContent(path);
              const tokens = estimateTokens(content);
              return { path, shortPath, tokens, isBinary: false };
            } catch (readErr) {
              if (isFileNotFoundError(readErr)) {
                console.warn(
                  `File not found, removing from selection: ${path}`
                );
                removeSelectedFilePath(path);
                return null;
              }
              showErrorDialog(
                new AppError(
                  `Failed to read file for token count: ${path}`,
                  readErr
                )
              );
              return null;
            }
          } catch (error) {
            if (isFileNotFoundError(error)) {
              console.warn(`File not found, removing from selection: ${path}`);
              removeSelectedFilePath(path);
              return null;
            }
            showErrorDialog(
              new AppError(
                `Failed to read file for token count: ${path}`,
                error
              )
            );
            return null;
          }
        })
      );
      setFileDetails(
        details.filter(
          (
            d
          ): d is {
            path: string;
            shortPath: string;
            tokens: number;
            isBinary: boolean;
          } => d !== null
        )
      );
    };

    fetchDetails();
    void refreshCounter;
  }, [selectedFilePaths, rootPath, removeSelectedFilePath, refreshCounter]);

  const totalTokens = useMemo(
    () => fileDetails.reduce((sum, file) => sum + file.tokens, 0),
    [fileDetails]
  );

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
    <div className="p-2 flex flex-col h-full bg-gray-50 dark:bg-[#171717] text-gray-800 dark:text-[#ededed]">
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
                ? 'bg-blue-100 text-blue-700 dark:bg-[#262626] dark:text-[#ededed]'
                : 'text-gray-500 hover:bg-gray-200 dark:text-[#a3a3a3] dark:hover:bg-[#262626]'
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
                ? 'bg-blue-100 text-blue-700 dark:bg-[#262626] dark:text-[#ededed]'
                : 'text-gray-500 hover:bg-gray-200 dark:text-[#a3a3a3] dark:hover:bg-[#262626]'
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
                : 'text-gray-500 hover:bg-gray-200 dark:text-[#a3a3a3] dark:hover:bg-[#262626]'
            )}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="bg-white dark:bg-[#0a0a0a] rounded-md p-1 text-xs flex-grow overflow-y-auto border border-gray-200 dark:border-[#262626] min-h-0">
        {sortedFiles.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {sortedFiles.map(({ path, shortPath, isBinary }) => {
              return (
                <li
                  key={path}
                  className={cn(
                    'flex items-center p-1.5 rounded group select-none',
                    !isBinary &&
                      path === useWorkspaceStore.getState().activeFilePath
                      ? 'bg-blue-100 text-blue-900 dark:bg-[#262626] dark:text-[#ededed]'
                      : 'hover:bg-gray-100 dark:hover:bg-[#262626]/50'
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
                        isBinary ? 'text-gray-400 dark:text-[#737373]' : ''
                      )}
                    />
                    <span className="text-gray-500 dark:text-[#a3a3a3] w-20 text-right flex-shrink-0 ml-2">
                      {isBinary
                        ? 'Binary File'
                        : `${formatTokenCount(fileDetails.find((f) => f.path === path)?.tokens || 0)} tokens`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelectedFilePath(path);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-600 dark:text-[#a3a3a3] dark:hover:text-red-400 ml-2 flex-shrink-0"
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
            <p className="text-gray-400 dark:text-[#737373] p-2 text-center">
              Select files from the tree to add them to the prompt context.
            </p>
          </div>
        )}
      </div>
      <div className="text-xs text-gray-600 dark:text-[#d4d4d4] font-medium pt-2 px-1 flex-shrink-0 text-right">
        Total Tokens: ~{formatTokenCount(totalTokens)}
      </div>
    </div>
  );
}
