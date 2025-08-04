import Editor from '@monaco-editor/react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useReviewStore } from '../../store/reviewStore';
import { useEffect, useState } from 'react';
import { readFileContent } from '../../services/tauriApi';
import { getLanguageForFilePath } from '../../lib/language_service';
import { showErrorDialog } from '../../lib/errorHandler';
import { useSettingsStore } from '../../store/settingsStore';

export function CodeEditor({ forceShowPath }: { forceShowPath?: string }) {
  const { activeFilePath } = useWorkspaceStore();
  const { isReviewing } = useReviewStore();
  const { theme } = useSettingsStore();
  const [content, setContent] = useState('');

  const pathToShow = forceShowPath ?? activeFilePath;
  const shouldShow = !!pathToShow && (!isReviewing || !!forceShowPath);

  useEffect(() => {
    if (shouldShow && pathToShow) {
      readFileContent(pathToShow).then(setContent).catch(showErrorDialog);
    } else {
      setContent('');
    }
  }, [pathToShow, shouldShow]);

  if (!shouldShow || !pathToShow) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
        Select a file to view its content.
      </div>
    );
  }

  return (
    <div className="h-full w-full select-text">
      <Editor
        height="100%"
        path={pathToShow}
        value={content}
        language={getLanguageForFilePath(pathToShow)}
        theme={theme === 'dark' ? 'repo-wizard-dark' : 'vs'}
        options={{ readOnly: true, automaticLayout: true }}
      />
    </div>
  );
}