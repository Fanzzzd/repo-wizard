import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useDialogStore } from '../../store/dialogStore';
import { AnimatePresence, motion } from 'motion/react';
import { Textarea } from './Textarea';
import { Checkbox } from './Checkbox';
import { Button } from './Button';
import { getCliStatus, installCliShim } from '../../services/tauriApi';
import type { CliStatusResult } from '../../types';
import { showErrorDialog } from '../../lib/errorHandler';
import { Input } from './Input';
import {
  X,
  RefreshCw,
  BadgeCheck,
  Terminal,
  AlertTriangle,
  Settings,
  FolderTree,
  MessageSquare,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CliSettings() {
  const [cliStatus, setCliStatus] = useState<CliStatusResult>({
    status: 'checking',
  });
  const { open: openDialog } = useDialogStore();

  const checkCli = async () => {
    try {
      const result = await getCliStatus();
      setCliStatus(result);
    } catch (e) {
      setCliStatus({
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  useEffect(() => {
    checkCli();
  }, []);

  const handleSetupCli = async () => {
    try {
      const result = await installCliShim();
      await openDialog({
        title: 'CLI Setup',
        content: result.message,
        status: 'success',
      });
      await checkCli();
    } catch (e) {
      showErrorDialog(e);
      await checkCli();
    }
  };

  const renderStatus = () => {
    switch (cliStatus.status) {
      case 'checking':
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled
            leftIcon={<RefreshCw size={14} className="animate-spin" />}
          >
            Checking...
          </Button>
        );
      case 'installed':
        return (
          <div className="flex items-center gap-2 text-sm text-green-700 p-2 bg-green-50 rounded-md">
            <BadgeCheck size={16} />
            <span className="font-medium">CLI is installed.</span>
          </div>
        );
      case 'not_installed':
        return (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSetupCli}
            leftIcon={<Terminal size={14} />}
          >
            Setup CLI
          </Button>
        );
      case 'error':
        return (
          <div
            className="flex items-center gap-2 text-sm text-red-700 p-2 bg-red-50 rounded-md"
            title={cliStatus.error}
          >
            <AlertTriangle size={16} />
            <span className="font-medium">Error checking status</span>
          </div>
        );
    }
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-800 mb-4">
        Command Line Tool
      </h3>
      <div className="flex items-center gap-2">{renderStatus()}</div>
      <p className="text-xs text-gray-500 mt-2">
        Install the `repowizard` command to open projects from your terminal.
      </p>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState('general');

  const {
    respectGitignore,
    customIgnorePatterns,
    autoReviewOnPaste,
    customSystemPrompt,
    promptHistoryLimit,
    enableClipboardReview,
    showPasteResponseArea,
    setRespectGitignore,
    setCustomIgnorePatterns,
    setAutoReviewOnPaste,
    setCustomSystemPrompt,
    setPromptHistoryLimit,
    setEnableClipboardReview,
    setShowPasteResponseArea,
  } = useSettingsStore();

  const categories = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'fileTree', label: 'File Tree', icon: FolderTree },
    { id: 'prompting', label: 'Prompting', icon: MessageSquare },
    { id: 'cli', label: 'Command Line', icon: Terminal },
  ];

  useEffect(() => {
    if (isOpen) {
      setActiveCategory('general');
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const clipboardReviewIsDisablable = showPasteResponseArea;
  const pasteAreaIsDisablable = enableClipboardReview;
  const disableReason = 'At least one review input method must be enabled.';

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
            onClick={e => e.stopPropagation()}
          >
            <header className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Settings</h2>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </header>

            <main className="flex-grow flex min-h-0 bg-gray-50">
              <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
                <div className="p-2 space-y-1">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`w-full flex items-center gap-3 p-2 text-sm rounded-md text-left transition-colors ${
                        activeCategory === cat.id
                          ? 'bg-blue-100 text-blue-800 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <cat.icon
                        size={16}
                        className={
                          activeCategory === cat.id
                            ? 'text-blue-600'
                            : 'text-gray-500'
                        }
                      />
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-2/3 p-6 overflow-y-auto thin-scrollbar select-text">
                {activeCategory === 'general' && (
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-800">
                      General
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prompt History Limit
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="200"
                        className="w-24"
                        value={promptHistoryLimit}
                        onChange={e => {
                          const value = parseInt(e.target.value, 10);
                          if (!isNaN(value)) {
                            setPromptHistoryLimit(Math.max(1, value));
                          }
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Max prompts to keep per project (1-200).
                      </p>
                    </div>
                  </div>
                )}

                {activeCategory === 'fileTree' && (
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-800">
                      File Tree
                    </h3>
                    <Checkbox
                      checked={respectGitignore}
                      onChange={e => setRespectGitignore(e.target.checked)}
                    >
                      Respect .gitignore
                    </Checkbox>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Ignore Patterns
                      </label>
                      <Textarea
                        rows={6}
                        className="text-xs"
                        placeholder={
                          '# .gitignore syntax\nnode_modules\ndist/\n*.log'
                        }
                        value={customIgnorePatterns}
                        onChange={e => setCustomIgnorePatterns(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {activeCategory === 'prompting' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold text-gray-800 mb-2">
                        Review Workflow
                      </h3>
                      <div className="space-y-2 pl-2 border-l-2 border-gray-200">
                        <Checkbox
                          checked={autoReviewOnPaste}
                          onChange={e => setAutoReviewOnPaste(e.target.checked)}
                        >
                          Auto-start review on paste
                        </Checkbox>
                        <Checkbox
                          checked={enableClipboardReview}
                          onChange={e =>
                            setEnableClipboardReview(e.target.checked)
                          }
                          disabled={!clipboardReviewIsDisablable}
                          title={
                            !clipboardReviewIsDisablable ? disableReason : ''
                          }
                        >
                          Show "Review from Clipboard" button
                        </Checkbox>
                        <Checkbox
                          checked={showPasteResponseArea}
                          onChange={e =>
                            setShowPasteResponseArea(e.target.checked)
                          }
                          disabled={!pasteAreaIsDisablable}
                          title={!pasteAreaIsDisablable ? disableReason : ''}
                        >
                          Show manual paste area for responses
                        </Checkbox>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800 mb-2">
                        Prompt Content
                      </h3>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom System Prompt
                      </label>
                      <Textarea
                        rows={12}
                        className="text-xs"
                        placeholder="Enter your custom system prompt..."
                        value={customSystemPrompt}
                        onChange={e => setCustomSystemPrompt(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {activeCategory === 'cli' && <CliSettings />}
              </div>
            </main>

            <footer className="bg-gray-100 px-4 py-3 flex justify-end gap-3 border-t border-gray-200 flex-shrink-0">
              <Button onClick={onClose} variant="primary" size="md">
                Done
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}