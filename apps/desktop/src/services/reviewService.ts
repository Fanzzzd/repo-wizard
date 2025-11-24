import { createReviewChange, type ReviewChange } from '../types/review';
import * as tauriApi from './tauriApi';

export async function processAndStartReview(
  markdown: string,
  rootPath: string
) {
  const parsedOperations = await tauriApi.parseChangesFromMarkdown(
    markdown,
    rootPath
  );
  if (parsedOperations.length === 0) {
    return { changes: [], backupId: null };
  }

  const initialChanges = parsedOperations.map(createReviewChange);

  const filesToSnapshot = new Set<string>();
  initialChanges.forEach(({ operation }) => {
    switch (operation.type) {
      case 'patch':
      case 'overwrite':
      case 'delete':
        filesToSnapshot.add(operation.filePath);
        break;
      case 'move':
        filesToSnapshot.add(operation.fromPath);
        break;
    }
  });

  const fileList = Array.from(filesToSnapshot).filter((p) => p);
  const backupId = await tauriApi.backupFiles(rootPath, fileList);

  const changes = await Promise.all(
    initialChanges.map(async (change): Promise<ReviewChange> => {
      const { operation } = change;
      const getBaseFileContent = async (filePath: string) => {
        try {
          return await tauriApi.readFileFromBackup(backupId, filePath);
        } catch (_e) {
          return null;
        }
      };

      if (operation.type === 'patch' || operation.type === 'overwrite') {
        const originalContent = await getBaseFileContent(operation.filePath);
        const isNewFile = originalContent === null;
        const updatedOperation = { ...operation, isNewFile };
        let updatedChange = { ...change, operation: updatedOperation };

        if (!isNewFile && originalContent === updatedOperation.content) {
          // Only mark as identical if it's NOT a patch that failed to apply fully
          // If appliedBlocks < totalBlocks, it means the patch failed (partially or fully),
          // so we should NOT mark it as identical, allowing the UI to show "0/1" or "x/y".
          const isFailedPatch =
            operation.type === 'patch' &&
            operation.appliedBlocks < operation.totalBlocks;

          if (!isFailedPatch) {
            updatedChange = { ...updatedChange, status: 'identical' };
          }
        }
        return updatedChange;
      }
      return change;
    })
  );

  return { changes, backupId };
}

export async function applyChange(change: ReviewChange, rootPath: string) {
  const getAbsPath = (p: string) => `${rootPath}/${p}`;
  const { operation } = change;
  switch (operation.type) {
    case 'patch':
    case 'overwrite':
      await tauriApi.writeFileContent(
        getAbsPath(operation.filePath),
        operation.content,
        rootPath
      );
      break;
    case 'delete':
      await tauriApi.deleteFile(getAbsPath(operation.filePath), rootPath);
      break;
    case 'move':
      await tauriApi.moveFile(
        getAbsPath(operation.fromPath),
        getAbsPath(operation.toPath),
        rootPath
      );
      break;
  }
}

export async function revertChange(
  change: ReviewChange,
  backupId: string,
  rootPath: string
) {
  const getAbsPath = (p: string) => `${rootPath}/${p}`;
  const { operation } = change;
  switch (operation.type) {
    case 'patch':
    case 'overwrite':
      if (operation.isNewFile)
        await tauriApi.deleteFile(getAbsPath(operation.filePath), rootPath);
      else
        await tauriApi.revertFileFromBackup(
          rootPath,
          backupId,
          operation.filePath
        );
      break;
    case 'delete':
      await tauriApi.revertFileFromBackup(
        rootPath,
        backupId,
        operation.filePath
      );
      break;
    case 'move':
      await tauriApi.moveFile(
        getAbsPath(operation.toPath),
        getAbsPath(operation.fromPath),
        rootPath
      );
      break;
  }
}

export async function cleanupBackup(backupId: string) {
  return tauriApi.deleteBackup(backupId);
}
