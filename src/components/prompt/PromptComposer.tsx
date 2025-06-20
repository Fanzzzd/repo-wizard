import { useState } from "react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { readFileContent } from "../../lib/tauri_api";
import { Clipboard, ChevronDown, ChevronUp, Check } from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { buildPrompt } from "../../lib/prompt_builder";
import { useSettingsStore } from "../../store/settingsStore";
import type { EditFormat } from "../../types";

const editFormatOptions: { value: EditFormat; label: string }[] = [
  { value: "udiff", label: "Unified Diff" },
  { value: "diff-fenced", label: "Search/Replace" },
  { value: "whole", label: "Whole File" },
];

export function PromptComposer() {
  const [instructions, setInstructions] = useState("");
  const [isSystemPromptVisible, setIsSystemPromptVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { selectedFilePaths, rootPath } = useWorkspaceStore();
  const {
    customSystemPrompt,
    setCustomSystemPrompt,
    editFormat,
    setEditFormat,
  } = useSettingsStore();

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

    const fullPrompt = buildPrompt(
      files,
      instructions,
      customSystemPrompt,
      editFormat
    );
    await writeText(fullPrompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold">Prompt Composer</h2>
      </div>

      <div className="mb-2">
        <label className="text-sm font-semibold mb-1 block">Edit Format</label>
        <div className="flex bg-gray-200 rounded-md p-0.5">
          {editFormatOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setEditFormat(value)}
              className={`flex-1 text-center text-xs px-2 py-1 rounded-md transition-colors ${
                editFormat === value
                  ? "bg-white shadow-sm text-gray-800 font-medium"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {editFormat === "udiff" && "Best for GPT models."}
          {editFormat === "diff-fenced" && "Best for Gemini models."}
          {editFormat === "whole" && "Universal, but can be verbose."}
        </p>
      </div>

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
          {isSystemPromptVisible ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
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
        {isCopied ? <Check size={16} /> : <Clipboard size={16} />}
        {isCopied ? "Copied!" : "Generate & Copy Prompt"}
      </button>
    </div>
  );
}