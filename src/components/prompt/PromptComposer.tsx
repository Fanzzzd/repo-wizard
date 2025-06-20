import { useState } from "react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { readFileContent } from "../../lib/tauri_api";
import { Clipboard, ChevronDown, ChevronUp } from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { buildAiderStylePrompt } from "../../lib/prompt_builder";
import { useSettingsStore } from "../../store/settingsStore";

export function PromptComposer() {
  const [instructions, setInstructions] = useState("");
  const [isSystemPromptVisible, setIsSystemPromptVisible] = useState(false);
  const { selectedFilePaths, rootPath } = useWorkspaceStore();
  const { customSystemPrompt, setCustomSystemPrompt } = useSettingsStore();

  const generatePrompt = async () => {
    if (!rootPath) return;

    const files = [];
    for (const path of selectedFilePaths) {
      try {
        const content = await readFileContent(path);
        const relativePath = path.replace(rootPath + "/", "");
        files.push({ path: relativePath, content });
      } catch (error) {
        console.error(`Failed to read file ${path}:`, error);
        // Maybe alert user about this failure
      }
    }

    const fullPrompt = buildAiderStylePrompt(
      files,
      instructions,
      customSystemPrompt
    );
    await writeText(fullPrompt);
    alert("Prompt copied to clipboard!");
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800">
      <h2 className="font-bold mb-2">Prompt Composer</h2>
      <div className="mb-2">
        <h3 className="text-sm font-semibold mb-1">
          Selected Files ({selectedFilePaths.length})
        </h3>
        <div className="bg-white rounded-md p-2 text-xs h-32 overflow-y-auto border border-gray-200">
          {selectedFilePaths.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {selectedFilePaths.map((path) => (
                <li key={path} className="truncate" title={path}>
                  {rootPath ? path.replace(rootPath + "/", "") : path}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 m-1">
              Select files from the tree using checkboxes.
            </p>
          )}
        </div>
      </div>

      <div className="mb-2">
        <button
          onClick={() => setIsSystemPromptVisible(!isSystemPromptVisible)}
          className="flex items-center justify-between w-full text-sm font-semibold mb-1"
        >
          <span>Custom System Prompt</span>
          {isSystemPromptVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {isSystemPromptVisible && (
          <textarea
            className="w-full bg-white p-2 rounded-md font-mono text-xs border border-gray-200 h-24"
            placeholder="Enter your custom system prompt..."
            value={customSystemPrompt}
            onChange={(e) => setCustomSystemPrompt(e.target.value)}
          ></textarea>
        )}
      </div>

      <textarea
        className="w-full flex-grow bg-white p-2 rounded-md mb-4 font-mono text-sm border border-gray-200"
        placeholder="Enter your refactoring instructions here..."
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
      ></textarea>
      <button
        onClick={generatePrompt}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-md disabled:bg-gray-400"
        disabled={selectedFilePaths.length === 0 || !instructions}
      >
        <Clipboard size={16} />
        Generate & Copy Prompt
      </button>
    </div>
  );
}