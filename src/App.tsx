import { useEffect } from "react";
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
import { useUpdateStore } from "./store/updateStore";
import { ContextMenu } from "./components/common/ContextMenu";

/**
 * The root component of the application.
 * It orchestrates the main layout and switches between workspace and review modes.
 */
function App() {
  const { isReviewing } = useReviewStore();
  const { open: openDialog } = useDialogStore();
  const { status, updateInfo, install } = useUpdateStore();

  useEffect(() => {
    // Initiate update check on startup via the store
    useUpdateStore.getState().check();
  }, []);

  useEffect(() => {
    // React to the update status to show a dialog when the update is downloaded and ready.
    const showUpdateDialog = async () => {
      if (status === "ready" && updateInfo) {
        const confirmed = await openDialog({
          title: "Update Ready",
          content: (
            <div>
              <p>A new version ({updateInfo.version}) has been downloaded. You are using {__APP_VERSION__}.</p>
              <p className="mt-2 text-sm text-gray-500">Release Notes:</p>
              <div className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-gray-50 p-2 text-sm">
                <pre className="whitespace-pre-wrap font-sans">
                  {updateInfo.body ?? "No release notes available."}
                </pre>
              </div>
              <p className="mt-4">Would you like to restart now to apply the update?</p>
            </div>
          ),
          type: "confirm",
          status: "info",
          confirmText: "Relaunch Now",
        });

        if (confirmed) {
          await install();
        }
      }
    };
    showUpdateDialog();
  }, [status, updateInfo, openDialog, install]);

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
      <ContextMenu />
    </div>
  );
}

export default App;