import { useDialogStore } from "../../store/dialogStore";
import { useProjectStore } from "../../store/projectStore";
import { FileTypeIcon } from "../workspace/FileTypeIcon";
import {
  Check,
  CircleDot,
  Trash2,
  Move,
  PencilRuler,
  AlertTriangle,
} from "lucide-react";
import type { ReviewChange } from "../../types";
import { Button } from "../common/Button";
import { ShortenedPath } from "../common/ShortenedPath";

const ChangeItem = ({ change }: { change: ReviewChange }) => {
  const {
    activeChangeId,
    setActiveChangeId,
    applyChange,
    revertChange,
    errors,
  } = useProjectStore();
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
      className={`flex items-center justify-between gap-2 p-2 rounded text-sm cursor-default ${
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
          className={`flex items-center justify-center w-24 gap-1.5 py-1 text-xs font-medium rounded-full transition-colors ${style} disabled:cursor-default`}
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
    triggerFileTreeRefresh
  } = useProjectStore();

  const appliedChanges = changes.filter((c) => c.status === "applied");

  const handleFinishReview = () => {
    endReview();
    if (appliedChanges.length > 0) {
      triggerFileTreeRefresh();
    }
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800">
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <h2 className="font-bold text-lg">Changes ({changes.length})</h2>
        <div className="flex gap-2">
          <Button
            onClick={applyAllPendingChanges}
            size="sm"
            className="bg-green-100 text-green-800 hover:bg-green-200 border-none"
            title="Apply all pending changes"
          >
            Apply All
          </Button>
          <Button
            onClick={revertAllAppliedChanges}
            size="sm"
            className="bg-gray-200 text-gray-800 hover:bg-gray-300 border-none"
            title="Revert all applied changes"
          >
            Reset All
          </Button>
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
          <Button
            onClick={handleFinishReview}
            size="md"
            variant="ghost"
            className="w-full bg-gray-600 text-white hover:bg-gray-700 font-semibold"
          >
            Finish Review ({appliedChanges.length} applied)
          </Button>
        </div>
      </div>
    </div>
  );
}