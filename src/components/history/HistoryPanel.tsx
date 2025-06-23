import { useState } from "react";
import { useHistoryStore } from "../../store/historyStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import {
  History,
  Trash2,
  GitCommitHorizontal,
  GitBranch,
  FilePlus2,
  FilePenLine,
  FileMinus2,
  MoveRight,
} from "lucide-react";
import type { FileChangeInfo, HistoryState } from "../../types";
import { motion, AnimatePresence } from "motion/react";
import { useDialogStore } from "../../store/dialogStore";

const FileChangeDisplay = ({ change }: { change: FileChangeInfo }) => {
  const Icon = {
    added: FilePlus2,
    modified: FilePenLine,
    deleted: FileMinus2,
    renamed: MoveRight,
  }[change.type];

  const color = {
    added: "text-green-600",
    modified: "text-blue-600",
    deleted: "text-red-600",
    renamed: "text-purple-600",
  }[change.type];

  const pathDisplay =
    change.type === "renamed" ? (
      <>
        {change.path} <span className="mx-1 font-sans">→</span> {change.newPath}
      </>
    ) : (
      change.path
    );

  return (
    <div className={`flex items-center gap-2 text-xs ${color}`}>
      <Icon size={14} className="flex-shrink-0" />
      <span className="truncate font-mono" title={change.path}>
        {pathDisplay}
      </span>
    </div>
  );
};

const HistoryNode = ({
  entry,
  isLast,
  isCurrent,
  isFuture,
  onCheckout,
}: {
  entry: HistoryState;
  isLast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  onCheckout: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="relative pl-8 py-2 flex items-center gap-4 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isLast && (
        <div className={`absolute top-0 left-[11px] w-0.5 h-full ${isFuture ? 'bg-gray-200' : 'bg-gray-300'}`} />
      )}
      <div
        className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-150 ring-4 ring-gray-50
          ${ isCurrent ? "bg-blue-500" : isFuture ? "bg-gray-300" : "bg-gray-400 group-hover:bg-indigo-500" }`}
      >
        <GitCommitHorizontal size={16} className="text-white" />
      </div>
      <div className={`${isFuture ? "text-gray-400" : "text-gray-900"}`}>
        <div className="flex items-center gap-2">
            <p className="font-semibold">{entry.description}</p>
            {isCurrent && <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">HEAD</span>}
        </div>
        <p className={`text-xs ${isFuture ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(entry.timestamp).toLocaleString()}</p>
      </div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-10 top-1/2 -translate-y-1/2 w-80 bg-white rounded-lg shadow-2xl z-10 p-3 border border-gray-200"
          >
            <p className="text-sm font-bold mb-2">Changes in this state</p>
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto mb-3 pr-1">
              {entry.changedFiles?.length > 0 ? (
                entry.changedFiles.map((change, i) => (
                  <FileChangeDisplay key={i} change={change} />
                ))
              ) : (
                <p className="text-xs text-gray-400">
                  {entry.isInitialState ? "The initial state of the project." : "No file change details available."}
                </p>
              )}
            </div>
            <button
              onClick={onCheckout}
              disabled={isCurrent}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-500 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
              title={isCurrent ? "You are already at this state" : "Checkout this state"}
            >
              <History size={14} />
              Checkout this state
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export function HistoryPanel() {
  const { rootPath, triggerFileTreeRefresh } = useWorkspaceStore();
  const { history, head, checkout, clearAllHistory } = useHistoryStore();
  const { open: openDialog } = useDialogStore();

  if (!rootPath) {
    return (
      <div className="p-4 text-center text-gray-500">
        Open a project to see its history.
      </div>
    );
  }
  
  const projectHistory = (history[rootPath] ?? []).slice().reverse();
  const headIndex = head[rootPath] ?? -1;
  const chronologicalHeadIndex = headIndex;

  const handleCheckout = async (targetIndexInReversed: number) => {
    const chronologicalIndex = projectHistory.length - 1 - targetIndexInReversed;

    const confirmed = await openDialog({
      title: "Confirm Checkout",
      content: "This will revert files to the selected state. This action will modify your files on disk. Are you sure?",
      type: "confirm",
      status: "warning",
    });
    if (!confirmed) return;

    try {
      await checkout(rootPath, chronologicalIndex);
      triggerFileTreeRefresh();
    } catch (error) {
      console.error("Failed to checkout history:", error);
      await openDialog({ title: "Checkout Failed", content: `Failed to checkout: ${error}`, status: "error" });
    }
  };

  const handleClearHistory = async () => {
    const confirmed = await openDialog({
      title: "Confirm Clear All History",
      content: "Are you sure you want to clear ALL history for ALL projects? This will also delete all backups and cannot be undone.",
      type: "confirm",
      status: "warning",
    });

    if (confirmed) {
      try {
        await clearAllHistory();
        await openDialog({ title: "History Cleared", content: "Successfully cleared all history and backups.", status: "success" });
      } catch (error) {
        console.error("Failed to clear history:", error);
        await openDialog({ title: "Error", content: `Failed to clear history: ${error}`, status: "error" });
      }
    }
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold flex items-center gap-2">
          <GitBranch size={18} /> Project History
        </h2>
        <button
          onClick={handleClearHistory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-red-600 text-white hover:bg-red-500 rounded-md disabled:bg-gray-400"
          title="Clear all history and backups"
          disabled={Object.keys(history).length === 0}
        >
          <Trash2 size={14} />
          Clear All
        </button>
      </div>
      {projectHistory.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-gray-500">
          <p>No history for this project yet. Apply a change to start tracking.</p>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto pr-2">
          <div className="relative">
            <AnimatePresence>
                {projectHistory.map((entry, index) => {
                  const chronologicalIndex = projectHistory.length - 1 - index;
                  return (
                    <HistoryNode
                        key={entry.id}
                        entry={entry}
                        isLast={index === projectHistory.length - 1}
                        isCurrent={chronologicalIndex === chronologicalHeadIndex}
                        isFuture={chronologicalHeadIndex !== -1 && chronologicalIndex > chronologicalHeadIndex}
                        onCheckout={() => handleCheckout(index)}
                    />
                  )
                })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}