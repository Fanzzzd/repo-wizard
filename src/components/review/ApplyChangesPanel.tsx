import {
  applyPatch,
  backupFiles,
  deleteFile,
  moveFile,
  writeFileContent,
} from "../../lib/tauri_api";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useReviewStore } from "../../store/reviewStore";
import { useHistoryStore } from "../../store/historyStore";
import type { FileChangeInfo, HistoryState } from "../../types";
import { useDialogStore } from "../../store/dialogStore";

export function ApplyChangesPanel() {
    const { rootPath, triggerFileTreeRefresh } = useWorkspaceStore();
    const { endReview, changes } = useReviewStore();
    const { history, head, addState } = useHistoryStore();
    const { open: openDialog } = useDialogStore();

    const handleApplyApproved = async () => {
        if (!rootPath) return;

        const approvedChanges = changes
          .filter((c) => c.status === "approved")
          .sort((a, b) => {
            const order = { delete: 0, move: 1, modify: 2, rewrite: 2 };
            return order[a.operation.type] - order[b.operation.type];
          });

        if (approvedChanges.length === 0) {
            await openDialog({
                title: "No Changes to Apply",
                content: "There are no approved changes to apply. Please approve at least one change.",
                status: "warning",
            });
          return;
        }
        
        const projectHistory = history[rootPath] ?? [];
        const headIndex = head[rootPath] ?? -1;
        const currentState = headIndex !== -1 ? projectHistory[headIndex] : null;
        const isFirstCommit = projectHistory.length === 0;

        try {
          if (isFirstCommit) {
            const initialFileSet = new Set<string>();
            approvedChanges.forEach(change => {
                const { operation } = change;
                if (operation.type === 'modify' && !operation.isNewFile) initialFileSet.add(operation.filePath);
                if (operation.type === 'rewrite') initialFileSet.add(operation.filePath);
                if (operation.type === 'delete') initialFileSet.add(operation.filePath);
                if (operation.type === 'move') initialFileSet.add(operation.fromPath);
            });
            const initialFiles = Array.from(initialFileSet);
            const initialBackupId = await backupFiles(rootPath, initialFiles);
            const initialState: Omit<HistoryState, "id" | "timestamp"> = {
                backupId: initialBackupId,
                description: "Initial State",
                rootPath,
                files: initialFiles,
                changedFiles: [],
                isInitialState: true,
            };
            addState(initialState);
          }
          
          for (const change of approvedChanges) {
            const { operation } = change;
            const getAbsPath = (p: string) => `${rootPath}/${p}`;

            switch (operation.type) {
              case "modify":
                await applyPatch(getAbsPath(operation.filePath), operation.diff);
                break;
              case "rewrite":
                await writeFileContent(getAbsPath(operation.filePath), operation.content);
                break;
              case "delete":
                await deleteFile(getAbsPath(operation.filePath));
                break;
              case "move":
                await moveFile(getAbsPath(operation.fromPath), getAbsPath(operation.toPath));
                break;
            }
          }

          const changedFiles: FileChangeInfo[] = approvedChanges.map((change) => {
            const { operation } = change;
            switch (operation.type) {
                case "modify": return { path: operation.filePath, type: operation.isNewFile ? "added" : "modified" };
                case "rewrite": return { path: operation.filePath, type: "modified" };
                case "delete": return { path: operation.filePath, type: "deleted" };
                case "move": return { path: operation.fromPath, type: "renamed", newPath: operation.toPath };
            }
          });
          
          const newFileSet = new Set<string>(currentState?.files ?? []);
          approvedChanges.forEach(change => {
            const {operation} = change;
            if(operation.type === 'modify' && operation.isNewFile) newFileSet.add(operation.filePath);
            if(operation.type === 'rewrite') newFileSet.add(operation.filePath);
            if(operation.type === 'delete') newFileSet.delete(operation.filePath);
            if(operation.type === 'move') {
                newFileSet.delete(operation.fromPath);
                newFileSet.add(operation.toPath);
            }
          });
          const newFiles = Array.from(newFileSet);
          
          const newStateBackupId = await backupFiles(rootPath, newFiles);
          
          addState({
            backupId: newStateBackupId,
            description: `Applied ${approvedChanges.length} change(s)`,
            rootPath,
            changedFiles,
            files: newFiles,
          });

          triggerFileTreeRefresh();
          endReview();
          await openDialog({
              title: "Success",
              content: `Successfully applied ${approvedChanges.length} approved changes.`,
              status: "success",
          });

        } catch (e) {
          console.error(`Failed to apply changes:`, e);
          await openDialog({
              title: "Error Applying Changes",
              content: `Failed to apply changes: ${e}. You may need to use the History panel to restore to a previous state.`,
              status: "error"
          });
        }
    };
    
    return (
        <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800">
            <h2 className="font-bold mb-4 text-lg">Review Actions</h2>
            <div className="flex flex-col gap-3">
                <button
                    onClick={handleApplyApproved}
                    className="w-full px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md font-semibold"
                >
                    Apply Approved Changes
                </button>
                <button
                    onClick={endReview}
                    className="w-full px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-md font-semibold"
                >
                    Finish Review
                </button>
            </div>
            <div className="mt-4 text-xs text-gray-500">
                <p>After reviewing the changes in the main panel, apply the ones you've approved.</p>
                <p className="mt-2">'Finish Review' will discard all pending changes and exit the review mode.</p>
            </div>
        </div>
    );
}