import { useEffect, useMemo, useRef, useState } from 'react';
import { AppError } from '../lib/error';
import { showErrorDialog } from '../lib/errorHandler';
import { countTokensForFiles, getRelativePath } from '../services/tauriApi';

export type SelectedFileDetail = {
  path: string;
  shortPath: string;
  tokens: number;
  isBinary: boolean;
};

type UseSelectedFileDetailsParams = {
  selectedFilePaths: string[];
  rootPath: string | null;
  refreshCounter: number;
  onMissingPath: (path: string) => void;
};

export function useSelectedFileDetails({
  selectedFilePaths,
  rootPath,
  refreshCounter,
  onMissingPath,
}: UseSelectedFileDetailsParams) {
  const detailsByPathRef = useRef(new Map<string, SelectedFileDetail>());
  const lastRefreshCounter = useRef(refreshCounter);
  const lastRootPath = useRef(rootPath);
  const [details, setDetails] = useState<SelectedFileDetail[]>([]);

  useEffect(() => {
    if (!rootPath || selectedFilePaths.length === 0) {
      detailsByPathRef.current.clear();
      setDetails([]);
      return;
    }

    const shouldReset =
      lastRefreshCounter.current !== refreshCounter ||
      lastRootPath.current !== rootPath;
    lastRefreshCounter.current = refreshCounter;
    lastRootPath.current = rootPath;
    if (shouldReset) {
      detailsByPathRef.current.clear();
    }

    const selectedSet = new Set(selectedFilePaths);
    for (const path of detailsByPathRef.current.keys()) {
      if (!selectedSet.has(path)) {
        detailsByPathRef.current.delete(path);
      }
    }

    const pathsToFetch = selectedFilePaths.filter(
      (path) => !detailsByPathRef.current.has(path)
    );

    if (pathsToFetch.length === 0) {
      setDetails(
        selectedFilePaths
          .map((path) => detailsByPathRef.current.get(path))
          .filter((detail): detail is SelectedFileDetail => Boolean(detail))
      );
      return;
    }

    let cancelled = false;

    const fetchDetails = async () => {
      try {
        const [shortPaths, tokenInfos] = await Promise.all([
          Promise.all(
            pathsToFetch.map(async (path) => ({
              path,
              shortPath: await getRelativePath(path, rootPath),
            }))
          ),
          countTokensForFiles(pathsToFetch),
        ]);

        const infoByPath = new Map(tokenInfos.map((info) => [info.path, info]));
        const missingPaths: string[] = [];

        for (const { path, shortPath } of shortPaths) {
          const info = infoByPath.get(path);
          if (!info || !info.exists) {
            missingPaths.push(path);
            continue;
          }
          detailsByPathRef.current.set(path, {
            path,
            shortPath,
            tokens: info.tokens,
            isBinary: info.isBinary,
          });
        }

        if (cancelled) {
          return;
        }

        if (missingPaths.length > 0) {
          for (const path of missingPaths) {
            detailsByPathRef.current.delete(path);
            onMissingPath(path);
          }
        }

        const missingSet = new Set(missingPaths);
        const nextSelectedPaths = missingSet.size
          ? selectedFilePaths.filter((path) => !missingSet.has(path))
          : selectedFilePaths;

        setDetails(
          nextSelectedPaths
            .map((path) => detailsByPathRef.current.get(path))
            .filter((detail): detail is SelectedFileDetail => Boolean(detail))
        );
      } catch (error) {
        showErrorDialog(
          new AppError('Failed to load file details for token count.', error)
        );
      }
    };

    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedFilePaths, rootPath, refreshCounter, onMissingPath]);

  const totalTokens = useMemo(
    () => details.reduce((sum, file) => sum + file.tokens, 0),
    [details]
  );

  return { details, totalTokens };
}
