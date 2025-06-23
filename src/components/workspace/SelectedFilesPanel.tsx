import { useWorkspaceStore } from "../../store/workspaceStore";
import { X } from "lucide-react";

export function SelectedFilesPanel() {
  const { selectedFilePaths, rootPath, removeSelectedFilePath } = useWorkspaceStore();

  if (!rootPath) {
    return null;
  }

  return (
    <div className="p-2 flex flex-col h-full bg-gray-50 text-gray-800">
      <h3 className="text-sm font-semibold mb-2 px-1 flex-shrink-0">
        Selected Files ({selectedFilePaths.length})
      </h3>
      <div className="bg-white rounded-md p-1 text-xs flex-grow overflow-y-auto border border-gray-200 min-h-0">
        {selectedFilePaths.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {selectedFilePaths.map((path) => (
              <li key={path} className="flex items-center justify-between p-1 rounded hover:bg-gray-100 group">
                <span className="truncate" title={path}>
                  {rootPath ? path.replace(rootPath + "/", "") : path}
                </span>
                <button
                  onClick={() => removeSelectedFilePath(path)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-600 flex-shrink-0 ml-2"
                  title={`Remove ${path.split('/').pop()}`}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 p-2 text-center">
              Select files from the tree to add them to the prompt context.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}