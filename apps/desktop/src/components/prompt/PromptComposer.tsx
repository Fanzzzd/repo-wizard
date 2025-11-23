import { readText } from '@tauri-apps/plugin-clipboard-manager';
import {
  Check,
  Clipboard,
  ClipboardCheck,
  FileSearch2,
  History,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { usePromptGenerator } from '../../hooks/usePromptGenerator';
import { useReviewSession } from '../../hooks/useReviewSession';
import { showErrorDialog } from '../../lib/errorHandler';
import { formatTokenCount } from '../../lib/token_estimator';
import { cn } from '../../lib/utils';
import { useComposerStore } from '../../store/composerStore';
import { useReviewStore } from '../../store/reviewStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { ComposerMode, EditFormat } from '../../types';
import { Button } from '../common/Button';
import { ResponsiveButtonGroup } from '../common/ResponsiveButtonGroup';
import { SegmentedControl } from '../common/SegmentedControl';
import { Textarea } from '../common/Textarea';
import { MetaPromptSelector } from './MetaPromptSelector';
import { MetaPromptsManagerModal } from './MetaPromptsManagerModal';

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
    instructions,
    setInstructions,
    undoInstructions,
    redoInstructions,
    markdownResponse,
    setMarkdownResponse,
    undoMarkdownResponse,
    redoMarkdownResponse,
    composerMode,
    setComposerMode,
    markMarkdownAsProcessed,
  } = useComposerStore();
  const { selectedFilePaths } = useWorkspaceStore();
  const { clearReviewSession, startReview: startReviewInStore } =
    useReviewStore();

  const [isMetaPromptsManagerOpen, setIsMetaPromptsManagerOpen] =
    useState(false);

  const {
    editFormat,
    setEditFormat,
    autoReviewOnPaste,
    showPasteResponseArea,
  } = useSettingsStore();

  const { estimatedTokens, generateAndCopyPrompt, isCopied, isGenerating } =
    usePromptGenerator();
  const {
    startReview,
    reenterReview,
    hasUnprocessedResponse,
    canReenterReview,
  } = useReviewSession();

  const handlePasteAndReview = async () => {
    try {
      const clipboardText = await readText();
      if (clipboardText?.trim()) {
        setMarkdownResponse(clipboardText);
        await startReviewInStore(clipboardText);
        markMarkdownAsProcessed();
      }
    } catch (e) {
      showErrorDialog(e);
    }
  };

  const responsePlaceholder =
    composerMode === 'edit' && autoReviewOnPaste
      ? 'Paste response to auto-start review...'
      : "Paste response and click 'Review'.";

  const handleResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdownResponse(e.target.value);
    clearReviewSession();
  };

  const getReviewButtonProps = () => {
    const iconSize = 16;
    let props: {
      onClick: () => void;
      className: string;
      title: string;
      icon: React.ReactNode;
      text: string;
      disabled?: boolean;
    };

    if (hasUnprocessedResponse) {
      props = {
        onClick: startReview,
        className:
          'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30',
        title: 'Start review',
        icon: <FileSearch2 size={iconSize} />,
        text: 'Review',
      };
    } else if (canReenterReview) {
      props = {
        onClick: reenterReview,
        className:
          'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30',
        title: 'Go back to last review',
        icon: <History size={iconSize} />,
        text: 'Review',
      };
    } else {
      props = {
        onClick: startReview,
        className:
          'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        title: 'Start a new review',
        icon: <FileSearch2 size={iconSize} />,
        text: 'Review',
        disabled: !markdownResponse.trim(),
      };
    }

    const { text, icon, ...rest } = props;
    return { text, icon, ...rest, variant: 'ghost' as const };
  };

  const reviewButtonProps = getReviewButtonProps();
  const pasteButtonProps = {
    onClick: handlePasteAndReview,
    variant: 'ghost' as const,
    className:
      'text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30',
    icon: <ClipboardCheck size={16} />,
    text: 'From Clipboard',
    title: 'Paste from clipboard and start review',
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

  const shouldShowReviewSection = composerMode === 'edit';

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 overflow-y-auto">
      <div className="flex-grow flex flex-col min-h-0">
        <h2 className="font-bold mb-2">Compose Prompt</h2>

        <div className="mb-4">
          <div className="text-sm font-semibold mb-1 block dark:text-gray-300">
            Mode
          </div>
          <SegmentedControl
            options={composerModeOptions}
            value={composerMode}
            onChange={setComposerMode}
            layoutId="composer-mode-slider"
          />
        </div>

        {composerMode === 'edit' && (
          <div className="mb-4">
            <div className="text-sm font-semibold mb-1 block dark:text-gray-300">
              Edit Format
            </div>
            <SegmentedControl
              options={editFormatOptions}
              value={editFormat}
              onChange={setEditFormat}
              layoutId="edit-format-slider"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {editFormat === 'whole' && (
                <>
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    Recommended:
                  </span>{' '}
                  Universal and reliable.
                </>
              )}
              {editFormat === 'diff' && (
                <>
                  <span className="font-semibold text-yellow-700 dark:text-yellow-400">
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
            <div className="text-sm font-semibold dark:text-gray-300">
              Meta Prompts
            </div>
            <Button
              onClick={() => setIsMetaPromptsManagerOpen(true)}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
          onChange={(e) => setInstructions(e.target.value)}
          onUndo={undoInstructions}
          onRedo={redoInstructions}
        />
        <div className="text-right text-xs text-gray-500 dark:text-gray-400 mb-2">
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

      {shouldShowReviewSection && (
        <div
          className={cn(
            'flex flex-col space-y-2',
            showPasteResponseArea
              ? 'mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'
              : 'mt-4'
          )}
        >
          {showPasteResponseArea ? (
            <>
              <h2 className="font-bold">Review Response</h2>
              <Textarea
                className="h-24"
                placeholder={responsePlaceholder}
                value={markdownResponse}
                onChange={handleResponseChange}
                onUndo={undoMarkdownResponse}
                onRedo={redoMarkdownResponse}
              />
              <ResponsiveButtonGroup
                button1={pasteButtonProps}
                button2={reviewButtonProps}
              />
            </>
          ) : (
            <>
              <Button
                onClick={handlePasteAndReview}
                variant="primary"
                size="md"
                className="w-full bg-purple-600 hover:bg-purple-500"
                leftIcon={<ClipboardCheck size={16} />}
              >
                Paste & Review from Clipboard
              </Button>
              {canReenterReview && (
                <Button
                  onClick={reenterReview}
                  size="md"
                  variant="secondary"
                  className="w-full"
                  leftIcon={<History size={16} />}
                >
                  Re-enter Last Review
                </Button>
              )}
            </>
          )}
        </div>
      )}
      <MetaPromptsManagerModal
        isOpen={isMetaPromptsManagerOpen}
        onClose={() => setIsMetaPromptsManagerOpen(false)}
      />
    </div>
  );
}
