import { useState, useEffect, useRef, useMemo } from "react";
import type { MetaPrompt, PromptMode } from "../../types";
import {
  X,
  Plus,
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
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ToggleSwitch } from "../common/ToggleSwitch";
import { SegmentedControl } from "../common/SegmentedControl";
import { useMetaPromptManager } from "../../hooks/useMetaPromptManager";

interface MetaPromptsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function PromptItemDisplay({ prompt }: { prompt: MetaPrompt }) {
  return (
    <div
      className={`w-full text-left flex items-center justify-between p-2 rounded-md text-sm shadow-lg border border-gray-200 select-none cursor-default bg-white text-gray-800`}
    >
      <div className="flex items-center gap-2 truncate">
        <GripVertical size={16} className="flex-shrink-0 text-gray-600" />
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
            <GripVertical size={16} className="text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
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
  onUpdatePrompt: (prompt: MetaPrompt, update: Partial<Omit<MetaPrompt, "id">>) => void;
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
      <SortableContext items={promptIds} strategy={verticalListSortingStrategy} id={mode}>
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

export function MetaPromptsManagerModal({ isOpen, onClose }: MetaPromptsManagerModalProps) {
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
    handleContextMenu
  } = useMetaPromptManager({ isOpen });
  
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const modeOptions: { value: PromptMode, label: string }[] = [
    { value: "universal", label: "Universal" },
    { value: "edit", label: "Edit Mode" },
    { value: "qa", label: "QA Mode" },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
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
    universal: { prompts: universalPrompts, icon: <Wand2 size={14} />, title: "Universal" },
    edit: { prompts: editPrompts, icon: <Edit size={14} />, title: "Edit Mode" },
    qa: { prompts: qaPrompts, icon: <MessageSquare size={14} />, title: "QA Mode" },
  };

  const onSaveAndClose = () => {
    handleSave();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Manage Meta Prompts</h2>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100">
                <X size={20} />
              </button>
            </header>

            <main className="flex-grow flex min-h-0 bg-gray-50">
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
                  <div className="flex-grow p-2 overflow-y-auto select-none">
                    {Object.entries(promptSections).map(([mode, { prompts, icon, title }]) => (
                        <PromptListSection
                          key={mode} mode={mode as PromptMode} title={title} prompts={prompts} icon={icon}
                          selectedPromptId={selectedPromptId} onSelect={setSelectedPromptId} onUpdatePrompt={handleUpdatePrompt}
                          onContextMenu={handleContextMenu}
                        />
                      )
                    )}
                  </div>
                  <div className="flex-shrink-0 p-2 border-t border-gray-200 relative" ref={addMenuRef}>
                    <AnimatePresence>
                      {isAddMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.15 }}
                          className="absolute bottom-full left-2 right-2 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1"
                        >
                          <Button onClick={() => { handleAddBlankPrompt("universal"); setIsAddMenuOpen(false); }} variant="ghost" size="md" className="w-full justify-start text-gray-600" leftIcon={<Wand2 size={16} />}>Add Blank (Universal)</Button>
                          <Button onClick={() => { handleAddBlankPrompt("edit"); setIsAddMenuOpen(false); }} variant="ghost" size="md" className="w-full justify-start text-gray-600" leftIcon={<Edit size={16} />}>Add Blank (Edit)</Button>
                          <Button onClick={() => { handleAddBlankPrompt("qa"); setIsAddMenuOpen(false); }} variant="ghost" size="md" className="w-full justify-start text-gray-600" leftIcon={<MessageSquare size={16} />}>Add Blank (QA)</Button>
                          {availableTemplates.map((template, index) => (
                            <Button key={index} onClick={() => { handleAddFromTemplate(template); setIsAddMenuOpen(false); }} variant="ghost" size="md" className="w-full justify-start text-gray-600" title={`Add "${template.name}" template`} leftIcon={<Combine size={16} />}>{template.name}</Button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button onClick={() => setIsAddMenuOpen(!isAddMenuOpen)} variant="primary" size="md" className="w-full" leftIcon={<Plus size={16} />}>
                      Add Prompt
                      <ChevronUp size={16} className={`transition-transform ml-auto ${ isAddMenuOpen ? "rotate-0" : "rotate-180" }`} />
                    </Button>
                  </div>
                </div>
                <SortableOverlay>{activeDragPrompt ? <PromptItemDisplay prompt={activeDragPrompt} /> : null}</SortableOverlay>
              </DndContext>

              <div className="w-2/3 p-6 overflow-y-auto">
                {selectedPrompt ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Mode</label>
                      <SegmentedControl options={modeOptions} value={selectedPrompt.mode} onChange={(mode) => handleUpdatePromptById(selectedPrompt.id, { mode })} layoutId="prompt-mode-slider" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
                      <Input type="text" value={selectedPrompt.name} onChange={(e) => handleUpdatePromptById(selectedPrompt.id, { name: e.target.value })} placeholder="Meta Prompt Name" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Content</label>
                      <Textarea value={selectedPrompt.content} onChange={(e) => handleUpdatePromptById(selectedPrompt.id, { content: e.target.value })} className="h-48 text-xs" placeholder="Enter meta prompt content..." />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center text-gray-500">
                    <div>
                      <p>No meta prompts yet.</p>
                      <p className="text-sm">Click "Add Prompt" to get started.</p>
                    </div>
                  </div>
                )}
              </div>
            </main>

            <footer className="bg-gray-100 px-4 py-3 flex justify-end gap-3 border-t flex-shrink-0">
              <Button onClick={onClose} variant="secondary" size="md">Cancel</Button>
              <Button onClick={onSaveAndClose} variant="primary" size="md">Save & Close</Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}