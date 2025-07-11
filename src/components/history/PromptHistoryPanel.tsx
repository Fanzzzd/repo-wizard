import { useState } from "react";
import { useHistoryStore } from "../../store/historyStore";
import { useComposerStore } from "../../store/composerStore";
import { useDialogStore } from "../../store/dialogStore";
import { History, Trash2, Copy, Clipboard, Check, RefreshCw } from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Button } from "../common/Button";
import type { PromptHistoryEntry } from "../../types";
import { usePromptGenerator } from "../../hooks/usePromptGenerator";

export function PromptHistoryPanel() {
  const { promptHistory, clearPromptHistory } = useHistoryStore();
  const { setInstructions } = useComposerStore();
  const { open: openDialog } = useDialogStore();
  
  const { generateAndCopyPrompt, isGenerating } = usePromptGenerator();
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [generatingPromptId, setGeneratingPromptId] = useState<string | null>(null);


  const handleClearHistory = async () => {
    const confirmed = await openDialog({
      title: "Confirm Clear Prompt History",
      content:
        "Are you sure you want to clear all prompts for this project? This cannot be undone.",
      type: "confirm",
      status: "warning",
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
    <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800">
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
          <div className="flex-grow flex items-center justify-center text-gray-500">
            <p>Your prompt history for this project will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {promptHistory.map((entry) => {
              const isCurrentlyGenerating = generatingPromptId === entry.id;
              const isCopied = copiedPromptId === entry.id;

              let buttonIcon = <Clipboard size={14} />;
              let buttonText = "Generate & Copy";

              if (isCurrentlyGenerating) {
                buttonIcon = <RefreshCw size={14} className="animate-spin" />;
                buttonText = "Generating...";
              } else if (isCopied) {
                buttonIcon = <Check size={14} />;
                buttonText = "Copied!";
              }

              return (
                <div
                  key={entry.id}
                  className="bg-white p-3 rounded-lg border border-gray-200"
                >
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded-md mb-3">
                    {entry.instructions}
                  </p>
                  <div className="flex items-center justify-end gap-2">
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
  );
}