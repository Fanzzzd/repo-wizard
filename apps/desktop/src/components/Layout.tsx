import { useEffect, useRef } from 'react';
import {
  type ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { cn } from '../lib/utils';
import { useReviewStore } from '../store/reviewStore';

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
    <PanelGroup
      direction="horizontal"
      className="h-full w-full bg-white dark:bg-[#171717]"
    >
      <Panel defaultSize={25} minSize={15} id="left-panel" order={1}>
        {leftPanel}
      </Panel>
      <PanelResizeHandle className="w-px bg-gray-200 hover:bg-gray-400 transition-colors data-[resize-handle-state=drag]:bg-gray-400 dark:bg-[#262626] dark:hover:bg-[#404040] dark:data-[resize-handle-state=drag]:bg-[#404040]" />
      <Panel minSize={40} id="main-panel" order={2}>
        {mainPanel}
      </Panel>
      <PanelResizeHandle
        className={cn(
          'w-px bg-gray-200 hover:bg-gray-400 transition-colors data-[resize-handle-state=drag]:bg-gray-400 dark:bg-[#262626] dark:hover:bg-[#404040] dark:data-[resize-handle-state=drag]:bg-[#404040]',
          isReviewing && 'hidden'
        )}
      />
      <Panel
        ref={rightPanelRef}
        defaultSize={30}
        minSize={20}
        collapsible={true}
        id="right-panel"
        order={3}
      >
        <div className={cn(isReviewing ? 'hidden' : 'h-full flex flex-col')}>
          {rightPanel}
        </div>
      </Panel>
    </PanelGroup>
  );
}
