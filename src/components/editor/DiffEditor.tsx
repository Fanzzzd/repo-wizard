import { DiffEditor as MonacoDiffEditor } from "@monaco-editor/react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useReviewStore } from "../../store/reviewStore";
import { useEffect, useState } from "react";
import { readFileContent } from "../../services/tauriApi";
import { getLanguageForFilePath } from "../../lib/language_service";
import { showErrorDialog } from "../../lib/errorHandler";

export function DiffEditor() {
  const { rootPath } = useWorkspaceStore();
  const { changes, activeChangeId } = useReviewStore();

  const [originalContent, setOriginalContent] = useState("");
  const [modifiedContent, setModifiedContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | undefined>(undefined);

  const activeChange = changes.find((c) => c.id === activeChangeId);

  useEffect(() => {
    setMessage(null);
    setOriginalContent("");
    setModifiedContent("");
    setLanguage(undefined);

    if (!activeChange || !rootPath) return;

    const { operation } = activeChange;

    let filePathForLanguage: string | undefined;
    switch (operation.type) {
      case "modify":
      case "rewrite":
      case "delete":
        filePathForLanguage = operation.filePath;
        break;
      case "move":
        filePathForLanguage = operation.toPath;
        break;
    }

    if (filePathForLanguage) {
      setLanguage(getLanguageForFilePath(filePathForLanguage));
    }

    if (operation.type === 'delete' || operation.type === 'move') {
      let msg = `This change is a ${operation.type} operation.`;
      if(operation.type === 'delete') msg += `\nFile to be deleted: ${operation.filePath}`;
      if(operation.type === 'move') msg += `\nMoving from: ${operation.fromPath}\nMoving to: ${operation.toPath}`;
      setMessage(msg);
      return;
    }
    
    const absolutePath = `${rootPath}/${operation.filePath}`;
    
    setModifiedContent(operation.content);

    if (operation.isNewFile) {
      setOriginalContent("");
    } else {
       readFileContent(absolutePath)
        .then(setOriginalContent)
        .catch((err) => {
          showErrorDialog(err);
          const errorMessage = `// Could not load file: ${absolutePath}`;
          setOriginalContent(errorMessage);
        });
    }
  }, [activeChange, rootPath]);

  if (!activeChange) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a change to review.
      </div>
    );
  }

  if (message) {
     return (
      <div className="flex items-center justify-center h-full text-gray-400 p-4 whitespace-pre-wrap">
        {message}
      </div>
    );
  }

  return (
    <MonacoDiffEditor
      height="100%"
      language={language}
      original={originalContent}
      modified={modifiedContent}
      theme="vs"
      options={{
        readOnly: true,
        renderSideBySide: true,
        minimap: { enabled: false },
        renderSideBySideInlineBreakpoint: 200,
        showUnused: false,
        diffAlgorithm: "advanced"
      }}
    />
  );
}