import { useHistoryStore } from "../../store/historyStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { History, Trash2, CircleDot } from "lucide-react";
import { confirm, message } from "@tauri-apps/plugin-dialog";

export function HistoryPanel() {
  const { rootPath, triggerFileTreeRefresh } = useWorkspaceStore();
  const { entries, restore, clearAllHistory } = useHistoryStore();

  if (!rootPath) {
    return (
      <div className="p-4 text-center text-gray-500">
        Open a project to see its history.
      </div>
    );
  }

  const projectHistory = entries.filter((entry) => entry.rootPath === rootPath);

  const handleRestore = async (backupId: string, newFilePaths: string[]) => {
    const confirmed = await confirm(
      "This will revert files to the selected state. Are you sure?",
      { title: "Confirm Restore" }
    );
    if (!confirmed) {
      return;
    }

    try {
      await restore(backupId, rootPath, newFilePaths);
      triggerFileTreeRefresh();
      // The success message popup has been removed to fix the bug and improve UX.
    } catch (error) {
      console.error("Failed to restore history:", error);
      await message(`Failed to restore: ${error}`, {
        title: "Restore Failed",
      });
    }
  };

  const handleClearHistory = async () => {
    const confirmed = await confirm(
      "Are you sure you want to clear ALL history for ALL projects? This will also delete all backups and cannot be undone.",
      { title: "Confirm Clear All History" }
    );

    if (confirmed) {
      try {
        await clearAllHistory();
        await message("Successfully cleared all history and backups.", {
          title: "History Cleared",
        });
      } catch (error) {
        console.error("Failed to clear history:", error);
        await message(`Failed to clear history: ${error}`, {
          title: "Error",
        });
      }
    }
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold">Project History</h2>
        <button
          onClick={handleClearHistory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-red-600 text-white hover:bg-red-500 rounded-md disabled:bg-gray-400"
          title="Clear all history and backups"
          disabled={entries.length === 0}
        >
          <Trash2 size={14} />
          Clear All History
        </button>
      </div>
      {projectHistory.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-gray-500">
          <p>No history for this project yet.</p>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto pr-2">
          <ol className="relative border-l-2 border-gray-300 ml-4">
            <li className="mb-10 ml-6">
              <span className="absolute flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full -left-3 ring-4 ring-white">
                <CircleDot size={12} className="text-white" />
              </span>
              <h3 className="font-semibold text-gray-900">Current State</h3>
              <p className="text-sm font-normal text-gray-500">
                The current version of your files.
              </p>
            </li>

            {projectHistory.map((entry) => (
              <li key={entry.backupId} className="mb-10 ml-6">
                <span className="absolute flex items-center justify-center w-5 h-5 bg-gray-400 rounded-full -left-3 ring-4 ring-white" />
                <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm text-gray-800">
                        {entry.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleRestore(entry.backupId, entry.newFilePaths)
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-500 rounded-md"
                      title="Restore to this state"
                    >
                      <History size={14} />
                      Restore
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}