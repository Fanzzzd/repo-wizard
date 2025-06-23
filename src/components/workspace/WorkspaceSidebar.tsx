import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { FileTree } from "./FileTree";
import { SelectedFilesPanel } from "./SelectedFilesPanel";

export function WorkspaceSidebar() {
  return (
    <PanelGroup direction="vertical" className="h-full w-full bg-gray-50">
      <Panel defaultSize={65} minSize={30}>
        <FileTree />
      </Panel>
      <PanelResizeHandle className="h-px bg-gray-200 hover:bg-blue-500 transition-colors data-[resize-handle-state=drag]:bg-blue-500" />
      <Panel defaultSize={35} minSize={10}>
        <SelectedFilesPanel />
      </Panel>
    </PanelGroup>
  );
}