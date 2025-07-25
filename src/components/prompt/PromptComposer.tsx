import { useState, useEffect } from 'react';
import { useComposerStore } from '../../store/composerStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useReviewStore } from '../../store/reviewStore';
import { usePromptGenerator } from '../../hooks/usePromptGenerator';
import { useReviewSession } from '../../hooks/useReviewSession';
import { useUndo } from '../../hooks/useUndo';
import {
  Clipboard,
  Check,
  SlidersHorizontal,
  History,
  FileSearch2,
  RefreshCw,
} from 'lucide-react';
import type { ComposerMode, EditFormat } from '../../types';
import { MetaPromptsManagerModal } from './MetaPromptsManagerModal';
import { formatTokenCount } from '../../lib/token_estimator';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { MetaPromptSelector } from './MetaPromptSelector';
import { SegmentedControl } from '../common/SegmentedControl';

const editFormatOptions: { value: EditFormat; label: string }[] = [
  { value: 'whole', label: 'Whole File' },
  { value: 'diff', label: 'Diff' },
];

const composerModeOptions: { value: ComposerMode; label: string }[] = [
  { value: 'edit', label: 'Edit Mode' },
  { value: 'qa', label: 'QA Mode' },
];

export function PromptComposer() {
  const {
    instructions: storeInstructions,
    setInstructions: setStoreInstructions,
    markdownResponse: storeMarkdownResponse,
    setMarkdownResponse: setStoreMarkdownResponse,
    composerMode,
    setComposerMode,
  } = useComposerStore();
  const { selectedFilePaths } = useWorkspaceStore();
  const { clearReviewSession } = useReviewStore();

  const [isMetaPromptsManagerOpen, setIsMetaPromptsManagerOpen] =
    useState(false);

  const { editFormat, setEditFormat, autoReviewOnPaste } = useSettingsStore();

  const { estimatedTokens, generateAndCopyPrompt, isCopied, isGenerating } =
    usePromptGenerator();
  const {
    startReview,
    reenterReview,
    hasUnprocessedResponse,
    canReenterReview,
  } = useReviewSession();

  const [
    instructions,
    {
      set: setInstructions,
      undo: undoInstructions,
      redo: redoInstructions,
      reset: resetInstructions,
    },
  ] = useUndo(storeInstructions);

  const [
    markdownResponse,
    {
      set: setMarkdownResponse,
      undo: undoMarkdownResponse,
      redo: redoMarkdownResponse,
      reset: resetMarkdownResponse,
    },
  ] = useUndo(storeMarkdownResponse);

  // Sync local -> global
  useEffect(() => {
    if (storeInstructions !== instructions) {
      setStoreInstructions(instructions);
    }
  }, [instructions, storeInstructions, setStoreInstructions]);

  // Sync global -> local
  useEffect(() => {
    if (storeInstructions !== instructions) {
      resetInstructions(storeInstructions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeInstructions]);

  // Sync local -> global
  useEffect(() => {
    if (storeMarkdownResponse !== markdownResponse) {
      setStoreMarkdownResponse(markdownResponse);
    }
  }, [markdownResponse, storeMarkdownResponse, setStoreMarkdownResponse]);

  // Sync global -> local
  useEffect(() => {
    if (storeMarkdownResponse !== markdownResponse) {
      resetMarkdownResponse(storeMarkdownResponse);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeMarkdownResponse]);

  const responsePlaceholder =
    composerMode === 'edit' && autoReviewOnPaste
      ? 'Paste response to auto-start review...'
      : "Paste response and click 'Review'.";

  const handleResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdownResponse(e.target.value);
    clearReviewSession();
  };

  const renderReviewButton = () => {
    if (hasUnprocessedResponse) {
      return (
        <Button
          onClick={startReview}
          size="sm"
          variant="ghost"
          className="bg-green-100 text-green-800 hover:bg-green-200"
          title="Start review"
          leftIcon={<FileSearch2 size={14} />}
        >
          Review
        </Button>
      );
    }
    if (canReenterReview) {
      return (
        <Button
          onClick={reenterReview}
          size="sm"
          variant="ghost"
          className="bg-blue-100 text-blue-800 hover:bg-blue-200"
          title="Go back to last review"
          leftIcon={<History size={14} />}
        >
          Review
        </Button>
      );
    }
    return (
      <Button
        onClick={startReview}
        disabled={!markdownResponse.trim()}
        size="sm"
        variant="ghost"
        className="bg-gray-200 text-gray-800"
        title="Start a new review"
        leftIcon={<FileSearch2 size={14} />}
      >
        Review
      </Button>
    );
  };

  const renderGenerateButtonContent = () => {
    if (isGenerating) {
      return {
        icon: <RefreshCw size={16} className="animate-spin" />,
        text: 'Generating...',
      };
    }
    if (isCopied) {
      return { icon: <Check size={16} />, text: 'Copied!' };
    }
    return { icon: <Clipboard size={16} />, text: 'Generate & Copy Prompt' };
  };
  const { icon: generateIcon, text: generateText } =
    renderGenerateButtonContent();

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800 overflow-y-auto">
      <div className="flex-grow flex flex-col min-h-0">
        <h2 className="font-bold mb-2">Compose Prompt</h2>

        <div className="mb-4">
          <label className="text-sm font-semibold mb-1 block">Mode</label>
          <SegmentedControl
            options={composerModeOptions}
            value={composerMode}
            onChange={setComposerMode}
            layoutId="composer-mode-slider"
          />
        </div>

        {composerMode === 'edit' && (
          <div className="mb-4">
            <label className="text-sm font-semibold mb-1 block">
              Edit Format
            </label>
            <SegmentedControl
              options={editFormatOptions}
              value={editFormat}
              onChange={setEditFormat}
              layoutId="edit-format-slider"
            />
            <div className="text-xs text-gray-500 mt-1">
              {editFormat === 'whole' && (
                <>
                  <span className="font-semibold text-green-700">
                    Recommended:
                  </span>{' '}
                  Universal and reliable.
                </>
              )}
              {editFormat === 'diff' && (
                <>
                  <span className="font-semibold text-yellow-700">
                    Experimental:
                  </span>{' '}
                  Best for models supporting search/replace blocks.
                </>
              )}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold">Meta Prompts</label>
            <Button
              onClick={() => setIsMetaPromptsManagerOpen(true)}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-800"
              title="Manage Meta Prompts"
              leftIcon={<SlidersHorizontal size={14} />}
            >
              Manage
            </Button>
          </div>
          <MetaPromptSelector
            key={composerMode}
            composerMode={composerMode}
            onManageRequest={() => setIsMetaPromptsManagerOpen(true)}
          />
        </div>

        <Textarea
          className="flex-grow mb-2"
          placeholder="Enter your refactoring instructions here..."
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          onUndo={undoInstructions}
          onRedo={redoInstructions}
        />
        <div className="text-right text-xs text-gray-500 mb-2">
          Estimated Tokens: ~{formatTokenCount(estimatedTokens)}
        </div>
        <Button
          onClick={() => generateAndCopyPrompt()}
          variant="primary"
          size="md"
          className="bg-indigo-600 hover:bg-indigo-500"
          disabled={
            selectedFilePaths.length === 0 || !instructions || isGenerating
          }
          leftIcon={generateIcon}
        >
          {generateText}
        </Button>
      </div>

      {composerMode === 'edit' && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Paste Response & Review</h2>
            {renderReviewButton()}
          </div>
          <Textarea
            className="h-24 mb-2"
            placeholder={responsePlaceholder}
            value={markdownResponse}
            onChange={handleResponseChange}
            onUndo={undoMarkdownResponse}
            onRedo={redoMarkdownResponse}
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
