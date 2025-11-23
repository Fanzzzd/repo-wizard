import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppError, isFileNotFoundError } from '../lib/error';
import { showErrorDialog } from '../lib/errorHandler';
import { buildPrompt } from '../lib/prompt_builder';
import { estimateTokens } from '../lib/token_estimator';
import {
  getRelativePath,
  isBinaryFile,
  readFileContent,
} from '../services/tauriApi';
import {
  isCommandRunnerCancelled,
  openCommandRunner,
} from '../store/commandRunnerStore';
import { useComposerStore } from '../store/composerStore';
import { useHistoryStore } from '../store/historyStore';
import { useSettingsStore } from '../store/settingsStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { MetaPrompt } from '../types';

export function usePromptGenerator() {
  const { selectedFilePaths, rootPath, removeSelectedFilePath, fileTree } =
    useWorkspaceStore();
  const { instructions, composerMode, enabledMetaPromptIds } =
    useComposerStore();
  const { addPromptToHistory } = useHistoryStore();
  const {
    customSystemPrompt,
    editFormat,
    metaPrompts: promptDefs,
  } = useSettingsStore();

  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  const metaPrompts = useMemo<MetaPrompt[]>(() => {
    return promptDefs.map((def) => ({
      ...def,
      enabled: enabledMetaPromptIds.includes(def.id),
    }));
  }, [promptDefs, enabledMetaPromptIds]);

  const getFilesWithRelativePaths = useCallback(
    async (paths: string[], root: string) => {
      const isBinaryResults = await Promise.all(paths.map(isBinaryFile));
      const textFilePaths = paths.filter((_, i) => !isBinaryResults[i]);

      const files = await Promise.all(
        textFilePaths.map(async (path) => {
          try {
            const content = await readFileContent(path);
            const relativePath = await getRelativePath(path, root);
            return { path: relativePath, content };
          } catch (error) {
            if (isFileNotFoundError(error)) {
              console.warn(`File not found, removing from selection: ${path}`);
              removeSelectedFilePath(path);
              return null;
            }
            showErrorDialog(
              new AppError(`Failed to read file for prompt: ${path}`, error)
            );
            return null;
          }
        })
      );
      return files.filter(
        (f): f is { path: string; content: string } => f !== null
      );
    },
    [removeSelectedFilePath]
  );

  useEffect(() => {
    const calculate = async () => {
      const files = rootPath
        ? await getFilesWithRelativePaths(selectedFilePaths, rootPath)
        : [];
      const { fullPrompt } = await buildPrompt({
        files,
        instructions,
        customSystemPrompt,
        editFormat,
        metaPrompts,
        composerMode,
        fileTree,
        rootPath,
        options: { dryRun: true },
      });
      setEstimatedTokens(estimateTokens(fullPrompt));
    };
    const handler = setTimeout(calculate, 300);
    return () => clearTimeout(handler);
  }, [
    selectedFilePaths,
    instructions,
    customSystemPrompt,
    editFormat,
    rootPath,
    metaPrompts,
    composerMode,
    getFilesWithRelativePaths,
    fileTree,
  ]);

  const generateAndCopyPrompt = async (
    instructionsOverride?: string
  ): Promise<boolean> => {
    if (!rootPath || isGenerating) return false;

    setIsGenerating(true);
    const finalInstructions = instructionsOverride ?? instructions;

    try {
      const files = await getFilesWithRelativePaths(
        selectedFilePaths,
        rootPath
      );

      const { fullPrompt, terminalCommandToRun } = await buildPrompt({
        files,
        instructions: finalInstructions,
        customSystemPrompt,
        editFormat,
        metaPrompts,
        composerMode,
        fileTree,
        rootPath,
      });

      let promptToCopy = fullPrompt;

      if (terminalCommandToRun) {
        try {
          const terminalOutput = await openCommandRunner(terminalCommandToRun);
          promptToCopy = fullPrompt.replace(
            '{TERMINAL_COMMAND_OUTPUT}',
            terminalOutput
          );
        } catch (error) {
          if (isCommandRunnerCancelled(error)) {
            console.log('Command runner was closed by the user.');
            return false;
          }
          throw error;
        }
      }

      await writeText(promptToCopy);
      if (!instructionsOverride) {
        addPromptToHistory(finalInstructions);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      return true;
    } catch (e) {
      showErrorDialog(e);
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    estimatedTokens,
    generateAndCopyPrompt,
    isCopied,
    isGenerating,
    getFilesWithRelativePaths,
  };
}
