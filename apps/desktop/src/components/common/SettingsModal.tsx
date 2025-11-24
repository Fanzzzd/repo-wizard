import {
  AlertTriangle,
  BadgeCheck,
  FolderTree,
  MessageSquare,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Settings,
  Sun,
  Terminal,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CliStatusResult } from '../../bindings';
import { showErrorDialog } from '../../lib/errorHandler';
import { cn } from '../../lib/utils';
import { getCliStatus, installCliShim } from '../../services/tauriApi';
import { useDialogStore } from '../../store/dialogStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Input } from './Input';
import { SegmentedControl } from './SegmentedControl';
import { Textarea } from './Textarea';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CliState = CliStatusResult | { status: 'checking'; error?: null };

function CliSettings() {
  const [cliStatus, setCliStatus] = useState<CliState>({
    status: 'checking',
  });
  const { open: openDialog } = useDialogStore();

  const checkCli = useCallback(async () => {
    try {
      const result = await getCliStatus();
      setCliStatus(result);
    } catch (e) {
      setCliStatus({
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  useEffect(() => {
    checkCli();
  }, [checkCli]);

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
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 p-2 bg-green-50 dark:bg-green-500/10 rounded-md">
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
            className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300 p-2 bg-red-50 dark:bg-red-500/10 rounded-md"
            title={cliStatus.error || undefined}
          >
            <AlertTriangle size={16} />
            <span className="font-medium">Error checking status</span>
          </div>
        );
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">{renderStatus()}</div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Install the `repowizard` command to open projects from your terminal.
      </p>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState('general');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const isScrollingToSection = useRef(false);

  const { theme, setTheme } = useTheme();

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

  const categories = useMemo(
    () => [
      { id: 'general', label: 'General', icon: Settings },
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'fileTree', label: 'File Tree', icon: FolderTree },
      { id: 'prompting', label: 'Prompting & Review', icon: MessageSquare },
      { id: 'cli', label: 'Command Line', icon: Terminal },
    ],
    []
  );

  const themeOptions = useMemo(
    () => [
      {
        value: 'light' as const,
        label: (
          <span className="flex items-center gap-2">
            <Sun size={14} /> Light
          </span>
        ),
      },
      {
        value: 'dark' as const,
        label: (
          <span className="flex items-center gap-2">
            <Moon size={14} /> Dark
          </span>
        ),
      },
      {
        value: 'system' as const,
        label: (
          <span className="flex items-center gap-2">
            <Monitor size={14} /> System
          </span>
        ),
      },
    ],
    []
  );

  const handleCategoryClick = (id: string) => {
    const element = sectionRefs.current[id];
    const container = scrollContainerRef.current;
    if (element && container) {
      isScrollingToSection.current = true;
      setActiveCategory(id);
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const offset = elementRect.top - containerRect.top;
      const topPadding = 18; // Corresponds to p-6 styling
      const desiredScrollTop = container.scrollTop + offset - topPadding;

      container.scrollTo({
        top: desiredScrollTop,
        behavior: 'smooth',
      });
      setTimeout(() => {
        isScrollingToSection.current = false;
      }, 1000);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const intersectingStatus = new Map<string, boolean>();
    categories.forEach((c) => {
      intersectingStatus.set(c.id, false);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingToSection.current) return;

        entries.forEach((entry) => {
          intersectingStatus.set(entry.target.id, entry.isIntersecting);
        });

        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollHeight - scrollTop - clientHeight < 1) {
          setActiveCategory(categories[categories.length - 1].id);
          return;
        }

        let topEntry: { id: string; top: number } | null = null;
        for (const cat of categories) {
          if (intersectingStatus.get(cat.id)) {
            const el = sectionRefs.current[cat.id];
            if (el) {
              const rect = el.getBoundingClientRect();
              if (topEntry === null || rect.top < topEntry.top) {
                topEntry = { id: cat.id, top: rect.top };
              }
            }
          }
        }

        if (topEntry) {
          setActiveCategory(topEntry.id);
        }
      },
      {
        root: container,
        rootMargin: '0px 0px -80% 0px',
        threshold: 0,
      }
    );

    categories.forEach((cat) => {
      const el = sectionRefs.current[cat.id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [isOpen, categories]);

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
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Settings
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </header>

            <main className="flex-grow flex min-h-0 bg-gray-50 dark:bg-gray-900">
              <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
                <div className="p-2 space-y-1">
                  {categories.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 text-sm rounded-md text-left transition-colors',
                        activeCategory === cat.id
                          ? 'bg-blue-100 text-blue-800 font-semibold dark:bg-blue-900/50 dark:text-blue-200'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      )}
                    >
                      <cat.icon
                        size={16}
                        className={cn(
                          activeCategory === cat.id
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      />
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div
                ref={scrollContainerRef}
                className="w-2/3 p-6 bg-gray-100 dark:bg-gray-900 overflow-y-auto thin-scrollbar"
              >
                <div className="max-w-3xl mx-auto space-y-6">
                  <section
                    id="general"
                    ref={(el) => {
                      sectionRefs.current.general = el;
                    }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                  >
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <Settings size={20} /> General
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Configure core application behavior and preferences.
                      </p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div>
                        <label
                          htmlFor="history-limit"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Prompt History Limit
                        </label>
                        <Input
                          id="history-limit"
                          type="number"
                          min="1"
                          max="200"
                          className="w-24"
                          value={promptHistoryLimit}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            if (!Number.isNaN(value)) {
                              setPromptHistoryLimit(Math.max(1, value));
                            }
                          }}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Max prompts to keep per project (1-200).
                        </p>
                      </div>
                    </div>
                  </section>

                  <section
                    id="appearance"
                    ref={(el) => {
                      sectionRefs.current.appearance = el;
                    }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                  >
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <Palette size={20} /> Appearance
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Customize the look and feel of the application.
                      </p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div>
                        <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Theme
                        </div>
                        <SegmentedControl
                          options={themeOptions}
                          value={theme as 'light' | 'dark' | 'system'}
                          onChange={setTheme}
                          layoutId="theme-selector"
                        />
                      </div>
                    </div>
                  </section>

                  <section
                    id="fileTree"
                    ref={(el) => {
                      sectionRefs.current.fileTree = el;
                    }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                  >
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <FolderTree size={20} /> File Tree
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Customize how files and directories are displayed and
                        ignored.
                      </p>
                    </div>
                    <div className="p-6 space-y-6">
                      <Checkbox
                        checked={respectGitignore}
                        onChange={(e) => setRespectGitignore(e.target.checked)}
                      >
                        Respect .gitignore
                      </Checkbox>
                      <div>
                        <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Custom Ignore Patterns
                        </div>
                        <Textarea
                          rows={6}
                          className="text-xs"
                          placeholder={
                            '# .gitignore syntax\nnode_modules\ndist/\n*.log'
                          }
                          value={customIgnorePatterns}
                          onChange={(e) =>
                            setCustomIgnorePatterns(e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </section>

                  <section
                    id="prompting"
                    ref={(el) => {
                      sectionRefs.current.prompting = el;
                    }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                  >
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <MessageSquare size={20} /> Prompting & Review
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Control how prompts are generated and how AI responses
                        are handled.
                      </p>
                    </div>
                    <div className="p-6 space-y-8">
                      <div>
                        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
                          Review Workflow
                        </h4>
                        <div className="space-y-3 pl-2">
                          <Checkbox
                            checked={autoReviewOnPaste}
                            onChange={(e) =>
                              setAutoReviewOnPaste(e.target.checked)
                            }
                          >
                            Auto-start review on paste
                          </Checkbox>
                          <Checkbox
                            checked={enableClipboardReview}
                            onChange={(e) =>
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
                            onChange={(e) =>
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
                        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
                          Prompt Content
                        </h4>
                        <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Custom System Prompt
                        </div>
                        <Textarea
                          rows={12}
                          className="text-xs"
                          placeholder="Enter your custom system prompt..."
                          value={customSystemPrompt}
                          onChange={(e) =>
                            setCustomSystemPrompt(e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </section>

                  <section
                    id="cli"
                    ref={(el) => {
                      sectionRefs.current.cli = el;
                    }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                  >
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <Terminal size={20} /> Command Line
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Integrate Repo Wizard with your terminal.
                      </p>
                    </div>
                    <div className="p-6">
                      <CliSettings />
                    </div>
                  </section>
                </div>
              </div>
            </main>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
