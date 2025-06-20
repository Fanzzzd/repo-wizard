import { useReviewStore } from "../../store/reviewStore";
import { FileTypeIcon } from "../workspace/FileTypeIcon";
import { Check, X, CircleDot, Trash2, Move, PencilRuler } from "lucide-react";
import type { ReviewChange } from "../../types";

const ChangeItem = ({ change }: { change: ReviewChange }) => {
  const { activeChangeId, setActiveChangeId, updateChangeStatus } =
    useReviewStore();
  const isActive = change.id === activeChangeId;

  const handleStatusChange = (
    e: React.MouseEvent,
    status: ReviewChange["status"]
  ) => {
    e.stopPropagation();
    updateChangeStatus(change.id, status);
  };

  const getStatusIcon = (status: ReviewChange["status"]) => {
    switch (status) {
      case "approved":
        return <Check size={16} className="text-green-600" />;
      case "discarded":
        return <X size={16} className="text-red-600" />;
      case "pending":
      default:
        return <CircleDot size={16} className="text-yellow-500" />;
    }
  };

  const renderChangeDetails = () => {
    const { operation } = change;
    switch (operation.type) {
      case "modify":
        return (
          <>
            <FileTypeIcon filename={operation.filePath} isDirectory={false} />
            <span className="truncate" title={operation.filePath}>
              {operation.filePath}
            </span>
            {operation.isNewFile && (
              <span className="text-xs text-green-600 font-medium ml-auto mr-2">
                NEW
              </span>
            )}
          </>
        );
      case "rewrite":
        return (
          <>
            <PencilRuler size={14} className="text-purple-500" />
            <span className="truncate" title={operation.filePath}>
              {operation.filePath}
            </span>
             <span className="text-xs text-purple-600 font-medium ml-auto mr-2">
                REWRITE
              </span>
          </>
        );
      case "delete":
        return (
          <>
            <Trash2 size={14} className="text-red-500" />
            <span className="truncate line-through" title={operation.filePath}>
              {operation.filePath}
            </span>
          </>
        );
      case "move":
        return (
          <>
            <Move size={14} className="text-blue-500" />
            <span className="truncate" title={`${operation.fromPath} → ${operation.toPath}`}>
              {operation.fromPath.split('/').pop()} → {operation.toPath.split('/').pop()}
            </span>
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
          title="Approve"
          onClick={(e) => handleStatusChange(e, "approved")}
          className="p-1 rounded-full hover:bg-gray-200"
        >
          <Check size={14} className="hover:text-green-600" />
        </button>
        <button
          title="Discard"
          onClick={(e) => handleStatusChange(e, "discarded")}
          className="p-1 rounded-full hover:bg-gray-200"
        >
          <X size={14} className="hover:text-red-600" />
        </button>
        {getStatusIcon(change.status)}
      </div>
    </div>
  );
};

export function ChangeList() {
  const { changes, approveAllChanges, discardAllChanges } = useReviewStore();

  return (
    <div className="p-2 text-gray-800 overflow-auto h-full bg-gray-50">
      <div className="flex justify-between items-center mb-2 p-1">
        <h2 className="font-bold text-lg">Changes ({changes.length})</h2>
        <div className="flex gap-2">
          <button
            onClick={approveAllChanges}
            className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
            title="Approve all changes"
          >
            Approve All
          </button>
          <button
            onClick={discardAllChanges}
            className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
            title="Discard all changes"
          >
            Discard All
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {changes.map((change) => (
          <ChangeItem key={change.id} change={change} />
        ))}
      </div>
    </div>
  );
}