import { Settings, X, DownloadCloud, RefreshCw } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { useUpdateStore } from "../store/updateStore";
import { AnimatePresence, motion } from "motion/react";
import { Textarea } from "./common/Textarea";
import { Checkbox } from "./common/Checkbox";
import { Button } from "./common/Button";

function UpdateStatusIndicator() {
  const { status, install } = useUpdateStore();

  if (status === "downloading") {
    return (
      <div
        className="flex items-center gap-2 text-sm text-gray-600 animate-pulse"
        title="Downloading update..."
      >
        <DownloadCloud size={20} />
        <span>Downloading...</span>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <Button
        onClick={install}
        variant="ghost"
        size="sm"
        className="font-semibold bg-green-100 text-green-700 hover:bg-green-200"
        title="Relaunch to apply update"
        leftIcon={<RefreshCw size={16} />}
      >
        Relaunch to Update
      </Button>
    );
  }

  return null;
}

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
      <div className="flex items-center gap-4">
        <UpdateStatusIndicator />
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
                  <Checkbox
                    checked={respectGitignore}
                    onChange={(e) => setRespectGitignore(e.target.checked)}
                  >
                    Respect .gitignore
                  </Checkbox>

                  <Checkbox
                    checked={autoReviewOnPaste}
                    onChange={(e) => setAutoReviewOnPaste(e.target.checked)}
                  >
                    Auto-review on paste
                  </Checkbox>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom System Prompt
                    </label>
                    <Textarea
                      rows={6}
                      className="text-xs"
                      placeholder="Enter your custom system prompt..."
                      value={customSystemPrompt}
                      onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Ignore Patterns
                    </label>
                    <Textarea
                      rows={6}
                      className="text-xs"
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
      </div>
    </header>
  );
}