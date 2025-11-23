import { useDialogStore } from '../../store/dialogStore';
import { useReviewStore } from '../../store/reviewStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { FileTypeIcon } from '../workspace/FileTypeIcon';
import {
  Check,
  CircleDot,
  AlertTriangle,
  CheckCheck,
  Undo,
} from 'lucide-react';
import type { ReviewChange } from '../../types';
import { Button } from '../common/Button';
import { ShortenedPath } from '../common/ShortenedPath';
import { useReviewSession } from '../../hooks/useReviewSession';

const ChangeTypeBadge = ({ type }: { type: 'A' | 'P' | 'O' | 'D' | 'R' }) => {
  const typeMap = {
    A: {
      char: 'A',
      className: 'bg-green-500 text-white',
      title: 'Added',
    },
    P: {
      char: 'P',
      className: 'bg-blue-500 text-white',
      title: 'Patched',
    },
    O: {
      char: 'O',
      className: 'bg-purple-500 text-white',
      title: 'Overwritten',
    },
    D: {
      char: 'D',
      className: 'bg-red-500 text-white',
      title: 'Deleted',
    },
    R: {
      char: 'R',
      className: 'bg-orange-500 text-white',
      title: 'Moved / Renamed',
    },
  };

  const { char, className, title } = typeMap[type];

  return (
    <div
      className={`flex-shrink-0 w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold ${className}`}
      title={title}
    >
      {char}
    </div>
  );
};

const ChangeItem = ({ change }: { change: ReviewChange }) => {
  const {
    activeChangeId,
    setActiveChangeId,
    applyChange,
    revertChange,
    errors,
  } = useReviewStore();
  const openDialog = useDialogStore(s => s.open);
  const isActive = change.id === activeChangeId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (change.status === 'pending') {
      applyChange(change.id);
    } else if (change.status === 'applied') {
      revertChange(change.id);
    } else if (change.status === 'error') {
      openDialog({
        title: 'Application Error',
        content: errors[change.id] || 'An unknown error occurred.',
        status: 'error',
      });
    }
  };

  const getStatusProps = () => {
    const op = change.operation;
    const isPatch = op.type === 'patch';
    
    // For non-patch operations, we consider them as single block operations
    const totalBlocks = isPatch ? op.totalBlocks : 1;
    const matchingBlocks = isPatch ? op.appliedBlocks : 1;
    
    // If pending, we haven't applied anything yet, so 0 applied (from user perspective)
    // If applied, we show how many blocks successfully matched
    const displayApplied = change.status === 'pending' ? 0 : matchingBlocks;
    
    const countText = `${displayApplied}/${totalBlocks}`;

    switch (change.status) {
      case 'applied':
        const isPartial = matchingBlocks < totalBlocks;
        return {
          icon: <Check size={14} />,
          text: countText,
          style: isPartial
            ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30'
            : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30',
        };
      case 'identical':
        return {
          icon: <Check size={14} />,
          text: 'Identical',
          style: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
        };
      case 'error':
        return {
          icon: <AlertTriangle size={14} />,
          text: 'Error',
          style:
            'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30',
        };
      default: // pending
        return {
          icon: <CircleDot size={14} />,
          text: countText,
          style:
            'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
        };
    }
  };

  const { icon, text, style } = getStatusProps();

  const renderChangeDetails = () => {
    const { operation } = change;
    switch (operation.type) {
      case 'patch':
        return (
          <>
            <ChangeTypeBadge type={operation.isNewFile ? 'A' : 'P'} />
            <FileTypeIcon filename={operation.filePath} isDirectory={false} />
            <ShortenedPath
              path={operation.filePath}
              className="truncate min-w-0"
            />
          </>
        );
      case 'overwrite':
        return (
          <>
            <ChangeTypeBadge type={operation.isNewFile ? 'A' : 'O'} />
            <FileTypeIcon filename={operation.filePath} isDirectory={false} />
            <ShortenedPath
              path={operation.filePath}
              className="truncate min-w-0"
            />
          </>
        );
      case 'delete':
        return (
          <>
            <ChangeTypeBadge type="D" />
            <FileTypeIcon filename={operation.filePath} isDirectory={false} />
            <ShortenedPath
              path={operation.filePath}
              className="truncate min-w-0 line-through"
            />
          </>
        );
      case 'move':
        return (
          <>
            <ChangeTypeBadge type="R" />
            <ShortenedPath
              path={operation.fromPath}
              className="truncate min-w-0 text-gray-500 dark:text-gray-400"
            />
            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">→</span>
            <ShortenedPath
              path={operation.toPath}
              className="truncate min-w-0"
            />
          </>
        );
    }
  };

  return (
    <div
      onClick={() => setActiveChangeId(change.id)}
      className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-sm cursor-default ${
        isActive
          ? 'bg-blue-100 text-blue-900 dark:bg-blue-500/30 dark:text-blue-100'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
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
  const { changes } = useReviewStore();
  const { triggerFileTreeRefresh } = useWorkspaceStore();
  const { endReview, applyAll, revertAll } = useReviewSession();

  const appliedChanges = changes.filter(c => c.status === 'applied');

  const handleFinishReview = () => {
    endReview();
    if (appliedChanges.length > 0) {
      triggerFileTreeRefresh();
    }
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <h2 className="font-bold text-base">Changes ({changes.length})</h2>
        <div className="flex items-center gap-1">
          <Button
            onClick={applyAll}
            variant="ghost"
            size="sm"
            className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-500/20"
            title="Apply all pending changes"
            leftIcon={<CheckCheck size={14} />}
          >
            Apply All
          </Button>
          <Button
            onClick={revertAll}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700/50"
            title="Revert all applied changes"
            leftIcon={<Undo size={14} />}
          >
            Reset All
          </Button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto pr-1 min-h-0">
        <div className="flex flex-col gap-1">
          {changes.map(change => (
            <ChangeItem key={change.id} change={change} />
          ))}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleFinishReview}
            size="md"
            variant="ghost"
            className="w-full bg-gray-600 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-800 dark:hover:bg-gray-300 font-semibold"
          >
            Finish Review ({appliedChanges.length} applied)
          </Button>
        </div>
      </div>
    </div>
  );
}