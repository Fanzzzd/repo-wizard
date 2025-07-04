import { useState, useEffect } from "react";
import { useSettingsStore } from "../../store/settingsStore";
import type { MetaPrompt } from "../../types";
import { v4 as uuidv4 } from "uuid";
import { X, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Input } from "../common/Input";
import { Textarea } from "../common/Textarea";
import { Checkbox } from "../common/Checkbox";

interface MetaPromptsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MetaPromptsManagerModal({
  isOpen,
  onClose,
}: MetaPromptsManagerModalProps) {
  const { metaPrompts, setMetaPrompts } = useSettingsStore();
  const [localPrompts, setLocalPrompts] = useState<MetaPrompt[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLocalPrompts(JSON.parse(JSON.stringify(metaPrompts)));
    }
  }, [isOpen, metaPrompts]);

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
    setLocalPrompts(localPrompts.filter((p) => p.id !== id));
  };

  const handleAddPrompt = () => {
    const newPrompt: MetaPrompt = {
      id: uuidv4(),
      name: "New Meta Prompt",
      content: "",
      enabled: true,
    };
    setLocalPrompts([...localPrompts, newPrompt]);
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
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden"
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

            <main className="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-50">
              {localPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <Input
                      type="text"
                      value={prompt.name}
                      onChange={(e) =>
                        handleUpdatePrompt(prompt.id, { name: e.target.value })
                      }
                      className="font-semibold flex-grow"
                      placeholder="Meta Prompt Name"
                    />
                    <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0">
                      <Checkbox
                        checked={prompt.enabled}
                        onChange={(e) =>
                          handleUpdatePrompt(prompt.id, {
                            enabled: e.target.checked,
                          })
                        }
                      >
                        Enabled
                      </Checkbox>
                      <button
                        onClick={() => handleDeletePrompt(prompt.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors"
                        title="Delete Prompt"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <Textarea
                    value={prompt.content}
                    onChange={(e) =>
                      handleUpdatePrompt(prompt.id, {
                        content: e.target.value,
                      })
                    }
                    className="bg-gray-50 text-xs h-32"
                    placeholder="Enter meta prompt content..."
                  />
                </div>
              ))}
              <button
                onClick={handleAddPrompt}
                className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 border-2 border-dashed rounded-md hover:bg-gray-100 hover:border-gray-300 text-gray-500 transition-colors"
              >
                <Plus size={16} /> Add Meta Prompt
              </button>
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