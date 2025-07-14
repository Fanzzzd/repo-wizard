import {
  Settings,
  X,
  RefreshCw,
  CheckCircle,
  DownloadCloud,
  ArrowUpCircle,
  AlertCircle,
  BadgeCheck,
  BadgeX,
  Terminal,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { useUpdateStore } from "../store/updateStore";
import { useDialogStore } from "../store/dialogStore";
import { AnimatePresence, motion } from "motion/react";
import { Textarea } from "./common/Textarea";
import { Checkbox } from "./common/Checkbox";
import { Button } from "./common/Button";
import { getCliStatus } from "../services/tauriApi";
import { platform } from "@tauri-apps/plugin-os";
import type { CliStatusResult } from "../types";

function VersionStatus() {
  const { status, check, error } = useUpdateStore();

  const isChecking = status === "pending" || status === "downloading";

  const statusMap = {
    idle: {
      icon: <RefreshCw size={14} />,
      text: `v${__APP_VERSION__}`,
      style: "text-gray-600 hover:bg-gray-200",
      title: "Check for updates",
    },
    pending: {
      icon: <RefreshCw size={14} className="animate-spin" />,
      text: "Checking...",
      style: "text-gray-500 bg-gray-100",
      title: "Checking for updates...",
    },
    "up-to-date": {
      icon: <CheckCircle size={14} />,
      text: "Up to date",
      style: "text-green-700 bg-green-100",
      title: `You are on the latest version: v${__APP_VERSION__}`,
    },
    downloading: {
      icon: <DownloadCloud size={14} />,
      text: "Downloading...",
      style: "text-blue-700 bg-blue-100 animate-pulse",
      title: "Downloading update...",
    },
    ready: {
      icon: <ArrowUpCircle size={14} />,
      text: "Update available",
      style: "text-green-700 bg-green-100 hover:bg-green-200 font-semibold",
      title: "An update is ready to install",
    },
    error: {
      icon: <AlertCircle size={14} />,
      text: "Update failed",
      style: "text-red-700 bg-red-100 hover:bg-red-200",
      title: `Error: ${error}`,
    },
  };

  const currentStatus = statusMap[status];

  return (
    <Button
      onClick={check}
      disabled={isChecking}
      variant="ghost"
      size="sm"
      className={`font-medium ${currentStatus.style}`}
      title={currentStatus.title}
      leftIcon={currentStatus.icon}
    >
      {currentStatus.text}
    </Button>
  );
}

function CliSettings() {
  const [cliStatus, setCliStatus] = useState<CliStatusResult>({
    status: "checking",
    executablePath: "",
    executableDir: "",
  });
  const { open: openDialog } = useDialogStore();

  const checkCli = async () => {
    try {
      const result = await getCliStatus();
      setCliStatus(result);
    } catch (e: any) {
      console.error(e);
      setCliStatus({
        status: "error",
        executablePath: "",
        executableDir: "",
        error: e.message || "Failed to check status.",
      });
    }
  };

  useEffect(() => {
    checkCli();
  }, []);

  const handleSetupCli = async () => {
    const osType = await platform();
    const { executablePath, executableDir } = cliStatus;

    if (!executablePath) {
      openDialog({
        title: "Error",
        content: "Could not determine this application's executable path.",
        status: "error",
      });
      return;
    }

    let instructions;

    if (osType === "macos" || osType === "linux") {
      const command = `sudo ln -sf "${executablePath}" /usr/local/bin/repowizard`;
      instructions = (
        <div className="space-y-2 text-left">
          <p>
            To use `repowizard` from your terminal, create a symbolic link by
            running this command:
          </p>
          <pre className="p-2 bg-gray-800 text-white rounded text-xs whitespace-pre-wrap break-all font-mono">
            {command}
          </pre>
          <p className="text-xs text-gray-500">
            You might be prompted for your password.
          </p>
        </div>
      );
    } else if (osType === "windows") {
      instructions = (
        <div className="space-y-2 text-left">
          <p>
            To use `repowizard.exe` from your terminal, add its folder to your
            system's PATH:
          </p>
          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>
              Press <span className="font-semibold">Windows Key</span>, type "env", and
              select "Edit the system environment variables".
            </li>
            <li>In the System Properties window, click "Environment Variables...".</li>
            <li>Under "User variables", select "Path" and click "Edit...".</li>
            <li>Click "New" and paste in the following path:</li>
          </ol>
          <pre className="p-2 bg-gray-800 text-white rounded text-xs whitespace-pre-wrap break-all font-mono">
            {executableDir}
          </pre>
          <p className="text-xs text-gray-500">
            You may need to restart your terminal for the change to take effect.
          </p>
        </div>
      );
    } else {
      instructions =
        "CLI setup instructions are not available for your operating system.";
    }

    await openDialog({
      title: "Command Line (CLI) Setup",
      content: instructions,
      status: "info",
      cancelText: "Done",
    });

    await checkCli();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Command Line Tool
      </label>
      <div className="flex items-center gap-2">
        {cliStatus.status === "checking" && (
          <Button variant="ghost" size="sm" disabled leftIcon={<RefreshCw size={14} className="animate-spin" />}>
            Checking...
          </Button>
        )}
        {cliStatus.status === "installed" && (
          <div className="flex items-center gap-2 text-sm text-green-700 p-2 bg-green-50 rounded-md">
            <BadgeCheck size={16} />
            <span className="font-medium">`repowizard` command is installed.</span>
          </div>
        )}
        {cliStatus.status === "not_installed" && (
          <Button variant="secondary" size="sm" onClick={handleSetupCli} leftIcon={<Terminal size={14} />}>
            Setup CLI...
          </Button>
        )}
        {cliStatus.status === "error" && (
          <div className="flex items-center gap-2 text-sm text-red-700 p-2 bg-red-50 rounded-md">
            <BadgeX size={16} />
            <span className="font-medium" title={cliStatus.error}>Error checking status</span>
          </div>
        )}
      </div>
    </div>
  );
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
        <VersionStatus />
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
                className="absolute right-0 mt-2 w-96 origin-top-right bg-white border border-gray-200 rounded-lg shadow-xl z-10 p-4"
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
                  <CliSettings />
                  <div className="border-t border-gray-200" />
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