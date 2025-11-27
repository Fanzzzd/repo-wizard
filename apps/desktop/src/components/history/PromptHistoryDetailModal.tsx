import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useHistoryStore } from '../../store/historyStore';
import type { PromptHistoryEntry } from '../../types/prompt';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';

interface PromptHistoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: PromptHistoryEntry | null;
}

export function PromptHistoryDetailModal({
  isOpen,
  onClose,
  entry,
}: PromptHistoryDetailModalProps) {
  const [editedInstructions, setEditedInstructions] = useState('');
  const { updatePromptHistoryEntry } = useHistoryStore();

  useEffect(() => {
    if (entry) {
      setEditedInstructions(entry.instructions);
    }
  }, [entry]);

  const handleSave = () => {
    if (entry) {
      updatePromptHistoryEntry(entry.id, editedInstructions);
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!entry) return null;

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
            className="bg-white dark:bg-[#171717] rounded-lg shadow-xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="p-4 border-b border-gray-200 dark:border-[#262626] flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-[#f5f5f5]">
                View/Edit Prompt History
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-[#262626] dark:hover:text-[#ededed]"
              >
                <X size={20} />
              </button>
            </header>
            <main className="flex-grow p-4 bg-gray-50 dark:bg-[#0a0a0a] overflow-y-auto">
              <Textarea
                className="w-full h-full resize-none font-mono text-sm"
                value={editedInstructions}
                onChange={(e) => setEditedInstructions(e.target.value)}
              />
            </main>
            <footer className="bg-gray-100 dark:bg-[#0a0a0a]/50 px-4 py-3 flex justify-end gap-3 border-t border-gray-200 dark:border-[#262626] flex-shrink-0">
              <Button onClick={onClose} variant="secondary" size="md">
                Cancel
              </Button>
              <Button onClick={handleSave} variant="primary" size="md">
                Save Changes
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
