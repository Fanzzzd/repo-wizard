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
import { Tooltip } from "./components/common/Tooltip";

/**
 * The root component of the application.
 * It orchestrates the main layout and switches between workspace and review modes.
 */
function App() {
  const { isReviewing } = useReviewStore();

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