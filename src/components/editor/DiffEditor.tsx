import { DiffEditor as MonacoDiffEditor } from "@monaco-editor/react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useReviewStore } from "../../store/reviewStore";
import { useEffect, useState } from "react";
import { readFileContent } from "../../lib/tauri_api";
import { applyPatch } from "diff";

export function DiffEditor() {
  const { rootPath } = useWorkspaceStore();
  const { changes, activeChangeId } = useReviewStore();

  const [originalContent, setOriginalContent] = useState("");
  const [modifiedContent, setModifiedContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const activeChange = changes.find((c) => c.id === activeChangeId);

  useEffect(() => {
    setMessage(null);
    setOriginalContent("");
    setModifiedContent("");

    if (!activeChange || !rootPath) return;

    const { operation } = activeChange;

    if (operation.type === 'delete' || operation.type === 'move') {
      let msg = `This change is a ${operation.type} operation.`;
      if(operation.type === 'delete') msg += `\nFile to be deleted: ${operation.filePath}`;
      if(operation.type === 'move') msg += `\nMoving from: ${operation.fromPath}\nMoving to: ${operation.toPath}`;
      setMessage(msg);
      return;
    }
    
    const absolutePath = `${rootPath}/${operation.filePath}`;
    
    if (operation.type === 'rewrite') {
      setModifiedContent(operation.content);
      readFileContent(absolutePath)
        .then(setOriginalContent)
        .catch(() => setOriginalContent(`// File does not exist, will be created.`));
      return;
    }

    // Handle 'modify' operation
    const applyDiff = (original: string) => {
      try {
        const patched = applyPatch(original, operation.diff);
        if (patched === false) {
          throw new Error("Patch application returned false.");
        }
        setModifiedContent(patched);
      } catch (err) {
        console.error("Failed to apply patch for", operation.filePath, err);
        setModifiedContent(`// Error: Failed to apply patch.\n\n${err}`);
      }
    };

    if (operation.isNewFile) {
      setOriginalContent("");
      applyDiff("");
    } else {
      readFileContent(absolutePath)
        .then((content) => {
          setOriginalContent(content);
          applyDiff(content);
        })
        .catch((err) => {
          console.error(err);
          const errorMessage = `// Could not load file: ${absolutePath}`;
          setOriginalContent(errorMessage);
          setModifiedContent(errorMessage);
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
      language="typescript" // This could be dynamic based on file type in future
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