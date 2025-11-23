import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FileTree } from './FileTree';
import { SelectedFilesPanel } from './SelectedFilesPanel';
import { useWorkspaceStore } from '../../store/workspaceStore';

export function WorkspaceSidebar() {
  const { rootPath } = useWorkspaceStore();

  return (
    <PanelGroup
      direction="vertical"
      className="h-full w-full bg-gray-50 dark:bg-gray-800"
    >
      <Panel
        defaultSize={rootPath ? 65 : 100}
        minSize={30}
        id="file-tree"
        order={1}
      >
        <FileTree />
      </Panel>
      {rootPath && (
        <>
          <PanelResizeHandle className="h-px bg-gray-200 hover:bg-blue-500 transition-colors data-[resize-handle-state=drag]:bg-blue-500 dark:bg-gray-700" />
          <Panel
            defaultSize={35}
            minSize={10}
            id="selected-files"
            order={2}
          >
            <SelectedFilesPanel />
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}