import { useCallback, useEffect } from 'react';
import { showErrorDialog } from '../lib/errorHandler';
import { useComposerStore } from '../store/composerStore';
import { useReviewStore } from '../store/reviewStore';
import { useSettingsStore } from '../store/settingsStore';

export function useReviewSession() {
  const {
    startReview,
    endReview,
    reenterReview,
    applyAllPendingChanges,
    revertAllAppliedChanges,
    lastReview,
    isReviewing,
  } = useReviewStore();
  const {
    markdownResponse,
    composerMode,
    processedMarkdownResponse,
    markMarkdownAsProcessed,
  } = useComposerStore();
  const { autoReviewOnPaste } = useSettingsStore();

  const handleReview = useCallback(async () => {
    if (composerMode === 'qa') return;
    const currentMarkdownResponse =
      useComposerStore.getState().markdownResponse;
    if (!currentMarkdownResponse.trim()) return;

    try {
      await startReview(currentMarkdownResponse);
    } catch (e) {
      showErrorDialog(e);
    } finally {
      markMarkdownAsProcessed();
    }
  }, [startReview, markMarkdownAsProcessed, composerMode]);

  useEffect(() => {
    if (
      autoReviewOnPaste &&
      composerMode === 'edit' &&
      markdownResponse.trim() &&
      markdownResponse !== processedMarkdownResponse
    ) {
      const timer = setTimeout(handleReview, 500);
      return () => clearTimeout(timer);
    }
  }, [
    markdownResponse,
    processedMarkdownResponse,
    autoReviewOnPaste,
    handleReview,
    composerMode,
  ]);

  const hasUnprocessedResponse =
    markdownResponse.trim() !== '' &&
    markdownResponse !== processedMarkdownResponse;
  const canReenterReview = !hasUnprocessedResponse && !!lastReview;

  return {
    startReview: handleReview,
    endReview,
    reenterReview,
    applyAll: applyAllPendingChanges,
    revertAll: revertAllAppliedChanges,
    isReviewing,
    hasUnprocessedResponse,
    canReenterReview,
  };
}
