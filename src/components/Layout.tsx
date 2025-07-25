import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from 'react-resizable-panels';
import { useReviewStore } from '../store/reviewStore';
import { useRef, useEffect } from 'react';

interface LayoutProps {
  leftPanel: React.ReactNode;
  mainPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export function Layout({ leftPanel, mainPanel, rightPanel }: LayoutProps) {
  const { isReviewing } = useReviewStore();
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  useEffect(() => {
    const panel = rightPanelRef.current;
    if (panel) {
      if (isReviewing) {
        if (!panel.isCollapsed()) {
          panel.collapse();
        }
      } else {
        if (panel.isCollapsed()) {
          panel.expand();
        }
      }
    }
  }, [isReviewing]);

  return (
    <PanelGroup direction="horizontal" className="h-full w-full bg-white">
      <Panel defaultSize={25} minSize={15}>
        {leftPanel}
      </Panel>
      <PanelResizeHandle className="w-px bg-gray-200 hover:bg-blue-500 transition-colors data-[resize-handle-state=drag]:bg-blue-500" />
      <Panel minSize={40}>{mainPanel}</Panel>
      <PanelResizeHandle
        className={`w-px bg-gray-200 hover:bg-blue-500 transition-colors data-[resize-handle-state=drag]:bg-blue-500 ${
          isReviewing ? 'hidden' : ''
        }`}
      />
      <Panel
        ref={rightPanelRef}
        defaultSize={30}
        minSize={20}
        collapsible={true}
      >
        <div className={isReviewing ? 'hidden' : 'h-full flex flex-col'}>
          {rightPanel}
        </div>
      </Panel>
    </PanelGroup>
  );
}
