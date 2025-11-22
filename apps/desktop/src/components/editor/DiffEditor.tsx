import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useReviewStore } from '../../store/reviewStore';
import { useEffect, useState } from 'react';
import { readFileContent } from '../../services/tauriApi';
import { showErrorDialog } from '../../lib/errorHandler';
import { useTheme } from 'next-themes';

export function DiffEditor() {
  const { rootPath } = useWorkspaceStore();
  const { changes, activeChangeId } = useReviewStore();
  const { resolvedTheme } = useTheme();

  const [originalContent, setOriginalContent] = useState('');
  const [modifiedContent, setModifiedContent] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const activeChange = changes.find(c => c.id === activeChangeId);

  useEffect(() => {
    setMessage(null);
    setOriginalContent('');
    setModifiedContent('');

    if (!activeChange || !rootPath) return;

    const { operation } = activeChange;

    if (operation.type === 'delete' || operation.type === 'move') {
      let msg = `This change is a ${operation.type} operation.`;
      if (operation.type === 'delete')
        msg += `\nFile to be deleted: ${operation.filePath}`;
      if (operation.type === 'move')
        msg += `\nMoving from: ${operation.fromPath}\nMoving to: ${operation.toPath}`;
      setMessage(msg);
      return;
    }

    const absolutePath = `${rootPath}/${operation.filePath}`;

    setModifiedContent(operation.content);

    if (operation.isNewFile) {
      setOriginalContent('');
    } else {
      readFileContent(absolutePath)
        .then(setOriginalContent)
        .catch(err => {
          showErrorDialog(err);
          const errorMessage = `// Could not load file: ${absolutePath}`;
          setOriginalContent(errorMessage);
        });
    }
  }, [activeChange, rootPath]);

  if (!activeChange) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
        Select a change to review.
      </div>
    );
  }

  if (message) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 p-4 whitespace-pre-wrap select-text dark:text-gray-500">
        {message}
      </div>
    );
  }

  return (
    <div className="h-full w-full select-text">
      <MonacoDiffEditor
        height="100%"
        original={originalContent}
        modified={modifiedContent}
        theme={resolvedTheme === 'dark' ? 'repo-wizard-dark' : 'vs'}
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          renderSideBySideInlineBreakpoint: 200,
          showUnused: false,
          diffAlgorithm: 'advanced',
        }}
      />
    </div>
  );
}