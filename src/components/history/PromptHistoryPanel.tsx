import { useState, useCallback } from "react";
import { useHistoryStore } from "../../store/historyStore";
import { useComposerStore } from "../../store/composerStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useDialogStore } from "../../store/dialogStore";
import { useSettingsStore } from "../../store/settingsStore";
import { getRelativePath, readFileContent } from "../../services/tauriApi";
import { buildPrompt } from "../../lib/prompt_builder";
import { History, Trash2, Copy, Clipboard, Check } from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Button } from "../common/Button";
import type { MetaPrompt, PromptHistoryEntry } from "../../types";
import { showErrorDialog } from "../../lib/errorHandler";
import { AppError } from "../../lib/error";

export function PromptHistoryPanel() {
  const { promptHistory, clearPromptHistory } = useHistoryStore();
  const { setInstructions, composerMode, enabledMetaPromptIds } = useComposerStore();
  const { selectedFilePaths, rootPath, removeSelectedFilePath } = useWorkspaceStore();
  const { open: openDialog } = useDialogStore();
  const { customSystemPrompt, editFormat, metaPrompts: promptDefs } = useSettingsStore();

  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

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

  const getFilesWithRelativePaths = useCallback(
    async (paths: string[], root: string) => {
      const files = await Promise.all(
        paths.map(async (path) => {
          try {
            const content = await readFileContent(path);
            const relativePath = await getRelativePath(path, root);
            return { path: relativePath, content };
          } catch (error) {
            showErrorDialog(new AppError(`Failed to read file for prompt: ${path}`, error));
            if (
              typeof error === "string" &&
              (error.includes("No such file") ||
                error.includes("The system cannot find the file specified"))
            ) {
              removeSelectedFilePath(path);
            }
            return null;
          }
        })
      );
      return files.filter((f) => f !== null) as {
        path: string;
        content: string;
      }[];
    },
    [removeSelectedFilePath]
  );

  const handleGenerateAndCopy = async (entry: PromptHistoryEntry) => {
    if (!rootPath) return;

    setInstructions(entry.instructions);

    const metaPrompts: MetaPrompt[] = promptDefs.map(def => ({
        ...def,
        enabled: enabledMetaPromptIds.includes(def.id)
    }));

    const files = await getFilesWithRelativePaths(selectedFilePaths, rootPath);
    const fullPrompt = buildPrompt(
      files,
      entry.instructions,
      customSystemPrompt,
      editFormat,
      metaPrompts,
      composerMode
    );
    await writeText(fullPrompt);

    setCopiedPromptId(entry.id);
    setTimeout(() => {
      setCopiedPromptId(null);
    }, 2000);
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
            {promptHistory.map((entry) => (
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
                    disabled={!rootPath}
                    title={
                      !rootPath
                        ? "Open a project to generate a full prompt"
                        : "Populate composer and copy full generated prompt"
                    }
                    leftIcon={
                      copiedPromptId === entry.id ? (
                        <Check size={14} />
                      ) : (
                        <Clipboard size={14} />
                      )
                    }
                  >
                    {copiedPromptId === entry.id
                      ? "Copied!"
                      : "Generate & Copy"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}