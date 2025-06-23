import { Layout } from "./components/Layout";
import { MainPanel } from "./components/MainPanel";
import { useReviewStore } from "./store/reviewStore";
import { ChangeList } from "./components/review/ChangeList";
import { PromptComposer } from "./components/prompt/PromptComposer";
import { TabbedPanel } from "./components/TabbedPanel";
import { Header } from "./components/Header";
import { HistoryPanel } from "./components/history/HistoryPanel";
import { WorkspaceSidebar } from "./components/workspace/WorkspaceSidebar";
import { ApplyChangesPanel } from "./components/review/ApplyChangesPanel";
import { ModalDialog } from "./components/common/ModalDialog";

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

  const leftPanel = isReviewing ? <ChangeList /> : <WorkspaceSidebar />;
  const rightPanel = isReviewing ? <ApplyChangesPanel /> : workspaceRightPanel;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-grow min-h-0">
        <Layout
          leftPanel={leftPanel}
          mainPanel={<MainPanel />}
          rightPanel={rightPanel}
        />
      </div>
      <ModalDialog />
    </div>
  );
}

export default App;