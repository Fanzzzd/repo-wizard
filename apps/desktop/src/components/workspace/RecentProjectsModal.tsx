import { useState, useMemo, useEffect, useRef } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Folder, Search, X } from 'lucide-react';

interface RecentProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (path: string) => void;
  onOpenAnother: () => void;
}

export function RecentProjectsModal({
  isOpen,
  onClose,
  onSelectProject,
  onOpenAnother,
}: RecentProjectsModalProps) {
  const { recentProjects, removeRecentProject } = useSettingsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) {
      return recentProjects;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    return recentProjects.filter(path =>
      path.toLowerCase().includes(lowerCaseSearch)
    );
  }, [recentProjects, searchTerm]);

  const handleSelect = (path: string) => {
    onSelectProject(path);
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
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <header className="p-4 border-b dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Open Project
              </h2>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </header>

            <div className="p-4 flex-shrink-0 border-b dark:border-gray-700">
              <div className="relative">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search recent projects..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                />
              </div>
            </div>

            <main className="flex-grow flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900 overflow-y-auto thin-scrollbar">
              {filteredProjects.length > 0 ? (
                <ul className="p-2 space-y-1">
                  {filteredProjects.map(path => (
                    <li key={path}>
                      <div
                        onClick={() => handleSelect(path)}
                        className="group w-full text-left p-3 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/50 text-gray-800 dark:text-gray-200 hover:text-blue-900 dark:hover:text-blue-200 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 flex-grow overflow-hidden">
                          <Folder
                            size={18}
                            className="text-yellow-600 flex-shrink-0"
                          />
                          <div className="flex-grow overflow-hidden">
                            <div className="font-semibold text-sm truncate">
                              {path.split(/[\\/]/).pop()}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {path}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            removeRecentProject(path);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 p-1 rounded-full flex-shrink-0"
                          title={`Remove from recent projects`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400 text-center">
                  <div>
                    <p>No projects found.</p>
                    <p className="text-sm">Try a different search term.</p>
                  </div>
                </div>
              )}
            </main>

            <footer className="bg-gray-100 dark:bg-gray-900/50 px-4 py-3 flex justify-between items-center border-t dark:border-gray-700 flex-shrink-0">
              <Button onClick={onOpenAnother} variant="secondary" size="md">
                Open from Disk...
              </Button>
              <Button onClick={onClose} variant="secondary" size="md">
                Cancel
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}