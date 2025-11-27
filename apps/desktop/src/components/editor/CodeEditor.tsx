import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { showErrorDialog } from '../../lib/errorHandler';
import { readFileContent } from '../../services/tauriApi';
import { useReviewStore } from '../../store/reviewStore';
import { useWorkspaceStore } from '../../store/workspaceStore';

export function CodeEditor({ forceShowPath }: { forceShowPath?: string }) {
  const { activeFilePath } = useWorkspaceStore();
  const { isReviewing } = useReviewStore();
  const { resolvedTheme } = useTheme();
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
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-[#737373]">
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
        theme={resolvedTheme === 'dark' ? 'repo-wizard-dark' : 'vs'}
        options={{ readOnly: true, automaticLayout: true }}
      />
    </div>
  );
}
