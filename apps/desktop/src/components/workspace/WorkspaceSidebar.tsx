import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { FileTree } from './FileTree';
import { SelectedFilesPanel } from './SelectedFilesPanel';

export function WorkspaceSidebar() {
  const { rootPath } = useWorkspaceStore();

  return (
    <PanelGroup
      direction="vertical"
      className="h-full w-full bg-gray-50 dark:bg-[#171717]"
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
          <PanelResizeHandle className="h-px bg-gray-200 hover:bg-gray-400 transition-colors data-[resize-handle-state=drag]:bg-gray-400 dark:bg-[#262626] dark:hover:bg-[#404040] dark:data-[resize-handle-state=drag]:bg-[#404040]" />
          <Panel defaultSize={35} minSize={10} id="selected-files" order={2}>
            <SelectedFilesPanel />
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}
