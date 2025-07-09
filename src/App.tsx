import { useEffect, useState, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import {
  Menu,
  Submenu,
  MenuItem,
  PredefinedMenuItem,
} from "@tauri-apps/api/menu";

import { Layout } from "./components/Layout";
import { MainPanel } from "./components/MainPanel";
import { ChangeList } from "./components/review/ChangeList";
import { PromptComposer } from "./components/prompt/PromptComposer";
import { TabbedPanel } from "./components/TabbedPanel";
import { Header } from "./components/Header";
import { PromptHistoryPanel } from "./components/history/PromptHistoryPanel";
import { WorkspaceSidebar } from "./components/workspace/WorkspaceSidebar";
import { ModalDialog } from "./components/common/ModalDialog";
import { Tooltip } from "./components/common/Tooltip";
import { ContextMenu } from "./components/common/ContextMenu";
import { useProjectStore } from "./store/projectStore";
import { useDialogStore } from "./store/dialogStore";
import { useUpdateStore } from "./store/updateStore";
import { useSettingsStore } from "./store/settingsStore";

declare global {
  interface Window {
    __RPO_WIZ_PROJECT_ROOT__?: string;
  }
}

function ProjectView({ rootPath }: { rootPath: string }) {
  const { init, isInitialized, isReviewing } = useProjectStore();

  useEffect(() => {
    init(rootPath);
  }, [init, rootPath]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading project...
      </div>
    );
  }

  const workspaceRightPanel = (
    <TabbedPanel
      tabs={{
        "Compose & Review": <PromptComposer />,
        "Prompt History": <PromptHistoryPanel />,
      }}
    />
  );

  const leftPanel = isReviewing ? <ChangeList /> : <WorkspaceSidebar />;
  const rightPanel = isReviewing ? undefined : workspaceRightPanel;

  return (
    <Layout
      leftPanel={leftPanel}
      mainPanel={<MainPanel />}
      rightPanel={rightPanel}
    />
  );
}

const WelcomeView = () => {
  const workspaceRightPanel = (
    <TabbedPanel
      tabs={{
        "Compose & Review": <PromptComposer />,
        "Prompt History": <PromptHistoryPanel />,
      }}
    />
  );
  
  return (
    <Layout
      leftPanel={<WorkspaceSidebar />}
      mainPanel={<MainPanel />}
      rightPanel={workspaceRightPanel}
    />
  );
}

function App() {
  const [projectRoot, setProjectRoot] = useState<string | null>(null);

  const { open: openDialog } = useDialogStore();
  const { status, updateInfo, install } = useUpdateStore();
  const { recentProjects, addRecentProject } = useSettingsStore();

  const setupMenu = useCallback(async () => {
    const openRecentSubmenu =
      recentProjects.length > 0
        ? [
            await Submenu.new({
              text: "Open Recent",
              items: await Promise.all(
                recentProjects.map((path) =>
                  MenuItem.new({
                    text: path,
                    action: () => invoke("open_project_window", { rootPath: path }),
                  })
                )
              ),
            }),
          ]
        : [];

    // App Menu (macOS specific)
    const appMenu = await Submenu.new({
      text: "Repo Wizard",
      items: [
        await MenuItem.new({
          text: "About Repo Wizard",
          action: () => {
            console.log("About Repo Wizard");
          },
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await PredefinedMenuItem.new({ item: "Services" }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await PredefinedMenuItem.new({ item: "Hide", text: "Hide Repo Wizard" }),
        await PredefinedMenuItem.new({ item: "HideOthers" }),
        await PredefinedMenuItem.new({ item: "ShowAll" }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await PredefinedMenuItem.new({ item: "Quit", text: "Quit Repo Wizard" }),
      ],
    });

    // File Menu
    const fileMenu = await Submenu.new({
      text: "File",
      items: [
        await MenuItem.new({
          text: "New Window",
          accelerator: "CmdOrCtrl+N",
          action: () => invoke("create_new_window"),
        }),
        await MenuItem.new({
          text: "Open...",
          accelerator: "CmdOrCtrl+O",
          action: async () => {
            const selected = await open({ directory: true });
            if (typeof selected === "string") {
              await invoke("open_project_window", { rootPath: selected });
            }
          },
        }),
        ...openRecentSubmenu,
        await PredefinedMenuItem.new({ item: "Separator" }),
        await PredefinedMenuItem.new({
          item: "CloseWindow",
          text: "Close Window",
        }),
      ],
    });

    // Edit Menu (Essential for copy/paste/undo functionality)
    const editMenu = await Submenu.new({
      text: "Edit",
      items: [
        await PredefinedMenuItem.new({ item: "Undo" }),
        await PredefinedMenuItem.new({ item: "Redo" }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await PredefinedMenuItem.new({ item: "Cut" }),
        await PredefinedMenuItem.new({ item: "Copy" }),
        await PredefinedMenuItem.new({ item: "Paste" }),
        await PredefinedMenuItem.new({ item: "SelectAll" }),
      ],
    });

    // View Menu
    const viewMenu = await Submenu.new({
      text: "View",
      items: [
        await MenuItem.new({
          text: "Reload",
          accelerator: "CmdOrCtrl+R",
          action: () => window.location.reload(),
        }),
        await MenuItem.new({
          text: "Force Reload",
          accelerator: "CmdOrCtrl+Shift+R",
          action: () => window.location.reload(),
        }),
      ],
    });

    // Window Menu
    const windowMenu = await Submenu.new({
      text: "Window",
      items: [
        await PredefinedMenuItem.new({ item: "Minimize" }),
        await PredefinedMenuItem.new({ item: "CloseWindow" }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await PredefinedMenuItem.new({ item: "Maximize" }),
        await PredefinedMenuItem.new({ item: "Fullscreen" }),
      ],
    });

    const menu = await Menu.new({ 
      items: [appMenu, fileMenu, editMenu, viewMenu, windowMenu] 
    });
    await menu.setAsAppMenu();
  }, [recentProjects]);

  useEffect(() => {
    const initializeApp = () => {
      if (window.__RPO_WIZ_PROJECT_ROOT__) {
        const path = window.__RPO_WIZ_PROJECT_ROOT__;
        setProjectRoot(path);
        addRecentProject(path);
      }
    };
    initializeApp();
  }, [addRecentProject]);

  useEffect(() => {
    setupMenu();
  }, [setupMenu]);

  useEffect(() => {
    const showUpdateDialog = async () => {
      if (status === "ready" && updateInfo) {
        const isDev = __APP_VERSION__.includes("-");
        const confirmed = await openDialog({
          title: isDev ? "Update Available" : "Update Ready",
          content: (
            <div>
              <p>
                A new version ({updateInfo.version}) is available. You are using{" "}
                {__APP_VERSION__}.
              </p>
              <p className="mt-2 text-sm text-gray-500">Release Notes:</p>
              <div className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-gray-50 p-2 text-sm">
                <pre className="whitespace-pre-wrap font-sans">
                  {updateInfo.body || "No release notes available."}
                </pre>
              </div>
              {!isDev && (
                <p className="mt-4">
                  Would you like to restart now to apply the update?
                </p>
              )}
            </div>
          ),
          type: isDev ? "alert" : "confirm",
          status: "info",
          confirmText: "Relaunch Now",
        });

        if (confirmed && !isDev) {
          await install();
        }
      }
    };
    showUpdateDialog();
  }, [status, updateInfo, openDialog, install]);

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      <Header />
      <div className="flex-grow min-h-0">
        {projectRoot ? <ProjectView rootPath={projectRoot} /> : <WelcomeView />}
      </div>

      <ModalDialog />
      <Tooltip />
      <ContextMenu />
    </div>
  );
}

export default App;