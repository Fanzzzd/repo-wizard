import Editor from "@monaco-editor/react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useEffect, useState } from "react";
import { readFileContent } from "../../lib/tauri_api";
import { useReviewStore } from "../../store/reviewStore";

export function CodeEditor() {
  const { activeFilePath } = useWorkspaceStore();
  const { isReviewing } = useReviewStore();
  const [content, setContent] = useState("");

  useEffect(() => {
    if (activeFilePath && !isReviewing) {
      readFileContent(activeFilePath).then(setContent).catch(console.error);
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
      theme="vs"
      options={{ readOnly: true, automaticLayout: true }}
    />
  );
}