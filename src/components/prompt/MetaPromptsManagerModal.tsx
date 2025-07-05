import { useState, useEffect, useRef } from "react";
import { useSettingsStore } from "../../store/settingsStore";
import type { MetaPrompt } from "../../types";
import { v4 as uuidv4 } from "uuid";
import { X, Plus, Trash2, Copy, Combine, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Input } from "../common/Input";
import { Textarea } from "../common/Textarea";
import { Checkbox } from "../common/Checkbox";

interface MetaPromptsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const templateFiles = ["architect.md", "engineer.md", "code-reviewer.md"];

export function MetaPromptsManagerModal({
  isOpen,
  onClose,
}: MetaPromptsManagerModalProps) {
  const { metaPrompts, setMetaPrompts } = useSettingsStore();
  const [localPrompts, setLocalPrompts] = useState<MetaPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<
    { name: string; content: string }[]
  >([]);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const selectedPrompt = localPrompts.find((p) => p.id === selectedPromptId);

  useEffect(() => {
    if (isOpen) {
      // Deep copy to avoid mutating global state directly
      setLocalPrompts(JSON.parse(JSON.stringify(metaPrompts)));

      // Set initial selection
      if (metaPrompts.length > 0) {
        setSelectedPromptId(metaPrompts[0].id);
      } else {
        setSelectedPromptId(null);
      }

      // Fetch templates
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

  // Click outside listener for the add menu
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
    setLocalPrompts(
      localPrompts.map((p) => (p.id === id ? { ...p, ...update } : p))
    );
  };

  const handleDeletePrompt = (id: string) => {
    const index = localPrompts.findIndex((p) => p.id === id);
    if (index === -1) return;

    const newPrompts = localPrompts.filter((p) => p.id !== id);
    setLocalPrompts(newPrompts);

    if (selectedPromptId === id) {
      if (newPrompts.length === 0) {
        setSelectedPromptId(null);
      } else {
        const newIndex = Math.max(0, index - 1);
        setSelectedPromptId(newPrompts[newIndex].id);
      }
    }
  };

  const handleDuplicatePrompt = (id: string) => {
    const sourcePrompt = localPrompts.find((p) => p.id === id);
    if (!sourcePrompt) return;
    const newPrompt: MetaPrompt = {
      ...sourcePrompt,
      id: uuidv4(),
      name: `${sourcePrompt.name} (Copy)`,
    };
    const sourceIndex = localPrompts.findIndex((p) => p.id === id);
    const newPrompts = [...localPrompts];
    newPrompts.splice(sourceIndex + 1, 0, newPrompt);
    setLocalPrompts(newPrompts);
    setSelectedPromptId(newPrompt.id);
  };

  const addPrompt = (prompt: MetaPrompt) => {
    setLocalPrompts((prev) => [...prev, prompt]);
    setSelectedPromptId(prompt.id);
    setIsAddMenuOpen(false);
  };

  const handleAddFromTemplate = (template: {
    name: string;
    content: string;
  }) => {
    addPrompt({
      id: uuidv4(),
      name: template.name,
      content: template.content,
      enabled: true,
    });
  };

  const handleAddBlankPrompt = () => {
    addPrompt({
      id: uuidv4(),
      name: "New Meta Prompt",
      content: "",
      enabled: true,
    });
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
              {/* Left Column: Prompt List */}
              <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
                <div className="flex-grow p-2 overflow-y-auto">
                  <AnimatePresence>
                    {localPrompts.map((prompt) => (
                      <motion.button
                        key={prompt.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setSelectedPromptId(prompt.id)}
                        className={`w-full text-left flex items-center justify-between p-2 rounded-md text-sm mb-1 transition-colors ${
                          selectedPromptId === prompt.id
                            ? "bg-blue-100 text-blue-800 font-semibold"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <span className="truncate">{prompt.name}</span>
                        {prompt.enabled && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 ml-2" title="Enabled"></div>
                        )}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="flex-shrink-0 p-2 border-t border-gray-200 relative" ref={addMenuRef}>
                  <AnimatePresence>
                    {isAddMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-2 right-2 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1"
                      >
                        <button
                          onClick={handleAddBlankPrompt}
                          className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          <Plus size={16} /> Add Blank Prompt
                        </button>
                        {availableTemplates.map((template, index) => (
                          <button
                            key={index}
                            onClick={() => handleAddFromTemplate(template)}
                            className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
                            title={`Add the "${template.name}" template`}
                          >
                            <Combine size={16} /> {template.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    Add Prompt
                    <ChevronUp size={16} className={`transition-transform ${isAddMenuOpen ? "rotate-0" : "rotate-180"}`} />
                  </button>
                </div>
              </div>

              {/* Right Column: Editor */}
              <div className="w-2/3 p-6 overflow-y-auto">
                {selectedPrompt ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
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
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Content</label>
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
                    <div className="flex items-center justify-between">
                      <Checkbox
                        checked={selectedPrompt.enabled}
                        onChange={(e) =>
                          handleUpdatePrompt(selectedPrompt.id, {
                            enabled: e.target.checked,
                          })
                        }
                      >
                        Enabled
                      </Checkbox>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDuplicatePrompt(selectedPrompt.id)}
                          className="flex items-center gap-1.5 p-1.5 text-xs text-gray-600 hover:text-blue-600 rounded-md hover:bg-gray-100 transition-colors"
                          title="Duplicate Prompt"
                        >
                          <Copy size={14} /> Duplicate
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(selectedPrompt.id)}
                          className="flex items-center gap-1.5 p-1.5 text-xs text-gray-600 hover:text-red-600 rounded-md hover:bg-gray-100 transition-colors"
                          title="Delete Prompt"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
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
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Save & Close
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}