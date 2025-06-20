import { Layout } from "./components/Layout";
import { FileTree } from "./components/workspace/FileTree";
import { MainPanel } from "./components/MainPanel";
import { useReviewStore } from "./store/reviewStore";
import { ChangeList } from "./components/review/ChangeList";
import { ReviewPanel } from "./components/review/ReviewPanel";
import { PromptComposer } from "./components/prompt/PromptComposer";
import { TabbedPanel } from "./components/TabbedPanel";
import { Header } from "./components/Header";

/**
 * The main application component.
 * Renders the overall layout of the application and dynamically switches views
 * based on the application state (e.g., whether it is in review mode).
 */
function App() {
  // Get the isReviewing state from the review store to determine if the app is in code review mode.
  const { isReviewing } = useReviewStore();

  // Define the content for the right panel in workspace mode.
  // It's a tabbed panel containing "Compose" and "Review" tabs.
  const workspaceRightPanel = (
    <TabbedPanel
      tabs={{
        Compose: <PromptComposer />,
        Review: <ReviewPanel />,
      }}
    />
  );

  // Dynamically determine the content of the left and right panels based on the isReviewing state.
  // If in review mode (isReviewing is true):
  // - The left panel shows the ChangeList.
  // - The right panel shows the ReviewPanel.
  // Otherwise (in workspace mode):
  // - The left panel shows the FileTree.
  // - The right panel shows the workspaceRightPanel, a tabbed view with PromptComposer and ReviewPanel.
  const leftPanel = isReviewing ? <ChangeList /> : <FileTree />;
  const rightPanel = isReviewing ? <ReviewPanel /> : workspaceRightPanel;

  return (
    // Root element, defining the app's basic styles and layout.
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* The application's header component */}
      <Header />
      {/* Main content area, takes up remaining vertical space and allows content to scroll */}
      <div className="flex-grow min-h-0">
        {/* Use the Layout component to organize the three panels: left, main, and right */}
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