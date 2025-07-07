import { useState, useEffect, useRef, useMemo } from "react";
import { useSettingsStore } from "../../store/settingsStore";
import { useContextMenuStore } from "../../store/contextMenuStore";
import type { MetaPrompt } from "../../types";
import { v4 as uuidv4 } from "uuid";
import {
  X,
  Plus,
  Trash2,
  Copy,
  Combine,
  ChevronUp,
  Edit,
  MessageSquare,
  Wand2,
  GripVertical,
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
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ToggleSwitch } from "../common/ToggleSwitch";

interface MetaPromptsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const templateFiles = ["architect.md", "engineer.md", "code-reviewer.md"];
type PromptMode = "universal" | "edit" | "qa";

// A simple component for rendering the visual of a prompt item, used in the DragOverlay.
function PromptItemDisplay({
  prompt,
  isSelected,
}: {
  prompt: MetaPrompt;
  isSelected: boolean;
}) {
  const [isLifted, setIsLifted] = useState(false);

  useEffect(() => {
    // If the item starts as selected, we want it to be blue initially,
    // then transition to white. A timeout allows the initial state to render
    // before the class change triggers the transition.
    if (isSelected) {
      const timer = setTimeout(() => setIsLifted(true), 10);
      return () => clearTimeout(timer);
    } else {
      // If it's not a selected item being dragged, it's just white.
      setIsLifted(true);
    }
  }, [isSelected]);

  const colorClasses =
    isSelected && !isLifted
      ? "bg-blue-100 text-blue-800"
      : "bg-white text-gray-800";

  const gripColorClass =
    isSelected && !isLifted ? "text-blue-600" : "text-gray-600";

  return (
    <div
      className={`w-full text-left flex items-center justify-between p-2 rounded-md text-sm shadow-lg border border-gray-200 select-none cursor-default transition-colors duration-200 ${colorClasses}`}
    >
      <div className="flex items-center gap-2 truncate">
        <GripVertical
          size={16}
          className={`flex-shrink-0 transition-colors duration-200 ${gripColorClass}`}
        />
        <span className="truncate">{prompt.name}</span>
      </div>
      <div className="ml-2 flex-shrink-0">
        <ToggleSwitch
          checked={prompt.enabled}
          onChange={() => {}} // Dummy, no-op for display
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
  return (
    <SortableItem id={prompt.id}>
      <div
        onContextMenu={(e) => onContextMenu(e, prompt)}
        onClick={() => onSelect(prompt.id)}
        className={`w-full text-left flex items-center justify-between p-2 rounded-md text-sm mb-1 group select-none cursor-default ${
          selectedPromptId === prompt.id
            ? "bg-blue-100 text-blue-800"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <DragHandle>
            <GripVertical
              size={16}
              className="text-gray-400 group-hover:text-gray-600 flex-shrink-0"
            />
          </DragHandle>
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
  onUpdateList,
  selectedPromptId,
  onUpdatePrompt,
}: {
  mode: PromptMode;
  title: string;
  prompts: MetaPrompt[];
  icon: React.ReactNode;
  onSelect: (id: string | null) => void;
  onUpdateList: (mode: PromptMode, prompts: MetaPrompt[]) => void;
  selectedPromptId: string | null;
  onUpdatePrompt: (id: string, update: Partial<Omit<MetaPrompt, "id">>) => void;
}) {
  const { open: openContextMenu } = useContextMenuStore();
  const promptIds = useMemo(() => prompts.map((p) => p.id), [prompts]);
  const { setNodeRef } = useDroppable({ id: mode });

  const handleContextMenu = (e: React.MouseEvent, prompt: MetaPrompt) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, [
      {
        label: "Duplicate",
        icon: Copy,
        onClick: () => {
          const newPrompt: MetaPrompt = {
            ...prompt,
            id: uuidv4(),
            name: `${prompt.name} (Copy)`,
          };
          const sourceIndex = prompts.findIndex((p) => p.id === prompt.id);
          const newPrompts = [...prompts];
          newPrompts.splice(sourceIndex + 1, 0, newPrompt);
          onUpdateList(mode, newPrompts);
          onSelect(newPrompt.id);
        },
      },
      { isSeparator: true },
      {
        label: "Delete",
        icon: Trash2,
        isDanger: true,
        onClick: () => {
          const newPrompts = prompts.filter((p) => p.id !== prompt.id);
          onUpdateList(mode, newPrompts);

          if (selectedPromptId === prompt.id) {
            const index = prompts.findIndex((p) => p.id === prompt.id);
            if (newPrompts.length === 0) {
              onSelect(null);
            } else {
              const newIndex = Math.max(0, index - 1);
              onSelect(newPrompts[newIndex]?.id ?? null);
            }
          }
        },
      },
    ]);
  };

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
              onContextMenu={handleContextMenu}
              onUpdate={(update) => onUpdatePrompt(prompt.id, update)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function MetaPromptsManagerModal({
  isOpen,
  onClose,
}: MetaPromptsManagerModalProps) {
  const { metaPrompts, setMetaPrompts } = useSettingsStore();
  const [localPrompts, setLocalPrompts] = useState<MetaPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(
    null
  );
  const [activePrompt, setActivePrompt] = useState<MetaPrompt | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<
    { name: string; content: string }[]
  >([]);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const selectedPrompt = localPrompts.find((p) => p.id === selectedPromptId);

  const { universalPrompts, editPrompts, qaPrompts } = useMemo(() => {
    return {
      universalPrompts: localPrompts.filter((p) => p.mode === "universal"),
      editPrompts: localPrompts.filter((p) => p.mode === "edit"),
      qaPrompts: localPrompts.filter((p) => p.mode === "qa"),
    };
  }, [localPrompts]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const modeDisplayNames: Record<PromptMode, string> = {
    universal: "Universal",
    edit: "Edit Mode",
    qa: "QA Mode",
  };

  useEffect(() => {
    if (isOpen) {
      const migratedPrompts = JSON.parse(
        JSON.stringify(metaPrompts)
      ).map((p: MetaPrompt) => ({ ...p, mode: p.mode ?? "edit" }));

      setLocalPrompts(migratedPrompts);

      if (migratedPrompts.length > 0 && !selectedPromptId) {
        setSelectedPromptId(migratedPrompts[0].id);
      } else if (migratedPrompts.length === 0) {
        setSelectedPromptId(null);
      }

      const fetchTemplates = async () => {
        try {
          const templatesData = await Promise.all(
            templateFiles.map(async (filename) => {
              const response = await fetch(`/meta-prompts/${filename}`);
              if (!response.ok)
                throw new Error(`Failed to fetch ${filename}`);
              const content = await response.text();
              const name = filename
                .replace(".md", "")
                .replace(/-/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());
              return { name, content };
            })
          );
          setAvailableTemplates(templatesData);
        } catch (error) {
          console.error("Failed to load meta prompt templates:", error);
        }
      };
      fetchTemplates();
    }
  }, [isOpen, metaPrompts]);

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

  const handleSave = () => {
    setMetaPrompts(localPrompts);
    onClose();
  };

  const handleUpdatePrompt = (
    id: string,
    update: Partial<Omit<MetaPrompt, "id">>
  ) => {
    setLocalPrompts((currentPrompts) =>
      currentPrompts.map((p) => (p.id === id ? { ...p, ...update } : p))
    );
  };

  const handleUpdateList = (mode: PromptMode, updatedSublist: MetaPrompt[]) => {
    setLocalPrompts((currentPrompts) => {
      const currentGrouped = {
        universal: currentPrompts.filter((p) => p.mode === "universal"),
        edit: currentPrompts.filter((p) => p.mode === "edit"),
        qa: currentPrompts.filter((p) => p.mode === "qa"),
      };
      currentGrouped[mode] = updatedSublist;
      return [
        ...currentGrouped.universal,
        ...currentGrouped.edit,
        ...currentGrouped.qa,
      ];
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActivePrompt(localPrompts.find((p) => p.id === event.active.id) || null);
  };

  const handleDragCancel = () => {
    setActivePrompt(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeContainer = active.data.current?.sortable
      .containerId as PromptMode;
    const overContainer = (over.data.current?.sortable.containerId ??
      over.id) as PromptMode;

    if (activeContainer && overContainer && activeContainer !== overContainer) {
      setLocalPrompts((prompts) => {
        const activePrompt = prompts.find((p) => p.id === activeId);
        if (!activePrompt) return prompts;

        const overIndex = prompts.findIndex((p) => p.id === overId);
        const otherPrompts = prompts.filter((p) => p.id !== activeId);
        const updatedPrompt = { ...activePrompt, mode: overContainer };

        if (overIndex !== -1) {
          // Dragging over an item: insert before it.
          const overItemInOthersIndex = otherPrompts.findIndex(
            (p) => p.id === overId
          );
          otherPrompts.splice(overItemInOthersIndex, 0, updatedPrompt);
          return otherPrompts;
        } else {
          // Dragging over a container: append to the new group and re-flatten.
          const grouped = {
            universal: otherPrompts.filter((p) => p.mode === "universal"),
            edit: otherPrompts.filter((p) => p.mode === "edit"),
            qa: otherPrompts.filter((p) => p.mode === "qa"),
          };
          grouped[overContainer].push(updatedPrompt);
          return [
            ...grouped.universal,
            ...grouped.edit,
            ...grouped.qa,
          ];
        }
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePrompt(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalPrompts((prompts) => {
        const oldIndex = prompts.findIndex((item) => item.id === active.id);
        const newIndex = prompts.findIndex((item) => item.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(prompts, oldIndex, newIndex);
        }
        return prompts;
      });
    }
  };

  const addPrompt = (prompt: Omit<MetaPrompt, "id">) => {
    const newPrompt: MetaPrompt = { ...prompt, id: uuidv4() };
    setLocalPrompts((prev) => [newPrompt, ...prev]);
    setSelectedPromptId(newPrompt.id);
    setIsAddMenuOpen(false);
  };

  const handleAddFromTemplate = (template: {
    name: string;
    content: string;
  }) => {
    addPrompt({
      name: template.name,
      content: template.content,
      enabled: true,
      mode: "edit",
    });
  };

  const handleAddBlankPrompt = (mode: PromptMode) => {
    addPrompt({
      name: `New ${mode.charAt(0).toUpperCase() + mode.slice(1)} Prompt`,
      content: "",
      enabled: true,
      mode: mode,
    });
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const promptSections = {
    universal: { prompts: universalPrompts, icon: <Wand2 size={14} /> },
    edit: { prompts: editPrompts, icon: <Edit size={14} /> },
    qa: { prompts: qaPrompts, icon: <MessageSquare size={14} /> },
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
            <header className="p-4 border-b flex items-center justify-between flex-shrink-0">
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
                      ([mode, { prompts, icon }]) => (
                        <PromptListSection
                          key={mode}
                          mode={mode as PromptMode}
                          title={modeDisplayNames[mode as PromptMode]}
                          prompts={prompts}
                          icon={icon}
                          selectedPromptId={selectedPromptId}
                          onSelect={setSelectedPromptId}
                          onUpdateList={handleUpdateList}
                          onUpdatePrompt={handleUpdatePrompt}
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
                          <Button
                            onClick={() => handleAddBlankPrompt("universal")}
                            variant="ghost"
                            size="md"
                            className="w-full justify-start text-gray-600 hover:text-gray-800"
                            leftIcon={<Wand2 size={16} />}
                          >
                            Add Blank (Universal)
                          </Button>
                          <Button
                            onClick={() => handleAddBlankPrompt("edit")}
                            variant="ghost"
                            size="md"
                            className="w-full justify-start text-gray-600 hover:text-gray-800"
                            leftIcon={<Edit size={16} />}
                          >
                            Add Blank (Edit)
                          </Button>
                          <Button
                            onClick={() => handleAddBlankPrompt("qa")}
                            variant="ghost"
                            size="md"
                            className="w-full justify-start text-gray-600 hover:text-gray-800"
                            leftIcon={<MessageSquare size={16} />}
                          >
                            Add Blank (QA)
                          </Button>

                          {availableTemplates.map((template, index) => (
                            <Button
                              key={index}
                              onClick={() => handleAddFromTemplate(template)}
                              variant="ghost"
                              size="md"
                              className="w-full justify-start text-gray-600 hover:text-gray-800"
                              title={`Add the "${template.name}" template`}
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
                  {activePrompt ? (
                    <PromptItemDisplay
                      prompt={activePrompt}
                      isSelected={activePrompt.id === selectedPromptId}
                    />
                  ) : null}
                </SortableOverlay>
              </DndContext>

              <div className="w-2/3 p-6 overflow-y-auto">
                {selectedPrompt ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Mode
                      </label>
                      <div className="relative z-0 flex bg-gray-200 rounded-md p-0.5">
                        {(["universal", "edit", "qa"] as const).map(
                          (mode) => (
                            <button
                              key={mode}
                              onClick={() =>
                                handleUpdatePrompt(selectedPrompt.id, { mode })
                              }
                              className={`relative flex-1 text-center text-xs px-2 py-1 font-medium transition-colors duration-200 ${
                                (selectedPrompt.mode ?? "edit") === mode
                                  ? "text-gray-900"
                                  : "text-gray-600 hover:text-gray-800"
                              }`}
                            >
                              {(selectedPrompt.mode ?? "edit") === mode && (
                                <motion.div
                                  layoutId="prompt-mode-slider"
                                  className="absolute inset-0 bg-white shadow-sm rounded-md"
                                  transition={{
                                    type: "spring",
                                    stiffness: 350,
                                    damping: 30,
                                  }}
                                />
                              )}
                              <span className="relative z-10">
                                {modeDisplayNames[mode]}
                              </span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Name
                      </label>
                      <Input
                        type="text"
                        value={selectedPrompt.name}
                        onChange={(e) =>
                          handleUpdatePrompt(selectedPrompt.id, {
                            name: e.target.value,
                          })
                        }
                        placeholder="Meta Prompt Name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Content
                      </label>
                      <Textarea
                        value={selectedPrompt.content}
                        onChange={(e) =>
                          handleUpdatePrompt(selectedPrompt.id, {
                            content: e.target.value,
                          })
                        }
                        className="h-48 text-xs"
                        placeholder="Enter meta prompt content..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center text-gray-500">
                    <div>
                      <p>No meta prompts yet.</p>
                      <p className="text-sm">
                        Click "Add Prompt" to get started.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </main>

            <footer className="bg-gray-100 px-4 py-3 flex justify-end gap-3 border-t flex-shrink-0">
              <Button onClick={onClose} variant="secondary" size="md">
                Cancel
              </Button>
              <Button onClick={handleSave} variant="primary" size="md">
                Save & Close
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}