import { useReviewStore } from "../../store/reviewStore";
import { parseChangesFromMarkdown } from "../../lib/diff_parser";
import {
  applyPatch,
  backupFiles,
  restoreFromBackup,
  deleteFile,
  moveFile,
  writeFileContent,
} from "../../lib/tauri_api";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useState } from "react";

export function ReviewPanel() {
  const [markdown, setMarkdown] = useState("");
  const { rootPath, triggerFileTreeRefresh } = useWorkspaceStore();
  const {
    startReview,
    endReview,
    changes,
    isReviewing,
    backupId,
    setBackupId,
  } = useReviewStore();

  const handleReview = () => {
    if (!rootPath) {
      alert("Please open a project folder first.");
      return;
    }
    const parsedChanges = parseChangesFromMarkdown(markdown);
    startReview(parsedChanges);
  };

  const handleApplyApproved = async () => {
    if (!rootPath) return;

    const approvedChanges = changes
      .filter((c) => c.status === "approved")
      .sort((a, b) => {
        // Execute deletes and moves before modifications/rewrites
        const order = { delete: 0, move: 1, modify: 2, rewrite: 2 };
        return order[a.operation.type] - order[b.operation.type];
      });

    if (approvedChanges.length === 0) {
      alert("No approved changes to apply.");
      return;
    }

    const filesToBackup = approvedChanges.reduce((acc, change) => {
      const { operation } = change;
      if (
        (operation.type === "modify" && !operation.isNewFile) ||
        operation.type === "rewrite"
      ) {
        acc.push(`${rootPath}/${operation.filePath}`);
      } else if (operation.type === "move") {
        acc.push(`${rootPath}/${operation.fromPath}`);
      }
      return acc;
    }, [] as string[]);

    try {
      const newBackupId = await backupFiles(rootPath, filesToBackup);
      setBackupId(newBackupId);

      for (const change of approvedChanges) {
        const { operation } = change;
        const getAbsPath = (p: string) => `${rootPath}/${p}`;

        switch (operation.type) {
          case "modify":
            await applyPatch(getAbsPath(operation.filePath), operation.diff);
            break;
          case "rewrite":
            await writeFileContent(
              getAbsPath(operation.filePath),
              operation.content
            );
            break;
          case "delete":
            await deleteFile(getAbsPath(operation.filePath));
            break;
          case "move":
            await moveFile(
              getAbsPath(operation.fromPath),
              getAbsPath(operation.toPath)
            );
            break;
        }
      }

      alert(
        `Successfully applied ${approvedChanges.length} approved changes.`
      );
      triggerFileTreeRefresh();
    } catch (e) {
      console.error(`Failed to apply changes`, e);
      alert(
        `Failed to apply changes: ${e}.\n\nYou can undo the changes that were applied.`
      );
    }
  };

  const handleUndo = async () => {
    if (!rootPath || !backupId) return;
    try {
      await restoreFromBackup(rootPath, backupId);
      alert("Changes have been successfully undone.");
      setBackupId(null); // Prevent multiple undos
      triggerFileTreeRefresh();
    } catch (e) {
      console.error(`Failed to undo changes`, e);
      alert(`Failed to undo changes: ${e}`);
    }
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800">
      <h2 className="font-bold mb-2">Review & Apply</h2>
      <textarea
        className="w-full flex-grow bg-white p-2 rounded-md mb-4 font-mono text-sm border border-gray-200"
        placeholder="Paste markdown with diff and file operation blocks here..."
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        disabled={isReviewing}
      ></textarea>
      <div className="flex flex-wrap gap-2">
        {!isReviewing ? (
          <button
            onClick={handleReview}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-md disabled:bg-gray-400"
            disabled={!markdown}
          >
            Review Changes
          </button>
        ) : (
          <>
            <button
              onClick={handleApplyApproved}
              className="px-4 py-2 bg-green-600 text-white hover:bg-green-500 rounded-md"
            >
              Apply Approved
            </button>
            {backupId && (
              <button
                onClick={handleUndo}
                className="px-4 py-2 bg-yellow-500 text-white hover:bg-yellow-400 rounded-md"
              >
                Undo Applied
              </button>
            )}
            <button
              onClick={endReview}
              className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-500 rounded-md"
            >
              Finish Review
            </button>
          </>
        )}
      </div>
    </div>
  );
}