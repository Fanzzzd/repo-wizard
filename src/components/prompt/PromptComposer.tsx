import { useState, useEffect, useCallback, useMemo } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useSettingsStore } from "../../store/settingsStore";
import { getRelativePath, readFileContent } from "../../lib/tauri_api";
import {
  Clipboard,
  Check,
  SlidersHorizontal,
  History,
  FileSearch2,
} from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { buildPrompt } from "../../lib/prompt_builder";
import type { EditFormat, MetaPrompt } from "../../types";
import { parseChangesFromMarkdown } from "../../lib/diff_parser";
import { MetaPromptsManagerModal } from "./MetaPromptsManagerModal";
import { estimateTokens, formatTokenCount } from "../../lib/token_estimator";
import { Button } from "../common/Button";
import { Textarea } from "../common/Textarea";
import { MetaPromptSelector } from "./MetaPromptSelector";
import { SegmentedControl } from "../common/SegmentedControl";

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
    instructions, setInstructions,
    markdownResponse, setMarkdownResponse,
    processedMarkdownResponse, markMarkdownAsProcessed,
    composerMode, setComposerMode,
    selectedFilePaths, rootPath, removeSelectedFilePath,
    startReview, lastReview, reenterReview,
    addPromptToHistory, enabledMetaPromptIds
  } = useProjectStore();
  
  const [isMetaPromptsManagerOpen, setIsMetaPromptsManagerOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  
  const { customSystemPrompt, editFormat, setEditFormat, metaPrompts: promptDefs, autoReviewOnPaste } = useSettingsStore();

  const metaPrompts = useMemo<MetaPrompt[]>(() => {
    return promptDefs.map(def => ({
        ...def,
        enabled: enabledMetaPromptIds.includes(def.id)
    }))
  }, [promptDefs, enabledMetaPromptIds]);

  const getFilesWithRelativePaths = useCallback(async (paths: string[], root: string) => {
    const files = await Promise.all(paths.map(async (path) => {
        try {
            const content = await readFileContent(path);
            const relativePath = await getRelativePath(path, root);
            return { path: relativePath, content };
        } catch (error) {
            console.error(`Failed to read file for prompt: ${path}`, error);
            if (typeof error === "string" && error.includes("No such file")) {
              console.warn(`Removing non-existent file from selection: ${path}`);
              removeSelectedFilePath(path);
            }
            return null;
        }
    }));
    return files.filter(f => f !== null) as {path: string, content: string}[];
  }, [removeSelectedFilePath]);

  useEffect(() => {
    const calculate = async () => {
      const prompt = buildPrompt(
        [],
        instructions,
        customSystemPrompt,
        editFormat,
        metaPrompts,
        composerMode
      );
      if (!rootPath) {
        setEstimatedTokens(estimateTokens(prompt));
        return;
      }

      const files = await getFilesWithRelativePaths(selectedFilePaths, rootPath);
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

    const handler = setTimeout(calculate, 300);
    return () => clearTimeout(handler);
  }, [selectedFilePaths, instructions, customSystemPrompt, editFormat, rootPath, metaPrompts, composerMode, getFilesWithRelativePaths]);

  const generatePrompt = async () => {
    if (!rootPath) return;

    const files = await getFilesWithRelativePaths(selectedFilePaths, rootPath);
    const fullPrompt = buildPrompt(files, instructions, customSystemPrompt, editFormat, metaPrompts, composerMode);
    await writeText(fullPrompt);
    addPromptToHistory(instructions);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleReview = useCallback(async () => {
    if (!rootPath || composerMode === "qa") return;
    const currentMarkdownResponse = useProjectStore.getState().markdownResponse;
    if (!currentMarkdownResponse.trim()) return;

    const parsedChanges = parseChangesFromMarkdown(currentMarkdownResponse);
    if (parsedChanges.length === 0) {
      markMarkdownAsProcessed();
      return;
    }
    await startReview(parsedChanges);
    markMarkdownAsProcessed();
  }, [rootPath, startReview, markMarkdownAsProcessed, composerMode]);

  useEffect(() => {
    if (autoReviewOnPaste && composerMode === "edit" && markdownResponse.trim() && markdownResponse !== processedMarkdownResponse && rootPath) {
      const timer = setTimeout(handleReview, 500);
      return () => clearTimeout(timer);
    }
  }, [markdownResponse, processedMarkdownResponse, rootPath, autoReviewOnPaste, handleReview, composerMode]);

  const hasUnprocessedResponse = markdownResponse.trim() !== "" && markdownResponse !== processedMarkdownResponse;
  const canReenterReview = !hasUnprocessedResponse && !!lastReview;
  const responsePlaceholder = composerMode === "edit" && autoReviewOnPaste ? "Paste response to auto-start review..." : "Paste response and click 'Review'.";

  const renderReviewButton = () => {
    if (hasUnprocessedResponse) {
      return <Button onClick={handleReview} size="sm" variant="ghost" className="bg-green-100 text-green-800 hover:bg-green-200" title="Start review" leftIcon={<FileSearch2 size={14} />}>Review</Button>;
    }
    if (canReenterReview) {
      return <Button onClick={reenterReview} size="sm" variant="ghost" className="bg-blue-100 text-blue-800 hover:bg-blue-200" title="Go back to last review" leftIcon={<History size={14} />}>Review</Button>;
    }
    return <Button onClick={handleReview} disabled={!markdownResponse.trim()} size="sm" variant="ghost" className="bg-gray-200 text-gray-800" title="Start a new review" leftIcon={<FileSearch2 size={14} />}>Review</Button>;
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800 overflow-y-auto">
      <div className="flex-grow flex flex-col min-h-0">
        <h2 className="font-bold mb-2">Compose Prompt</h2>

        <div className="mb-4">
          <label className="text-sm font-semibold mb-1 block">Mode</label>
          <SegmentedControl options={composerModeOptions} value={composerMode} onChange={setComposerMode} layoutId="composer-mode-slider" />
        </div>

        {composerMode === "edit" && (
          <div className="mb-4">
            <label className="text-sm font-semibold mb-1 block">Edit Format</label>
            <SegmentedControl options={editFormatOptions} value={editFormat} onChange={setEditFormat} layoutId="edit-format-slider" />
            <div className="text-xs text-gray-500 mt-1">
                {editFormat === "whole" && <><span className="font-semibold text-green-700">Recommended:</span> Universal and reliable.</>}
                {editFormat === "udiff" && <><span className="font-semibold text-yellow-700">Experimental:</span> Best for GPT models.</>}
                {editFormat === "diff-fenced" && <><span className="font-semibold text-yellow-700">Experimental:</span> Best for Gemini models.</>}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold">Meta Prompts</label>
            <Button onClick={() => setIsMetaPromptsManagerOpen(true)} variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" title="Manage Meta Prompts" leftIcon={<SlidersHorizontal size={14} />}>Manage</Button>
          </div>
          <MetaPromptSelector key={composerMode} composerMode={composerMode} onManageRequest={() => setIsMetaPromptsManagerOpen(true)} />
        </div>

        <Textarea className="flex-grow mb-2" placeholder="Enter your refactoring instructions here..." value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        <div className="text-right text-xs text-gray-500 mb-2">Estimated Tokens: ~{formatTokenCount(estimatedTokens)}</div>
        <Button onClick={generatePrompt} variant="primary" size="md" className="bg-indigo-600 hover:bg-indigo-500" disabled={selectedFilePaths.length === 0 || !instructions} leftIcon={isCopied ? <Check size={16} /> : <Clipboard size={16} />}>
          {isCopied ? "Copied!" : "Generate & Copy Prompt"}
        </Button>
      </div>

      {composerMode === "edit" && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Paste Response & Review</h2>
            {renderReviewButton()}
          </div>
          <Textarea className="h-24 mb-2" placeholder={responsePlaceholder} value={markdownResponse} onChange={(e) => setMarkdownResponse(e.target.value)} />
        </div>
      )}
      <MetaPromptsManagerModal isOpen={isMetaPromptsManagerOpen} onClose={() => setIsMetaPromptsManagerOpen(false)} />
    </div>
  );
}