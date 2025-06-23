import { useState, useEffect } from "react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { readFileContent } from "../../lib/tauri_api";
import { Clipboard, ChevronDown, ChevronUp, Check, Search } from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { buildPrompt } from "../../lib/prompt_builder";
import { useSettingsStore } from "../../store/settingsStore";
import type { EditFormat } from "../../types";
import { useReviewStore } from "../../store/reviewStore";
import { parseChangesFromMarkdown } from "../../lib/diff_parser";
import { useDialogStore } from "../../store/dialogStore";

const editFormatOptions: { value: EditFormat; label: string }[] = [
  { value: "udiff", label: "Unified Diff" },
  { value: "diff-fenced", label: "Search/Replace" },
  { value: "whole", label: "Whole File" },
];

export function PromptComposer() {
  const [instructions, setInstructions] = useState("");
  const [isSystemPromptVisible, setIsSystemPromptVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [markdown, setMarkdown] = useState("");

  const { selectedFilePaths, rootPath } = useWorkspaceStore();
  const { startReview } = useReviewStore();
  const { open: openDialog } = useDialogStore();
  const {
    customSystemPrompt,
    setCustomSystemPrompt,
    editFormat,
    setEditFormat,
  } = useSettingsStore();

  const estimateTokens = (text: string) => {
    return Math.ceil(text.length / 4);
  };

  useEffect(() => {
    const calculate = async () => {
      if (!rootPath) {
        const prompt = buildPrompt([], instructions, customSystemPrompt, editFormat);
        setEstimatedTokens(estimateTokens(prompt));
        return;
      }

      const files = [];
      if (selectedFilePaths.length > 0) {
        for (const path of selectedFilePaths) {
          try {
            const content = await readFileContent(path);
            const relativePath = path.replace(rootPath + "/", "");
            files.push({ path: relativePath, content });
          } catch (error) {
            console.error(`Failed to read file for token count ${path}:`, error);
          }
        }
      }
      
      const fullPrompt = buildPrompt(files, instructions, customSystemPrompt, editFormat);
      setEstimatedTokens(estimateTokens(fullPrompt));
    };
    
    const handler = setTimeout(() => {
        calculate();
    }, 300);

    return () => {
        clearTimeout(handler);
    };
  }, [selectedFilePaths, instructions, customSystemPrompt, editFormat, rootPath]);

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

  const handleReview = async () => {
    if (!rootPath) {
      await openDialog({
        title: "Project Not Found",
        content: "Please open a project folder first.",
        status: "warning",
      });
      return;
    }
    const parsedChanges = parseChangesFromMarkdown(markdown);
    if (parsedChanges.length === 0) {
        await openDialog({
            title: "No Changes Found",
            content: "Could not find any valid change blocks in the provided text. Please check the format and try again.",
            status: "error",
        });
        return;
    }
    startReview(parsedChanges);
    setMarkdown("");
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 text-gray-800 overflow-y-auto">
      <div className="flex-grow flex flex-col min-h-0">
        <h2 className="font-bold mb-2">1. Compose Prompt</h2>

        <div className="mb-4">
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

        <div className="mb-4">
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
          className="w-full flex-grow bg-white p-2 rounded-md mb-2 font-mono text-sm border border-gray-200"
          placeholder="Enter your refactoring instructions here..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        ></textarea>
        <div className="text-right text-xs text-gray-500 mb-2">
          Estimated Tokens: ~{estimatedTokens.toLocaleString()}
        </div>
        <button
          onClick={generatePrompt}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-md disabled:bg-gray-400"
          disabled={selectedFilePaths.length === 0 || !instructions}
        >
          {isCopied ? <Check size={16} /> : <Clipboard size={16} />}
          {isCopied ? "Copied!" : "Generate & Copy Prompt"}
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col">
        <h2 className="font-bold mb-2">2. Paste Response & Review</h2>
        <textarea
            className="w-full h-48 bg-white p-2 rounded-md font-mono text-sm border border-gray-200 mb-2"
            placeholder="Paste full markdown response from your LLM here..."
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
        ></textarea>
        <button
            onClick={handleReview}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-md disabled:bg-gray-400"
            disabled={!markdown || !rootPath}
        >
            <Search size={16} />
            Review Changes
        </button>
      </div>
    </div>
  );
}