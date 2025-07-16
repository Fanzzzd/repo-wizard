import { useEffect, useCallback, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Menu,
  Submenu,
  MenuItem,
  PredefinedMenuItem,
} from "@tauri-apps/api/menu";
import { platform } from "@tauri-apps/plugin-os";
import { getMatches } from "@tauri-apps/plugin-cli";

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
import { useWorkspaceStore } from "./store/workspaceStore";
import { useReviewStore } from "./store/reviewStore";
import { useDialogStore } from "./store/dialogStore";
import { useUpdateStore } from "./store/updateStore";
import { useSettingsStore } from "./store/settingsStore";
import { CommandRunnerModal } from "./components/common/CommandRunnerModal";

declare global {
  interface Window {
    __RPO_WIZ_PROJECT_ROOT__?: string;
  }
}

interface SingleInstancePayload {
  args: string[];
  cwd: string;
}

function App() {
  const { setRootPath } = useWorkspaceStore();
  const { isReviewing } = useReviewStore();
  const { open: openDialog } = useDialogStore();
  const { status, updateInfo, install } = useUpdateStore();
  const { recentProjects } = useSettingsStore();
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    const unlisten = listen<SingleInstancePayload>("single-instance", (event) => {
      const { args: argv, cwd } = event.payload;
      if (argv.length > 1 && argv[1]) {
        invoke<string>("resolve_path", { path: argv[1], cwd })
          .then((absolutePath) => {
            invoke("open_project_window", { rootPath: absolutePath });
          })
          .catch((e) => {
            console.warn("Could not process single-instance CLI argument:", e);
          });
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    const handleZoom = (e: CustomEvent) => {
      if (e.detail === "in") {
        setFontSize((s) => Math.min(20, s + 1));
      } else if (e.detail === "out") {
        setFontSize((s) => Math.max(10, s - 1));
      } else if (e.detail === "reset") {
        setFontSize(14);
      }
    };

    window.addEventListener("zoom", handleZoom as EventListener);
    return () => {
      window.removeEventListener("zoom", handleZoom as EventListener);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  const setupMenu = useCallback(async () => {
    const osType = await platform();

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

    const allMenuItems: (Submenu | MenuItem | PredefinedMenuItem)[] = [];

    if (osType === "macos") {
      const appMenu = await Submenu.new({
        text: "Repo Wizard",
        items: [
          await MenuItem.new({
            text: "About Repo Wizard",
            action: () => {
              openDialog({
                title: `About Repo Wizard v${__APP_VERSION__}`,
                content: "A code refactoring staging area to safely and efficiently apply LLM-suggested code changes.",
                status: 'info',
                type: 'alert'
              })
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
      allMenuItems.push(appMenu);
    }

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
              await useWorkspaceStore.getState().setRootPath(selected);
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
    allMenuItems.push(fileMenu);

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
    allMenuItems.push(editMenu);

    const viewMenu = await Submenu.new({
      text: "View",
      items: [
        await MenuItem.new({
          text: "Zoom In",
          accelerator: "CmdOrCtrl+=",
          action: () => window.dispatchEvent(new CustomEvent('zoom', { detail: 'in' })),
        }),
        await MenuItem.new({
          text: "Zoom Out",
          accelerator: "CmdOrCtrl+-",
          action: () => window.dispatchEvent(new CustomEvent('zoom', { detail: 'out' })),
        }),
        await MenuItem.new({
          text: "Reset Zoom",
          accelerator: "CmdOrCtrl+0",
          action: () => window.dispatchEvent(new CustomEvent('zoom', { detail: 'reset' })),
        }),
      ],
    });
    allMenuItems.push(viewMenu);

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
    allMenuItems.push(windowMenu);

    const menu = await Menu.new({
      items: allMenuItems,
    });
    await menu.setAsAppMenu();
  }, [recentProjects, openDialog]);

  useEffect(() => {
    const initializeApp = async () => {
      if (window.__RPO_WIZ_PROJECT_ROOT__) {
        await setRootPath(window.__RPO_WIZ_PROJECT_ROOT__);
        return;
      }

      try {
        const matches = await getMatches();
        const pathArg = matches.args.path?.value;
        if (pathArg && typeof pathArg === "string") {
          const absolutePath = await invoke<string>("resolve_path", {
            path: pathArg,
          });
          await setRootPath(absolutePath);
        }
      } catch (e) {
        console.warn("Could not process CLI arguments:", e);
      }
    };
    initializeApp();
  }, [setRootPath]);

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
              <div className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-gray-50 p-2 text-sm thin-scrollbar">
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
    <div className="h-full w-full flex flex-col bg-gray-50">
      <Header />
      <div className="flex-grow min-h-0">
        <Layout
          leftPanel={leftPanel}
          mainPanel={<MainPanel />}
          rightPanel={rightPanel}
        />
      </div>

      <ModalDialog />
      <Tooltip />
      <ContextMenu />
      <CommandRunnerModal />
    </div>
  );
}

export default App;