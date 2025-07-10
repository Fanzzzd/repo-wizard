import { useState, useEffect, useCallback, useMemo } from "react";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useComposerStore } from "../store/composerStore";
import { useHistoryStore } from "../store/historyStore";
import { useSettingsStore } from "../store/settingsStore";
import { getRelativePath, readFileContent } from "../services/tauriApi";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { buildPrompt } from "../lib/prompt_builder";
import { estimateTokens } from "../lib/token_estimator";
import type { MetaPrompt } from "../types";
import { showErrorDialog } from "../lib/errorHandler";
import { AppError } from "../lib/error";

export function usePromptGenerator() {
  const { selectedFilePaths, rootPath, removeSelectedFilePath } = useWorkspaceStore();
  const { instructions, composerMode, enabledMetaPromptIds } = useComposerStore();
  const { addPromptToHistory } = useHistoryStore();
  const { customSystemPrompt, editFormat, metaPrompts: promptDefs } = useSettingsStore();

  const [isCopied, setIsCopied] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  const metaPrompts = useMemo<MetaPrompt[]>(() => {
    return promptDefs.map((def) => ({
      ...def,
      enabled: enabledMetaPromptIds.includes(def.id),
    }));
  }, [promptDefs, enabledMetaPromptIds]);

  const getFilesWithRelativePaths = useCallback(async (paths: string[], root: string) => {
    const files = await Promise.all(paths.map(async (path) => {
      try {
        const content = await readFileContent(path);
        const relativePath = await getRelativePath(path, root);
        return { path: relativePath, content };
      } catch (error) {
        showErrorDialog(new AppError(`Failed to read file for prompt: ${path}`, error));
        if (typeof error === "string" && (error.includes("No such file") || error.includes("The system cannot find the file specified"))) {
          console.warn(`Removing non-existent file from selection: ${path}`);
          removeSelectedFilePath(path);
        }
        return null;
      }
    }));
    return files.filter((f): f is { path: string; content: string } => f !== null);
  }, [removeSelectedFilePath]);

  useEffect(() => {
    const calculate = async () => {
      const prompt = buildPrompt([], instructions, customSystemPrompt, editFormat, metaPrompts, composerMode);
      if (!rootPath) {
        setEstimatedTokens(estimateTokens(prompt));
        return;
      }
      const files = await getFilesWithRelativePaths(selectedFilePaths, rootPath);
      const fullPrompt = buildPrompt(files, instructions, customSystemPrompt, editFormat, metaPrompts, composerMode);
      setEstimatedTokens(estimateTokens(fullPrompt));
    };
    const handler = setTimeout(calculate, 300);
    return () => clearTimeout(handler);
  }, [selectedFilePaths, instructions, customSystemPrompt, editFormat, rootPath, metaPrompts, composerMode, getFilesWithRelativePaths]);

  const generateAndCopyPrompt = async () => {
    if (!rootPath) return;
    const files = await getFilesWithRelativePaths(selectedFilePaths, rootPath);
    const fullPrompt = buildPrompt(files, instructions, customSystemPrompt, editFormat, metaPrompts, composerMode);
    await writeText(fullPrompt);
    addPromptToHistory(instructions);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return { estimatedTokens, generateAndCopyPrompt, isCopied, getFilesWithRelativePaths };
}