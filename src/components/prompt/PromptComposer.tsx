import { useState, useEffect } from "react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { readFileContent } from "../../lib/tauri_api";
import { Clipboard, ChevronDown, ChevronUp, Check, Search, Trash2, Plus } from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { buildPrompt } from "../../lib/prompt_builder";
import { useSettingsStore } from "../../store/settingsStore";
import type { EditFormat, MetaPrompt } from "../../types";
import { useReviewStore } from "../../store/reviewStore";
import { parseChangesFromMarkdown } from "../../lib/diff_parser";
import { useDialogStore } from "../../store/dialogStore";
import { usePromptStore } from "../../store/promptStore";
import { v4 as uuidv4 } from "uuid";

const editFormatOptions: { value: EditFormat; label: string }[] = [
  { value: "udiff", label: "Unified Diff" },
  { value: "diff-fenced", label: "Search/Replace" },
  { value: "whole", label: "Whole File" },
];

export function PromptComposer() {
  const { instructions, setInstructions, markdownResponse, setMarkdownResponse } = usePromptStore();
  const [isSystemPromptVisible, setIsSystemPromptVisible] = useState(false);
  const [isMetaPromptsVisible, setIsMetaPromptsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  const { selectedFilePaths, rootPath } = useWorkspaceStore();
  const { startReview } = useReviewStore();
  const { open: openDialog } = useDialogStore();
  const {
    customSystemPrompt,
    setCustomSystemPrompt,
    editFormat,
    setEditFormat,
    metaPrompts,
    setMetaPrompts,
  } = useSettingsStore();

  const estimateTokens = (text: string) => {
    return Math.ceil(text.length / 4);
  };

  useEffect(() => {
    const calculate = async () => {
      if (!rootPath) {
        const prompt = buildPrompt([], instructions, customSystemPrompt, editFormat, metaPrompts);
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
      
      const fullPrompt = buildPrompt(files, instructions, customSystemPrompt, editFormat, metaPrompts);
      setEstimatedTokens(estimateTokens(fullPrompt));
    };
    
    const handler = setTimeout(() => {
        calculate();
    }, 300);

    return () => {
        clearTimeout(handler);
    };
  }, [selectedFilePaths, instructions, customSystemPrompt, editFormat, rootPath, metaPrompts]);

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
      editFormat,
      metaPrompts
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
    const parsedChanges = parseChangesFromMarkdown(markdownResponse);
    if (parsedChanges.length === 0) {
        await openDialog({
            title: "No Changes Found",
            content: "Could not find any valid change blocks in the provided text. Please check the format and try again.",
            status: "error",
        });
        return;
    }
    startReview(parsedChanges);
    setMarkdownResponse("");
  };

  const handleUpdateMetaPrompt = (id: string, update: Partial<Omit<MetaPrompt, 'id'>>) => {
    setMetaPrompts(metaPrompts.map(p => p.id === id ? { ...p, ...update } : p));
  };

  const handleDeleteMetaPrompt = (id: string) => {
      setMetaPrompts(metaPrompts.filter(p => p.id !== id));
  };
  
  const handleAddMetaPrompt = () => {
      const newPrompt: Omit<MetaPrompt, 'id'> = { name: "New Meta Prompt", content: "", enabled: true };
      setMetaPrompts([...metaPrompts, { ...newPrompt, id: uuidv4() }]);
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
                onClick={() => setIsMetaPromptsVisible(!isMetaPromptsVisible)}
                className="flex items-center justify-between w-full text-sm font-semibold mb-1"
            >
                <span>Meta Prompts</span>
                {isMetaPromptsVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isMetaPromptsVisible && (
                <div className="space-y-3 mt-2">
                    {metaPrompts.map((prompt) => (
                        <div key={prompt.id} className="p-3 border rounded-md bg-white shadow-sm relative">
                            <div className="flex items-center gap-3 mb-2">
                                <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 rounded" checked={prompt.enabled} onChange={() => handleUpdateMetaPrompt(prompt.id, { enabled: !prompt.enabled })} />
                                <input type="text" value={prompt.name} onChange={(e) => handleUpdateMetaPrompt(prompt.id, { name: e.target.value })} className="font-semibold text-sm p-1 border-b flex-grow bg-transparent" placeholder="Meta Prompt Name" />
                                <button onClick={() => handleDeleteMetaPrompt(prompt.id)} className="p-1 text-gray-400 hover:text-red-600">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <textarea
                                value={prompt.content}
                                onChange={(e) => handleUpdateMetaPrompt(prompt.id, { content: e.target.value })}
                                className="w-full bg-gray-50 p-2 rounded-md font-mono text-xs border border-gray-200 h-24"
                                placeholder="Enter meta prompt content..."
                            />
                        </div>
                    ))}
                    <button
                        onClick={handleAddMetaPrompt}
                        className="w-full flex items-center justify-center gap-2 text-sm px-3 py-1.5 border-2 border-dashed rounded-md hover:bg-gray-100 hover:border-gray-300 text-gray-500"
                    >
                        <Plus size={16} /> Add Meta Prompt
                    </button>
                </div>
            )}
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
            value={markdownResponse}
            onChange={(e) => setMarkdownResponse(e.target.value)}
        ></textarea>
        <button
            onClick={handleReview}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-md disabled:bg-gray-400"
            disabled={!markdownResponse || !rootPath}
        >
            <Search size={16} />
            Review Changes
        </button>
      </div>
    </div>
  );
}