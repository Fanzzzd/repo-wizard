import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import {
  Check,
  Clipboard,
  Copy,
  Edit,
  History,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { usePromptGenerator } from '../../hooks/usePromptGenerator';
import { useComposerStore } from '../../store/composerStore';
import { useDialogStore } from '../../store/dialogStore';
import { useHistoryStore } from '../../store/historyStore';
import type { PromptHistoryEntry } from '../../types/prompt';
import { Button } from '../common/Button';
import { PromptHistoryDetailModal } from './PromptHistoryDetailModal';

const instructionPreview = (
  instructions: string,
  lineLimit = 3,
  charLimit = 200
) => {
  const lines = instructions.split('\n');
  const hasMoreLines = lines.length > lineLimit;

  let preview = lines.slice(0, lineLimit).join('\n');
  const hasMoreChars = preview.length > charLimit;

  if (hasMoreChars) {
    preview = preview.substring(0, charLimit);
  }

  if (hasMoreLines || hasMoreChars) {
    return `${preview}...`;
  }

  return instructions;
};

export function PromptHistoryPanel() {
  const { promptHistory, clearPromptHistory } = useHistoryStore();
  const { setInstructions } = useComposerStore();
  const { open: openDialog } = useDialogStore();

  const { generateAndCopyPrompt, isGenerating } = usePromptGenerator();
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [generatingPromptId, setGeneratingPromptId] = useState<string | null>(
    null
  );

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PromptHistoryEntry | null>(
    null
  );

  const handleOpenDetailModal = (entry: PromptHistoryEntry) => {
    setSelectedEntry(entry);
    setIsDetailModalOpen(true);
  };

  const handleClearHistory = async () => {
    const confirmed = await openDialog({
      title: 'Confirm Clear Prompt History',
      content:
        'Are you sure you want to clear all prompts for this project? This cannot be undone.',
      type: 'confirm',
      status: 'warning',
    });

    if (confirmed) {
      clearPromptHistory();
    }
  };

  const handleGenerateAndCopy = async (entry: PromptHistoryEntry) => {
    if (isGenerating || generatingPromptId) return;

    setGeneratingPromptId(entry.id);
    setInstructions(entry.instructions);

    const success = await generateAndCopyPrompt(entry.instructions);

    if (success) {
      setCopiedPromptId(entry.id);
      setTimeout(() => {
        setCopiedPromptId(null);
      }, 2000);
    }
    setGeneratingPromptId(null);
  };

  return (
    <>
      <div className="p-4 flex flex-col h-full bg-gray-50 dark:bg-[#171717] text-gray-800 dark:text-[#ededed]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <History size={18} /> Prompt History
          </h2>
          <Button
            onClick={handleClearHistory}
            variant="danger"
            size="sm"
            disabled={promptHistory.length === 0}
            leftIcon={<Trash2 size={14} />}
          >
            Clear History
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto thin-scrollbar">
          {promptHistory.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-gray-500 dark:text-[#a3a3a3]">
              <p>Your prompt history for this project will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promptHistory.map((entry) => {
                const isCurrentlyGenerating = generatingPromptId === entry.id;
                const isCopied = copiedPromptId === entry.id;

                let buttonIcon = <Clipboard size={14} />;
                let buttonText = 'Generate & Copy';

                if (isCurrentlyGenerating) {
                  buttonIcon = <RefreshCw size={14} className="animate-spin" />;
                  buttonText = 'Generating...';
                } else if (isCopied) {
                  buttonIcon = <Check size={14} />;
                  buttonText = 'Copied!';
                }

                return (
                  <div
                    key={entry.id}
                    className="bg-white dark:bg-[#262626]/50 p-3 rounded-lg border border-gray-200 dark:border-[#262626]"
                  >
                    <p className="text-xs text-gray-500 dark:text-[#a3a3a3] mb-2">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(entry)}
                      className="w-full text-left text-sm text-gray-700 dark:text-[#d4d4d4] whitespace-pre-wrap font-mono bg-gray-50 dark:bg-[#171717] p-2 rounded-md mb-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#262626] select-text"
                      title="Click to view/edit full prompt"
                    >
                      {instructionPreview(entry.instructions)}
                    </button>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => handleOpenDetailModal(entry)}
                        size="sm"
                        variant="ghost"
                        leftIcon={<Edit size={14} />}
                      >
                        View / Edit
                      </Button>
                      <Button
                        onClick={() => writeText(entry.instructions)}
                        size="sm"
                        variant="secondary"
                        leftIcon={<Copy size={14} />}
                      >
                        Copy
                      </Button>
                      <Button
                        onClick={() => handleGenerateAndCopy(entry)}
                        size="sm"
                        variant="primary"
                        disabled={isGenerating || !!generatingPromptId}
                        title="Populate composer and copy full generated prompt"
                        leftIcon={buttonIcon}
                      >
                        {buttonText}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <PromptHistoryDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        entry={selectedEntry}
      />
    </>
  );
}
