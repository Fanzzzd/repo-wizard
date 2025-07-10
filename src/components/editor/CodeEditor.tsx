import Editor from "@monaco-editor/react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useReviewStore } from "../../store/reviewStore";
import { useEffect, useState } from "react";
import { readFileContent } from "../../services/tauriApi";
import { getLanguageForFilePath } from "../../lib/language_service";
import { showErrorDialog } from "../../lib/errorHandler";

export function CodeEditor() {
  const { activeFilePath } = useWorkspaceStore();
  const { isReviewing } = useReviewStore();
  const [content, setContent] = useState("");

  useEffect(() => {
    if (activeFilePath && !isReviewing) {
      readFileContent(activeFilePath).then(setContent).catch(showErrorDialog);
    } else {
      setContent("");
    }
  }, [activeFilePath, isReviewing]);

  if (!activeFilePath || isReviewing) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a file to view its content.
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      path={activeFilePath}
      value={content}
      language={getLanguageForFilePath(activeFilePath)}
      theme="vs"
      options={{ readOnly: true, automaticLayout: true }}
    />
  );
}