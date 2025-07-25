import Editor from '@monaco-editor/react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useReviewStore } from '../../store/reviewStore';
import { useEffect, useState } from 'react';
import { readFileContent } from '../../services/tauriApi';
import { getLanguageForFilePath } from '../../lib/language_service';
import { showErrorDialog } from '../../lib/errorHandler';

export function CodeEditor({ forceShowPath }: { forceShowPath?: string }) {
  const { activeFilePath } = useWorkspaceStore();
  const { isReviewing } = useReviewStore();
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
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a file to view its content.
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      path={pathToShow}
      value={content}
      language={getLanguageForFilePath(pathToShow)}
      theme="vs"
      options={{ readOnly: true, automaticLayout: true }}
    />
  );
}
