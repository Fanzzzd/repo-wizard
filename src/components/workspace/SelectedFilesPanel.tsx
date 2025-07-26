import { useWorkspaceStore } from '../../store/workspaceStore';
import { X, ArrowDownAZ, ArrowDown10 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import {
  getRelativePath,
  readFileContent,
  isBinaryFile,
} from '../../services/tauriApi';
import { estimateTokens, formatTokenCount } from '../../lib/token_estimator';
import { ShortenedPath } from '../common/ShortenedPath';
import { showErrorDialog } from '../../lib/errorHandler';
import { AppError, isFileNotFoundError } from '../../lib/error';

export function SelectedFilesPanel() {
  const {
    selectedFilePaths,
    rootPath,
    removeSelectedFilePath,
    activeFilePath,
    setActiveFilePath,
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
        selectedFilePaths.map(async path => {
          try {
            const shortPath = await getRelativePath(path, rootPath);
            const isBinary = await isBinaryFile(path);
            if (isBinary) {
              return { path, shortPath, tokens: 0, isBinary: true };
            }

            const content = await readFileContent(path);
            const tokens = estimateTokens(content);
            return { path, shortPath, tokens, isBinary: false };
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
  }, [selectedFilePaths, rootPath, removeSelectedFilePath]);

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
    <div className="p-2 flex flex-col h-full bg-gray-50 text-gray-800">
      <div className="flex justify-between items-center mb-2 px-1 flex-shrink-0">
        <h3 className="text-sm font-semibold">
          Selected Files ({selectedFilePaths.length})
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSortBy('name')}
            title="Sort by name"
            className={`p-1 rounded-md transition-colors ${
              sortBy === 'name'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            <ArrowDownAZ size={16} />
          </button>
          <button
            onClick={() => setSortBy('tokens')}
            title="Sort by token count"
            className={`p-1 rounded-md transition-colors ${
              sortBy === 'tokens'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            <ArrowDown10 size={16} />
          </button>
        </div>
      </div>
      <div className="bg-white rounded-md p-1 text-xs flex-grow overflow-y-auto border border-gray-200 min-h-0">
        {sortedFiles.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {sortedFiles.map(({ path, shortPath, tokens, isBinary }) => {
              const isActive = path === activeFilePath;
              return (
                <li
                  key={path}
                  className={`flex items-center justify-between p-1.5 rounded group select-none ${
                    isActive ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'
                  } ${isBinary ? 'cursor-not-allowed' : 'cursor-default'}`}
                  onClick={() => !isBinary && setActiveFilePath(path)}
                >
                  <ShortenedPath
                    path={shortPath}
                    className={`truncate font-mono ${isBinary ? 'text-gray-400' : ''}`}
                  />
                  <div className="flex items-center flex-shrink-0 ml-2">
                    <span className="text-gray-500 w-20 text-right">
                      {isBinary
                        ? 'Binary File'
                        : `${formatTokenCount(tokens)} tokens`}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        removeSelectedFilePath(path);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-600 ml-2"
                      title={`Remove ${path.split('/').pop()}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 p-2 text-center">
              Select files from the tree to add them to the prompt context.
            </p>
          </div>
        )}
      </div>
      <div className="text-xs text-gray-600 font-medium pt-2 px-1 flex-shrink-0 text-right">
        Total Tokens: ~{formatTokenCount(totalTokens)}
      </div>
    </div>
  );
}
