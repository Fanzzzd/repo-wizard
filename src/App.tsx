import { Layout } from "./components/Layout";
import { FileTree } from "./components/workspace/FileTree";
import { MainPanel } from "./components/MainPanel";
import { useReviewStore } from "./store/reviewStore";
import { ChangeList } from "./components/review/ChangeList";
import { ReviewPanel } from "./components/review/ReviewPanel";
import { PromptComposer } from "./components/prompt/PromptComposer";
import { TabbedPanel } from "./components/TabbedPanel";
import { Header } from "./components/Header";

function App() {
  const { isReviewing } = useReviewStore();

  const workspaceRightPanel = (
    <TabbedPanel
      tabs={{
        Compose: <PromptComposer />,
        Review: <ReviewPanel />,
      }}
    />
  );

  const leftPanel = isReviewing ? <ChangeList /> : <FileTree />;
  const rightPanel = isReviewing ? <ReviewPanel /> : workspaceRightPanel;

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
    </div>
  );
}

export default App;