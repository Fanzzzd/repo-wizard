import { useState, useEffect, useCallback } from "react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { readFileContent } from "../../lib/tauri_api";
import {
  Clipboard,
  Check,
  SlidersHorizontal,
  History,
  FileSearch2,
} from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { buildPrompt } from "../../lib/prompt_builder";
import { useSettingsStore } from "../../store/settingsStore";
import type { EditFormat } from "../../types";
import { useReviewStore } from "../../store/reviewStore";
import { parseChangesFromMarkdown } from "../../lib/diff_parser";
import { usePromptStore } from "../../store/promptStore";
import { MetaPromptsManagerModal } from "./MetaPromptsManagerModal";
import { estimateTokens, formatTokenCount } from "../../lib/token_estimator";
import { Textarea } from "../common/Textarea";
import { MetaPromptSelector } from "./MetaPromptSelector";
import { motion } from "motion/react";

const editFormatOptions: { value: EditFormat; label: string }[] = [
  { value: "whole", label: "Whole File" },
  { value: "udiff", label: "Unified Diff" },
  { value: "diff-fenced", label: "Fenced Diff" },
];

const composerModeOptions: { value: "edit" | "qa"; label: string }[] = [
  { value: "edit", label: "Edit Mode" },
  { value: "qa", label: "QA Mode" },
];

export function PromptComposer() {
  const {
    instructions,
    setInstructions,
    markdownResponse,
    setMarkdownResponse,
    processedMarkdownResponse,
    markMarkdownAsProcessed,
    composerMode,
    setComposerMode,
  } = usePromptStore();
  const [isMetaPromptsManagerOpen, setIsMetaPromptsManagerOpen] =
    useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  const { selectedFilePaths, rootPath } = useWorkspaceStore();
  const { startReview, lastReview, reenterReview } = useReviewStore();
  const {
    customSystemPrompt,
    editFormat,
    setEditFormat,
    metaPrompts,
    autoReviewOnPaste,
  } = useSettingsStore();

  useEffect(() => {
    const calculate = async () => {
      if (!rootPath) {
        const prompt = buildPrompt(
          [],
          instructions,
          customSystemPrompt,
          editFormat,
          metaPrompts,
          composerMode
        );
        setEstimatedTokens(estimateTokens(prompt));
        return;
      }

      const files = [];
      if (selectedFilePaths.length > 0) {
        for (const path of selectedFilePaths) {
          try {
            const content = await readFileContent(path);
            const relativePath = path.replace(rootPath + "/", "");
            files.push({ path: relativePath, content });
          } catch (error) {
            console.error(
              `Failed to read file for token count ${path}:`,
              error
            );
            if (typeof error === "string" && error.includes("No such file")) {
              console.warn(
                `Removing non-existent file from selection: ${path}`
              );
              useWorkspaceStore.getState().removeSelectedFilePath(path);
            }
          }
        }
      }

      const fullPrompt = buildPrompt(
        files,
        instructions,
        customSystemPrompt,
        editFormat,
        metaPrompts,
        composerMode
      );
      setEstimatedTokens(estimateTokens(fullPrompt));
    };

    const handler = setTimeout(() => {
      calculate();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [
    selectedFilePaths,
    instructions,
    customSystemPrompt,
    editFormat,
    rootPath,
    metaPrompts,
    composerMode,
  ]);

  const generatePrompt = async () => {
    if (!rootPath) return;

    const files = [];
    for (const path of selectedFilePaths) {
      try {
        const content = await readFileContent(path);
        const relativePath = path.replace(rootPath + "/", "");
        files.push({ path: relativePath, content });
      } catch (error) {
        console.error(`Failed to read file ${path}:`, error);
      }
    }

    const fullPrompt = buildPrompt(
      files,
      instructions,
      customSystemPrompt,
      editFormat,
      metaPrompts,
      composerMode
    );
    await writeText(fullPrompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleReview = useCallback(async () => {
    if (!rootPath || composerMode === "qa") {
      return;
    }
    const currentMarkdownResponse = usePromptStore.getState().markdownResponse;
    if (!currentMarkdownResponse.trim()) {
      return;
    }

    const parsedChanges = parseChangesFromMarkdown(currentMarkdownResponse);
    if (parsedChanges.length === 0) {
      markMarkdownAsProcessed(); // Mark as processed even if no changes found
      return;
    }
    await startReview(parsedChanges);
    markMarkdownAsProcessed();
  }, [rootPath, startReview, markMarkdownAsProcessed, composerMode]);

  useEffect(() => {
    if (
      autoReviewOnPaste &&
      composerMode === "edit" &&
      markdownResponse.trim() &&
      markdownResponse !== processedMarkdownResponse &&
      rootPath
    ) {
      const timer = setTimeout(() => {
        handleReview();
      }, 500); // Debounce for 500ms
      return () => clearTimeout(timer);
    }
  }, [
    markdownResponse,
    processedMarkdownResponse,
    rootPath,
    autoReviewOnPaste,
    handleReview,
    composerMode,
  ]);

  const handleReenterReview = () => {
    reenterReview();
  };

  const hasUnprocessedResponse =
    markdownResponse.trim() !== "" &&
    markdownResponse !== processedMarkdownResponse;
  const canReenterReview = !hasUnprocessedResponse && !!lastReview;

  const responsePlaceholder =
    composerMode === "edit" && autoReviewOnPaste
      ? "Paste full markdown response from your LLM here to automatically start review..."
      : "Paste full markdown response from your LLM here. Click 'Review' to start.";

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800 overflow-y-auto">
      <div className="flex-grow flex flex-col min-h-0">
        <h2 className="font-bold mb-2">Compose Prompt</h2>

        <div className="mb-4">
          <label className="text-sm font-semibold mb-1 block">Mode</label>
          <div className="relative z-0 flex bg-gray-200 rounded-md p-0.5">
            {composerModeOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setComposerMode(value)}
                className={`relative flex-1 text-center text-xs px-2 py-1 font-medium transition-colors duration-200 ${
                  composerMode === value
                    ? "text-gray-900"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {composerMode === value && (
                  <motion.div
                    layoutId="composer-mode-slider"
                    className="absolute inset-0 bg-white shadow-sm rounded-md"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {composerMode === "edit" && (
          <div className="mb-4">
            <label className="text-sm font-semibold mb-1 block">
              Edit Format
            </label>
            <div className="relative z-0 flex bg-gray-200 rounded-md p-0.5">
              {editFormatOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setEditFormat(value)}
                  className={`relative flex-1 text-center text-xs px-2 py-1 font-medium transition-colors duration-200 ${
                    editFormat === value
                      ? "text-gray-900"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {editFormat === value && (
                    <motion.div
                      layoutId="edit-format-slider"
                      className="absolute inset-0 bg-white shadow-sm rounded-md"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {editFormat === "whole" && (
                <div>
                  <span className="font-semibold text-green-700">
                    Recommended:
                  </span>
                  <span> Universal and reliable, but can be verbose.</span>
                </div>
              )}
              {editFormat === "udiff" && (
                <div>
                  <span className="font-semibold text-yellow-700">
                    Experimental:
                  </span>
                  <span> Best for GPT models. </span>
                  <span> Use 'Whole File' for best results.</span>
                </div>
              )}
              {editFormat === "diff-fenced" && (
                <div>
                  <span className="font-semibold text-yellow-700">
                    Experimental:
                  </span>
                  <span> Best for Gemini models. </span>
                  <span> Use 'Whole File' for best results.</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold ">Meta Prompts</label>
            <button
              onClick={() => setIsMetaPromptsManagerOpen(true)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
              title="Manage Meta Prompts"
            >
              <SlidersHorizontal size={14} />
              Manage
            </button>
          </div>
          <MetaPromptSelector
            composerMode={composerMode}
            onManageRequest={() => setIsMetaPromptsManagerOpen(true)}
          />
        </div>

        <Textarea
          className="flex-grow mb-2"
          placeholder="Enter your refactoring instructions here..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
        <div className="text-right text-xs text-gray-500 mb-2">
          Estimated Tokens: ~{formatTokenCount(estimatedTokens)}
        </div>
        <button
          onClick={generatePrompt}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-md disabled:bg-gray-400"
          disabled={selectedFilePaths.length === 0 || !instructions}
        >
          {isCopied ? <Check size={16} /> : <Clipboard size={16} />}
          {isCopied ? "Copied!" : "Generate & Copy Prompt"}
        </button>
      </div>

      {composerMode === "edit" && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Paste Response & Review</h2>
            {hasUnprocessedResponse ? (
              <button
                onClick={handleReview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200 font-medium"
                title="Start review for the pasted response"
              >
                <FileSearch2 size={14} />
                <span>Review</span>
              </button>
            ) : canReenterReview ? (
              <button
                onClick={handleReenterReview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 font-medium"
                title="Go back to last review session"
              >
                <History size={14} />
                <span>Review</span>
              </button>
            ) : (
              <button
                onClick={handleReview}
                disabled={!markdownResponse.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium disabled:text-gray-500 disabled:hover:bg-gray-200 disabled:cursor-not-allowed"
                title="Start a new review for the pasted response"
              >
                <FileSearch2 size={14} />
                <span>Review</span>
              </button>
            )}
          </div>
          <Textarea
            className="h-24 mb-2"
            placeholder={responsePlaceholder}
            value={markdownResponse}
            onChange={(e) => setMarkdownResponse(e.target.value)}
          />
        </div>
      )}
      <MetaPromptsManagerModal
        isOpen={isMetaPromptsManagerOpen}
        onClose={() => setIsMetaPromptsManagerOpen(false)}
      />
    </div>
  );
}