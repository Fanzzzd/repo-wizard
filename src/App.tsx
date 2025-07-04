import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Layout } from "./components/Layout";
import { MainPanel } from "./components/MainPanel";
import { useReviewStore } from "./store/reviewStore";
import { ChangeList } from "./components/review/ChangeList";
import { PromptComposer } from "./components/prompt/PromptComposer";
import { TabbedPanel } from "./components/TabbedPanel";
import { Header } from "./components/Header";
import { HistoryPanel } from "./components/history/HistoryPanel";
import { WorkspaceSidebar } from "./components/workspace/WorkspaceSidebar";
import { ModalDialog } from "./components/common/ModalDialog";
import { useDialogStore } from "./store/dialogStore";
import { Tooltip } from "./components/common/Tooltip";

/**
 * The root component of the application.
 * It orchestrates the main layout and switches between workspace and review modes.
 */
function App() {
  const { isReviewing } = useReviewStore();
  const { open: openDialog } = useDialogStore();

  useEffect(() => {
    const checkForUpdates = async () => {
      // Skip update check for pre-release versions
      if (__APP_VERSION__.includes("-")) {
        console.log("Skipping update check for pre-release version.");
        return;
      }

      try {
        const update = await check();
        if (update) {
          const confirmed = await openDialog({
            title: "Update Available",
            content: (
              <div>
                <p>A new version ({update.version}) is available. You have {__APP_VERSION__}.</p>
                <p className="mt-2 text-sm text-gray-500">Release Notes:</p>
                <div className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-gray-50 p-2 text-sm">
                  <pre className="whitespace-pre-wrap font-sans">{update.body}</pre>
                </div>
                <p className="mt-4">Would you like to install it now and restart?</p>
              </div>
            ),
            type: "confirm",
            status: "info",
            confirmText: "Install & Relaunch",
          });

          if (confirmed) {
            await update.downloadAndInstall();
            await relaunch();
          }
        }
      } catch (e) {
        console.error("Failed to check for updates:", e);
      }
    };

    checkForUpdates();
  }, [openDialog]);

  const workspaceRightPanel = (
    <TabbedPanel
      tabs={{
        "Compose & Review": <PromptComposer />,
        "History": <HistoryPanel />,
      }}
    />
  );

  // Dynamically set the layout panels based on the review state.
  // - In review mode, the layout becomes a two-panel view: [ChangeList | DiffEditor].
  // - In workspace mode, it's a three-panel view: [WorkspaceSidebar | CodeEditor | RightPanel].
  const leftPanel = isReviewing ? <ChangeList /> : <WorkspaceSidebar />;
  const rightPanel = isReviewing ? undefined : workspaceRightPanel;

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      <Header />
      <div className="flex-grow min-h-0">
        <Layout
          leftPanel={leftPanel}
          mainPanel={<MainPanel />}
          rightPanel={rightPanel}
        />
      </div>
      
      {/* Global components that can be displayed as overlays. */}
      <ModalDialog />
      <Tooltip />
    </div>
  );
}

export default App;