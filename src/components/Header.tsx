import { Settings, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { AnimatePresence, motion } from "motion/react";

export function Header() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    respectGitignore,
    customIgnorePatterns,
    autoReviewOnPaste,
    customSystemPrompt,
    setRespectGitignore,
    setCustomIgnorePatterns,
    setAutoReviewOnPaste,
    setCustomSystemPrompt,
  } = useSettingsStore();
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [settingsPanelRef]);

  return (
    <header className="flex items-center justify-between p-2 border-b border-gray-200 bg-white flex-shrink-0">
      <h1 className="text-lg font-semibold text-gray-800">Repo Wizard</h1>
      <div className="relative" ref={settingsPanelRef}>
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900"
          title="Settings"
        >
          <Settings size={20} />
        </button>
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 mt-2 w-80 origin-top-right bg-white border border-gray-200 rounded-lg shadow-xl z-10 p-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">Settings</h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                    checked={respectGitignore}
                    onChange={(e) => setRespectGitignore(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">
                    Respect .gitignore
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                    checked={autoReviewOnPaste}
                    onChange={(e) => setAutoReviewOnPaste(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">
                    Auto-review on paste
                  </span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom System Prompt
                  </label>
                  <textarea
                    rows={6}
                    className="w-full p-2 border border-gray-300 rounded-md font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your custom system prompt..."
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Ignore Patterns
                  </label>
                  <textarea
                    rows={6}
                    className="w-full p-2 border border-gray-300 rounded-md font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={
                      "# .gitignore syntax\nnode_modules\ndist/\n*.log"
                    }
                    value={customIgnorePatterns}
                    onChange={(e) =>
                      setCustomIgnorePatterns(e.target.value)
                    }
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}