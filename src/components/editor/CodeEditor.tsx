import Editor from "@monaco-editor/react";
import { useProjectStore } from "../../store/projectStore";
import { useEffect, useState } from "react";
import { readFileContent } from "../../lib/tauri_api";
import { getLanguageForFilePath } from "../../lib/language_service";

export function CodeEditor() {
  const { activeFilePath, isReviewing } = useProjectStore();
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
      language={getLanguageForFilePath(activeFilePath)}
      theme="vs"
      options={{ readOnly: true, automaticLayout: true }}
    />
  );
}