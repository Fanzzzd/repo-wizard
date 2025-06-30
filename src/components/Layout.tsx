import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

interface LayoutProps {
  leftPanel: React.ReactNode;
  mainPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function Layout({ leftPanel, mainPanel, rightPanel }: LayoutProps) {
  return (
    <PanelGroup direction="horizontal" className="h-full w-full bg-white">
      <Panel defaultSize={25} minSize={15}>
        {leftPanel}
      </Panel>
      <PanelResizeHandle className="w-px bg-gray-200 hover:bg-blue-500 transition-colors" />
      <Panel minSize={40}>
        {mainPanel}
      </Panel>
      {rightPanel && (
        <>
          <PanelResizeHandle className="w-px bg-gray-200 hover:bg-blue-500 transition-colors" />
          <Panel defaultSize={30} minSize={20}>
            {rightPanel}
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}