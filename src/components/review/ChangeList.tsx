import { useReviewStore } from "../../store/reviewStore";
import { FileTypeIcon } from "../workspace/FileTypeIcon";
import {
  Check,
  CircleDot,
  Trash2,
  Move,
  PencilRuler,
  AlertTriangle,
} from "lucide-react";
import type { FileChangeInfo, ReviewChange } from "../../types";
import { ShortenedPath } from "../common/ShortenedPath";
import { backupFiles } from "../../lib/tauri_api";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useHistoryStore } from "../../store/historyStore";
import { useDialogStore } from "../../store/dialogStore";

const ChangeItem = ({ change }: { change: ReviewChange }) => {
  const {
    activeChangeId,
    setActiveChangeId,
    applyChange,
    revertChange,
    errors,
  } = useReviewStore();
  const openDialog = useDialogStore((s) => s.open);
  const isActive = change.id === activeChangeId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (change.status === "pending") {
      applyChange(change.id);
    } else if (change.status === "applied") {
      revertChange(change.id);
    } else if (change.status === "error") {
      openDialog({
        title: "Application Error",
        content: errors[change.id] || "An unknown error occurred.",
        status: "error",
      });
    }
  };

  const getStatusProps = () => {
    switch (change.status) {
      case "applied":
        return {
          icon: <Check size={14} />,
          text: "Applied",
          style: "bg-green-100 text-green-800 hover:bg-green-200",
        };
      case "identical":
        return {
          icon: <Check size={14} />,
          text: "Identical",
          style: "bg-green-100 text-green-800",
        };
      case "error":
        return {
          icon: <AlertTriangle size={14} />,
          text: "Error",
          style: "bg-red-100 text-red-800 hover:bg-red-200",
        };
      default: // pending
        return {
          icon: <CircleDot size={14} />,
          text: "Pending",
          style: "bg-gray-100 text-gray-600 hover:bg-gray-200",
        };
    }
  };

  const { icon, text, style } = getStatusProps();

  const renderChangeDetails = () => {
    const { operation } = change;
    switch (operation.type) {
      case "modify":
        return (
          <>
            <FileTypeIcon filename={operation.filePath} isDirectory={false} />
            <ShortenedPath path={operation.filePath} className="truncate min-w-0" />
            {operation.isNewFile && (
              <span className="text-xs text-green-600 font-medium ml-auto mr-2 flex-shrink-0">
                NEW
              </span>
            )}
          </>
        );
      case "rewrite":
        return (
          <>
            <PencilRuler size={14} className="text-purple-500" />
            <ShortenedPath path={operation.filePath} className="truncate min-w-0" />
            <div className="ml-auto mr-2 flex-shrink-0 flex items-center gap-2">
              {operation.isNewFile && (
                <span className="text-xs text-green-600 font-medium">NEW</span>
              )}
              <span className="text-xs text-purple-600 font-medium">
                REWRITE
              </span>
            </div>
          </>
        );
      case "delete":
        return (
          <>
            <Trash2 size={14} className="text-red-500" />
            <ShortenedPath
              path={operation.filePath}
              className="truncate line-through min-w-0"
            />
          </>
        );
      case "move":
        return (
          <>
            <Move size={14} className="text-blue-500" />
            <ShortenedPath path={operation.fromPath} className="truncate min-w-0" />
            <span className="text-gray-500 flex-shrink-0">→</span>
            <ShortenedPath path={operation.toPath} className="truncate min-w-0" />
          </>
        );
    }
  };

  return (
    <div
      onClick={() => setActiveChangeId(change.id)}
      className={`flex items-center justify-between gap-2 cursor-pointer p-2 rounded text-sm ${
        isActive
          ? "bg-blue-100 text-blue-900"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {renderChangeDetails()}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={handleClick}
          disabled={change.status === 'identical'}
          title="Cycle Status (Pending -> Applied)"
          className={`flex items-center justify-center w-24 gap-1.5 py-1 text-xs font-medium rounded-full transition-colors ${style} disabled:cursor-default disabled:hover:bg-green-100`}
        >
          {icon}
          <span>{text}</span>
        </button>
      </div>
    </div>
  );
};

export function ChangeList() {
  const {
    changes,
    endReview,
    applyAllPendingChanges,
    revertAllAppliedChanges,
  } = useReviewStore();
  const { rootPath, triggerFileTreeRefresh } = useWorkspaceStore();
  const { history, head, addState, amendState, popHeadState } = useHistoryStore();
  const { open: openDialog } = useDialogStore();

  const appliedChanges = changes.filter((c) => c.status === "applied");

  const handleFinishReview = async () => {
    if (!rootPath) return;

    const projectHistory = history[rootPath] ?? [];
    const headIndex = head[rootPath] ?? -1;
    const headSnapshot = headIndex !== -1 ? projectHistory[headIndex] : null;

    // Determine if the current HEAD is an amendable state from a previous review.
    const isAmendableState =
      headSnapshot &&
      !headSnapshot.isInitialState &&
      !headSnapshot.description.includes("Workspace changes detected");

    if (appliedChanges.length === 0) {
      // If we were reviewing an amendable state and we reverted all changes,
      // we should pop this state from history, effectively reverting the commit.
      if (isAmendableState && headSnapshot) {
        try {
          await popHeadState(rootPath);
          triggerFileTreeRefresh();
        } catch (e) {
          console.error(`Failed to pop history state:`, e);
          await openDialog({
            title: "Error Reverting History",
            content: `Failed to revert the last set of changes: ${e}.`,
            status: "error",
          });
        }
      }
      endReview();
      return;
    }

    try {
      const changedFiles: FileChangeInfo[] = appliedChanges.map((change) => {
        const { operation } = change;
        switch (operation.type) {
          case "modify":
            return {
              path: operation.filePath,
              type: operation.isNewFile ? "added" : "modified",
            };
          case "rewrite":
            return { path: operation.filePath, type: operation.isNewFile ? "added" : "modified" };
          case "delete":
            return { path: operation.filePath, type: "deleted" };
          case "move":
            return {
              path: operation.fromPath,
              type: "renamed",
              newPath: operation.toPath,
            };
        }
      });

      const newFileSet = new Set<string>(headSnapshot?.files ?? []);
      appliedChanges.forEach((change) => {
        const { operation } = change;
        if (operation.type === "modify" && operation.isNewFile)
          newFileSet.add(operation.filePath);
        if (operation.type === "rewrite" && operation.isNewFile) newFileSet.add(operation.filePath);
        if (operation.type === "delete") newFileSet.delete(operation.filePath);
        if (operation.type === "move") {
          newFileSet.delete(operation.fromPath);
          newFileSet.add(operation.toPath);
        }
      });
      const newFiles = Array.from(newFileSet);

      const newStateBackupId = await backupFiles(rootPath, newFiles);

      const newStateData = {
        backupId: newStateBackupId,
        description: `Applied ${appliedChanges.length} change(s)`,
        rootPath,
        changedFiles,
        files: newFiles,
      };

      if (isAmendableState) {
        await amendState(newStateData);
      } else {
        addState(newStateData);
      }

      triggerFileTreeRefresh();
      endReview();
    } catch (e) {
      console.error(`Failed to finalize review:`, e);
      await openDialog({
        title: "Error Finalizing Review",
        content: `Failed to save changes to history: ${e}.`,
        status: "error",
      });
    }
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800">
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <h2 className="font-bold text-lg">Changes ({changes.length})</h2>
        <div className="flex gap-2">
          <button
            onClick={applyAllPendingChanges}
            className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
            title="Apply all pending changes"
          >
            Apply All
          </button>
          <button
            onClick={revertAllAppliedChanges}
            className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            title="Revert all applied changes"
          >
            Reset All
          </button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto pr-1 min-h-0">
        <div className="flex flex-col gap-1">
          {changes.map((change) => (
            <ChangeItem key={change.id} change={change} />
          ))}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex flex-col gap-3">
          <button
            onClick={handleFinishReview}
            className="w-full px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-md font-semibold"
          >
            Finish Review ({appliedChanges.length} applied)
          </button>
        </div>
      </div>
    </div>
  );
}