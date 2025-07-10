import * as tauriApi from "./tauriApi";
import type { ReviewChange } from "../types";
import { createReviewChange } from "../types";
import { applyPatch as applyJsPatch } from "diff";

export async function processAndStartReview(markdown: string, rootPath: string) {
  const parsedOperations = await tauriApi.parseChangesFromMarkdown(markdown);
  if (parsedOperations.length === 0) {
    return { changes: [], backupId: null };
  }

  const initialChanges = parsedOperations.map(createReviewChange);
  
  const filesToSnapshot = new Set<string>();
  initialChanges.forEach(({ operation }) => {
    switch (operation.type) {
      case "modify": case "rewrite": case "delete": filesToSnapshot.add(operation.filePath); break;
      case "move": filesToSnapshot.add(operation.fromPath); break;
    }
  });

  const fileList = Array.from(filesToSnapshot).filter((p) => p);
  const backupId = await tauriApi.backupFiles(rootPath, fileList);

  const changes = await Promise.all(
    initialChanges.map(async (change): Promise<ReviewChange> => {
      const { operation } = change;
      const getBaseFileContent = async (filePath: string) => {
        try { return await tauriApi.readFileFromBackup(backupId, filePath); } 
        catch (e) { return null; }
      };

      if (operation.type === "modify" || operation.type === "rewrite") {
        const originalContent = await getBaseFileContent(operation.filePath);
        const isNewFile = originalContent === null;
        const updatedOperation = { ...operation, isNewFile };
        let updatedChange = { ...change, operation: updatedOperation };

        if (!isNewFile) {
          if (updatedOperation.type === "modify") {
            try {
              const modifiedContent = applyJsPatch(originalContent!, updatedOperation.diff);
              if (modifiedContent !== false && originalContent === modifiedContent) {
                updatedChange = { ...updatedChange, status: "identical" };
              }
            } catch (e) { /* ignore */ }
          } else if (updatedOperation.type === "rewrite" && originalContent === updatedOperation.content) {
            updatedChange = { ...updatedChange, status: "identical" };
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
    case "modify":
      await tauriApi.applyPatch(getAbsPath(operation.filePath), operation.diff);
      break;
    case "rewrite":
      await tauriApi.writeFileContent(getAbsPath(operation.filePath), operation.content);
      break;
    case "delete":
      await tauriApi.deleteFile(getAbsPath(operation.filePath));
      break;
    case "move":
      await tauriApi.moveFile(getAbsPath(operation.fromPath), getAbsPath(operation.toPath));
      break;
  }
}

export async function revertChange(change: ReviewChange, backupId: string, rootPath: string) {
  const getAbsPath = (p: string) => `${rootPath}/${p}`;
  const { operation } = change;
  switch (operation.type) {
    case "modify":
    case "rewrite":
      if (operation.isNewFile) await tauriApi.deleteFile(getAbsPath(operation.filePath));
      else await tauriApi.revertFileFromBackup(rootPath, backupId, operation.filePath);
      break;
    case "delete":
      await tauriApi.revertFileFromBackup(rootPath, backupId, operation.filePath);
      break;
    case "move":
      await tauriApi.moveFile(getAbsPath(operation.toPath), getAbsPath(operation.fromPath));
      break;
  }
}

export async function cleanupBackup(backupId: string) {
  return tauriApi.deleteBackup(backupId);
}