import { useState, useEffect, useRef, useMemo } from "react";
import type {
  MetaPrompt,
  PromptMode,
  FileTreeConfig,
  GitDiffConfig,
  TerminalCommandConfig,
  Commit,
  GitStatus,
} from "../../types";
import {
  X,
  Plus,
  Combine,
  ChevronUp,
  Edit,
  MessageSquare,
  Wand2,
  GripVertical,
  FolderTree,
  GitBranch,
  Terminal,
  AlertCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Input } from "../common/Input";
import { Textarea } from "../common/Textarea";
import { Button } from "../common/Button";
import { SortableItem, DragHandle } from "../common/Sortable/SortableItem";
import { SortableOverlay } from "../common/Sortable/SortableOverlay";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ToggleSwitch } from "../common/ToggleSwitch";
import { SegmentedControl } from "../common/SegmentedControl";
import { useMetaPromptManager } from "../../hooks/useMetaPromptManager";
import { useWorkspaceStore } from "../../store/workspaceStore";
import * as tauriApi from "../../services/tauriApi";

interface MetaPromptsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function PromptItemDisplay({ prompt }: { prompt: MetaPrompt }) {
  const { icon } = useMemo(() => {
    if (prompt.promptType === "magic") {
      let magicIcon;
      switch (prompt.magicType) {
        case "file-tree":
          magicIcon = (
            <FolderTree size={16} className="text-green-600 flex-shrink-0" />
          );
          break;
        case "git-diff":
          magicIcon = (
            <GitBranch size={16} className="text-indigo-600 flex-shrink-0" />
          );
          break;
        case "terminal-command":
          magicIcon = (
            <Terminal size={16} className="text-yellow-600 flex-shrink-0" />
          );
          break;
        default:
          magicIcon = (
            <Wand2 size={16} className="text-gray-500 flex-shrink-0" />
          );
      }
      return { icon: magicIcon };
    }
    if (prompt.mode === "universal") {
      return {
        icon: <Wand2 size={16} className="text-purple-500 flex-shrink-0" />,
      };
    }
    const iconEl =
      prompt.mode === "edit" ? (
        <Edit size={16} className="text-blue-500 flex-shrink-0" />
      ) : (
        <MessageSquare size={16} className="text-blue-500 flex-shrink-0" />
      );
    return {
      icon: iconEl,
    };
  }, [prompt]);

  return (
    <div className="w-full text-left flex items-center justify-between p-2 rounded-md text-sm shadow-xl border border-gray-200 select-none cursor-grabbing bg-white">
      <div className="flex items-center gap-2 truncate text-gray-800">
        <GripVertical size={16} className="flex-shrink-0 text-gray-600" />
        {icon}
        <span className="truncate">{prompt.name}</span>
      </div>
      <div className="ml-2 flex-shrink-0">
        <ToggleSwitch
          checked={prompt.enabled}
          onChange={() => {}}
          title={prompt.enabled ? "Enabled" : "Disabled"}
        />
      </div>
    </div>
  );
}

function SortablePromptItem({
  prompt,
  onSelect,
  selectedPromptId,
  onContextMenu,
  onUpdate,
}: {
  prompt: MetaPrompt;
  onSelect: (id: string) => void;
  selectedPromptId: string | null;
  onContextMenu: (e: React.MouseEvent, prompt: MetaPrompt) => void;
  onUpdate: (update: Partial<Omit<MetaPrompt, "id">>) => void;
}) {
  const isSelected = selectedPromptId === prompt.id;

  const { selectedClasses, icon } = useMemo(() => {
    if (prompt.promptType === "magic") {
      let magicIcon, selectedBg;
      switch (prompt.magicType) {
        case "file-tree":
          magicIcon = (
            <FolderTree size={16} className="text-green-600 flex-shrink-0" />
          );
          selectedBg = "bg-green-100 text-green-800";
          break;
        case "git-diff":
          magicIcon = (
            <GitBranch size={16} className="text-indigo-600 flex-shrink-0" />
          );
          selectedBg = "bg-indigo-100 text-indigo-800";
          break;
        case "terminal-command":
          magicIcon = (
            <Terminal size={16} className="text-yellow-600 flex-shrink-0" />
          );
          selectedBg = "bg-yellow-100 text-yellow-800";
          break;
        default:
          magicIcon = (
            <Wand2 size={16} className="text-gray-500 flex-shrink-0" />
          );
          selectedBg = "bg-gray-200 text-gray-800";
      }
      return { selectedClasses: selectedBg, icon: magicIcon };
    }

    if (prompt.mode === "universal") {
      return {
        selectedClasses: "bg-purple-100 text-purple-800",
        icon: <Wand2 size={16} className="text-purple-500 flex-shrink-0" />,
      };
    }
    const iconEl =
      prompt.mode === "edit" ? (
        <Edit size={16} className="text-blue-500 flex-shrink-0" />
      ) : (
        <MessageSquare size={16} className="text-blue-500 flex-shrink-0" />
      );
    return {
      selectedClasses: "bg-blue-100 text-blue-800",
      icon: iconEl,
    };
  }, [prompt]);

  const itemClasses = isSelected
    ? selectedClasses
    : "text-gray-700 hover:bg-gray-100";

  return (
    <SortableItem id={prompt.id}>
      <div
        onContextMenu={(e) => onContextMenu(e, prompt)}
        onClick={() => onSelect(prompt.id)}
        className={`w-full text-left flex items-center justify-between p-2 rounded-md text-sm mb-1 group select-none cursor-default ${itemClasses}`}
      >
        <div className="flex items-center gap-2 truncate">
          <DragHandle>
            <GripVertical
              size={16}
              className="text-gray-400 group-hover:text-gray-600 flex-shrink-0"
            />
          </DragHandle>
          {icon}
          <span className="truncate">{prompt.name}</span>
        </div>
        <div className="ml-2 flex-shrink-0">
          <ToggleSwitch
            checked={prompt.enabled}
            onChange={(enabled) => onUpdate({ enabled })}
            title={prompt.enabled ? "Click to disable" : "Click to enable"}
          />
        </div>
      </div>
    </SortableItem>
  );
}

function PromptListSection({
  mode,
  title,
  prompts,
  icon,
  onSelect,
  selectedPromptId,
  onUpdatePrompt,
  onContextMenu,
}: {
  mode: PromptMode;
  title: string;
  prompts: MetaPrompt[];
  icon: React.ReactNode;
  onSelect: (id: string | null) => void;
  selectedPromptId: string | null;
  onUpdatePrompt: (
    prompt: MetaPrompt,
    update: Partial<Omit<MetaPrompt, "id">>
  ) => void;
  onContextMenu: (e: React.MouseEvent, prompt: MetaPrompt) => void;
}) {
  const promptIds = useMemo(() => prompts.map((p) => p.id), [prompts]);
  const { setNodeRef } = useDroppable({ id: mode });

  return (
    <div ref={setNodeRef}>
      <div className="px-2 py-1 mt-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 select-none cursor-default">
        {icon}
        {title}
      </div>
      <SortableContext
        items={promptIds}
        strategy={verticalListSortingStrategy}
        id={mode}
      >
        <div className="space-y-1 min-h-[1px]">
          {prompts.map((prompt) => (
            <SortablePromptItem
              key={prompt.id}
              prompt={prompt}
              onSelect={onSelect}
              selectedPromptId={selectedPromptId}
              onContextMenu={onContextMenu}
              onUpdate={(update) => onUpdatePrompt(prompt, update)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function FileTreeConfigEditor({
  prompt,
  onUpdate,
}: {
  prompt: MetaPrompt;
  onUpdate: (update: Partial<Omit<MetaPrompt, "id">>) => void;
}) {
  const config = prompt.fileTreeConfig ?? {
    scope: "all",
    maxFilesPerDirectory: null,
    ignorePatterns: "",
  };

  const handleConfigChange = (update: Partial<FileTreeConfig>) => {
    onUpdate({ fileTreeConfig: { ...config, ...update } });
  };

  const scopeOptions: { value: FileTreeConfig["scope"]; label: string }[] = [
    { value: "all", label: "All Files" },
    { value: "selected", label: "Selected Files" },
  ];

  return (
    <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
      <h3 className="text-base font-semibold text-gray-800">
        File Tree Configuration
      </h3>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Scope
        </label>
        <SegmentedControl
          options={scopeOptions}
          value={config.scope}
          onChange={(scope) => handleConfigChange({ scope })}
          layoutId="filetree-scope-slider"
        />
        <p className="text-xs text-gray-500 mt-1">
          {config.scope === "all"
            ? "The tree will include all files in the project."
            : "The tree will only include files currently selected in the workspace."}
        </p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Max items per directory
        </label>
        <Input
          type="number"
          placeholder="No limit"
          value={config.maxFilesPerDirectory ?? ""}
          onChange={(e) =>
            handleConfigChange({
              maxFilesPerDirectory: e.target.value
                ? parseInt(e.target.value, 10)
                : null,
            })
          }
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave blank for no limit. If exceeded, an ellipsis (...) will be
          shown.
        </p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Exclude patterns
        </label>
        <Textarea
          placeholder="e.g., *.log, node_modules/, .DS_Store"
          className="h-24 text-xs"
          value={config.ignorePatterns}
          onChange={(e) =>
            handleConfigChange({ ignorePatterns: e.target.value })
          }
        />
        <p className="text-xs text-gray-500 mt-1">
          Comma-separated list. Use `*` for wildcards (e.g., `*.tmp`) and end
          with `/` for directories.
        </p>
      </div>
    </div>
  );
}

function GitDiffConfigEditor({
  prompt,
  onUpdate,
  rootPath,
}: {
  prompt: MetaPrompt;
  onUpdate: (update: Partial<Omit<MetaPrompt, "id">>) => void;
  rootPath: string | null;
}) {
  const config = prompt.gitDiffConfig ?? { type: "unstaged", hash: null };
  const [isRepo, setIsRepo] = useState(false);
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!rootPath) {
      setIsLoading(false);
      return;
    }
    const fetchGitInfo = async () => {
      setIsLoading(true);
      const repo = await tauriApi.isGitRepository(rootPath);
      setIsRepo(repo);
      if (repo) {
        const [gitStatus, recentCommits] = await Promise.all([
          tauriApi.getGitStatus(rootPath),
          tauriApi.getRecentCommits(rootPath, 20),
        ]);
        setStatus(gitStatus);
        setCommits(recentCommits);
      }
      setIsLoading(false);
    };
    fetchGitInfo();
  }, [rootPath]);

  const handleConfigChange = (update: Partial<GitDiffConfig>) => {
    onUpdate({ gitDiffConfig: { ...config, ...update } });
  };

  const diffTypeOptions: { value: GitDiffConfig["type"]; label: string }[] = [
    { value: "unstaged", label: "Unstaged" },
    { value: "staged", label: "Staged" },
    { value: "commit", label: "Commit" },
  ];

  if (isLoading) {
    return <div>Loading Git info...</div>;
  }

  if (!isRepo) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md flex items-center gap-2">
        <AlertCircle size={20} />
        <div>
          The current project is not a Git repository, or Git is not installed.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
      <h3 className="text-base font-semibold text-gray-800">
        Git Diff Configuration
      </h3>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Diff Type
        </label>
        <SegmentedControl
          options={diffTypeOptions}
          value={config.type}
          onChange={(type) => handleConfigChange({ type, hash: null })}
          layoutId="gitdiff-type-slider"
        />
        <p className="text-xs text-gray-500 mt-1">
          {config.type === "unstaged" &&
            `Includes ${
              status?.hasUnstagedChanges ? "" : "no"
            } unstaged changes.`}
          {config.type === "staged" &&
            `Includes ${
              status?.hasStagedChanges ? "" : "no"
            } staged changes.`}
          {config.type === "commit" && "Shows changes from a specific commit."}
        </p>
      </div>
      {config.type === "commit" && (
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Select Commit
          </label>
          {commits.length > 0 ? (
            <select
              value={config.hash ?? ""}
              onChange={(e) => handleConfigChange({ hash: e.target.value })}
              className="form-input-base w-full"
            >
              <option value="" disabled>
                -- Select a commit --
              </option>
              {commits.map((commit) => (
                <option key={commit.hash} value={commit.hash}>
                  {commit.hash.slice(0, 7)} - {commit.message} ({commit.author},{" "}
                  {commit.date})
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-gray-500">No recent commits found.</p>
          )}
        </div>
      )}
    </div>
  );
}

function TerminalCommandConfigEditor({
  prompt,
  onUpdate,
}: {
  prompt: MetaPrompt;
  onUpdate: (update: Partial<Omit<MetaPrompt, "id">>) => void;
}) {
  const config = prompt.terminalCommandConfig ?? { command: "" };

  const handleConfigChange = (update: Partial<TerminalCommandConfig>) => {
    onUpdate({ terminalCommandConfig: { ...config, ...update } });
  };

  return (
    <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
      <h3 className="text-base font-semibold text-gray-800">
        Terminal Command Configuration
      </h3>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Command
        </label>
        <Input
          type="text"
          placeholder="e.g., pnpm test"
          value={config.command}
          onChange={(e) => handleConfigChange({ command: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">
          The command will be executed in the project root. Output will be
          included in the prompt.
        </p>
      </div>
    </div>
  );
}

export function MetaPromptsManagerModal({
  isOpen,
  onClose,
}: MetaPromptsManagerModalProps) {
  const { rootPath } = useWorkspaceStore();
  const {
    selectedPromptId,
    setSelectedPromptId,
    activeDragPrompt,
    availableTemplates,
    selectedPrompt,
    universalPrompts,
    editPrompts,
    qaPrompts,
    handleSave,
    handleUpdatePrompt,
    handleUpdatePromptById,
    handleDragStart,
    handleDragCancel,
    handleDragOver,
    handleDragEnd,
    handleAddFromTemplate,
    handleAddBlankPrompt,
    handleAddMagicPrompt,
    handleContextMenu,
  } = useMetaPromptManager({ isOpen });

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const modeOptions: { value: PromptMode; label: string }[] = [
    { value: "universal", label: "Universal" },
    { value: "edit", label: "Edit Mode" },
    { value: "qa", label: "QA Mode" },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(event.target as Node)
      ) {
        setIsAddMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const promptSections = {
    universal: {
      prompts: universalPrompts,
      icon: <Wand2 size={14} />,
      title: "Universal",
    },
    edit: { prompts: editPrompts, icon: <Edit size={14} />, title: "Edit Mode" },
    qa: {
      prompts: qaPrompts,
      icon: <MessageSquare size={14} />,
      title: "QA Mode",
    },
  };

  const onSaveAndClose = () => {
    handleSave();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                Manage Meta Prompts
              </h2>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </header>

            <main className="flex-grow flex min-h-0 bg-gray-50">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
                  <div className="flex-grow p-2 overflow-y-auto select-none">
                    {Object.entries(promptSections).map(
                      ([mode, { prompts, icon, title }]) => (
                        <PromptListSection
                          key={mode}
                          mode={mode as PromptMode}
                          title={title}
                          prompts={prompts}
                          icon={icon}
                          selectedPromptId={selectedPromptId}
                          onSelect={setSelectedPromptId}
                          onUpdatePrompt={handleUpdatePrompt}
                          onContextMenu={handleContextMenu}
                        />
                      )
                    )}
                  </div>
                  <div
                    className="flex-shrink-0 p-2 border-t border-gray-200 relative"
                    ref={addMenuRef}
                  >
                    <AnimatePresence>
                      {isAddMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full left-2 right-2 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1"
                        >
                          <div className="text-xs font-semibold text-gray-500 px-2 pt-1 uppercase tracking-wider">
                            Magic Prompt
                          </div>
                          <Button
                            onClick={() => {
                              handleAddMagicPrompt("file-tree");
                              setIsAddMenuOpen(false);
                            }}
                            variant="ghost"
                            size="md"
                            className="w-full justify-start text-gray-600"
                            leftIcon={<FolderTree size={16} />}
                          >
                            File Tree
                          </Button>
                          <Button
                            onClick={() => {
                              handleAddMagicPrompt("git-diff");
                              setIsAddMenuOpen(false);
                            }}
                            variant="ghost"
                            size="md"
                            className="w-full justify-start text-gray-600"
                            leftIcon={<GitBranch size={16} />}
                          >
                            Git Diff
                          </Button>
                          <Button
                            onClick={() => {
                              handleAddMagicPrompt("terminal-command");
                              setIsAddMenuOpen(false);
                            }}
                            variant="ghost"
                            size="md"
                            className="w-full justify-start text-gray-600"
                            leftIcon={<Terminal size={16} />}
                          >
                            Terminal Output
                          </Button>
                          <div className="border-t border-gray-200 my-1 mx-2" />
                          <div className="text-xs font-semibold text-gray-500 px-2 pt-1 uppercase tracking-wider">
                            Meta Prompt
                          </div>
                          <Button
                            onClick={() => {
                              handleAddBlankPrompt("universal");
                              setIsAddMenuOpen(false);
                            }}
                            variant="ghost"
                            size="md"
                            className="w-full justify-start text-gray-600"
                            leftIcon={<Plus size={16} />}
                          >
                            Add Blank Prompt
                          </Button>
                          {availableTemplates.map((template, index) => (
                            <Button
                              key={index}
                              onClick={() => {
                                handleAddFromTemplate(template);
                                setIsAddMenuOpen(false);
                              }}
                              variant="ghost"
                              size="md"
                              className="w-full justify-start text-gray-600"
                              title={`Add "${template.name}" template`}
                              leftIcon={<Combine size={16} />}
                            >
                              {template.name}
                            </Button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button
                      onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                      variant="primary"
                      size="md"
                      className="w-full"
                      leftIcon={<Plus size={16} />}
                    >
                      Add Prompt
                      <ChevronUp
                        size={16}
                        className={`transition-transform ml-auto ${
                          isAddMenuOpen ? "rotate-0" : "rotate-180"
                        }`}
                      />
                    </Button>
                  </div>
                </div>
                <SortableOverlay>
                  {activeDragPrompt ? (
                    <PromptItemDisplay prompt={activeDragPrompt} />
                  ) : null}
                </SortableOverlay>
              </DndContext>

              <div className="w-2/3 p-6 overflow-y-auto">
                {selectedPrompt ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Name
                      </label>
                      <Input
                        type="text"
                        value={selectedPrompt.name}
                        onChange={(e) =>
                          handleUpdatePromptById(selectedPrompt.id, {
                            name: e.target.value,
                          })
                        }
                        placeholder="Meta Prompt Name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Mode
                      </label>
                      <SegmentedControl
                        options={modeOptions}
                        value={selectedPrompt.mode}
                        onChange={(mode) =>
                          handleUpdatePromptById(selectedPrompt.id, { mode })
                        }
                        layoutId="prompt-mode-slider"
                      />
                    </div>

                    {selectedPrompt.promptType !== "magic" && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Content
                        </label>
                        <Textarea
                          value={selectedPrompt.content}
                          onChange={(e) =>
                            handleUpdatePromptById(selectedPrompt.id, {
                              content: e.target.value,
                            })
                          }
                          className="h-48 text-xs"
                          placeholder="Enter meta prompt content..."
                        />
                      </div>
                    )}
                    {selectedPrompt.promptType === "magic" && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Template
                        </label>
                        <Textarea
                          value={selectedPrompt.content}
                          onChange={(e) =>
                            handleUpdatePromptById(selectedPrompt.id, {
                              content: e.target.value,
                            })
                          }
                          className="h-48 text-xs"
                          placeholder="Enter meta prompt template..."
                        />
                        {selectedPrompt.magicType === "file-tree" && (
                          <FileTreeConfigEditor
                            prompt={selectedPrompt}
                            onUpdate={(update) =>
                              handleUpdatePromptById(selectedPrompt.id, update)
                            }
                          />
                        )}
                        {selectedPrompt.magicType === "git-diff" && (
                          <GitDiffConfigEditor
                            prompt={selectedPrompt}
                            onUpdate={(update) =>
                              handleUpdatePromptById(selectedPrompt.id, update)
                            }
                            rootPath={rootPath}
                          />
                        )}
                        {selectedPrompt.magicType === "terminal-command" && (
                          <TerminalCommandConfigEditor
                            prompt={selectedPrompt}
                            onUpdate={(update) =>
                              handleUpdatePromptById(selectedPrompt.id, update)
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center text-gray-500">
                    <div>
                      <p>Select a prompt to edit or add a new one.</p>
                    </div>
                  </div>
                )}
              </div>
            </main>

            <footer className="bg-gray-100 px-4 py-3 flex justify-end gap-3 border-t border-gray-200 flex-shrink-0">
              <Button onClick={onClose} variant="secondary" size="md">
                Cancel
              </Button>
              <Button onClick={onSaveAndClose} variant="primary" size="md">
                Save & Close
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}