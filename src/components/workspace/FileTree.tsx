import { ChevronRight, ChevronDown, X, FolderOpen } from "lucide-react";
import { useProjectStore } from "../../store/projectStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useEffect, useState, useMemo, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { listDirectoryRecursive } from "../../lib/tauri_api";
import type { FileNode } from "../../types";
import { FileTypeIcon } from "./FileTypeIcon";
import { AnimatePresence, motion } from "motion/react";
import { Checkbox } from "../common/Checkbox";
import { Button } from "../common/Button";

function collectFilePaths(node: FileNode): string[] {
  if (!node.isDirectory) {
    return [node.path];
  }
  let paths: string[] = [];
  if (node.children) {
    for (const child of node.children) {
      paths.push(...collectFilePaths(child));
    }
  }
  return paths;
}

function FileNodeComponent({
  node,
  level,
  initialOpen = false,
}: {
  node: FileNode;
  level: number;
  initialOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const {
    activeFilePath,
    setActiveFilePath,
    selectedFilePaths,
    addSelectedFilePath,
    removeSelectedFilePath,
    setSelectedFilePaths,
  } = useProjectStore();
  const checkboxRef = useRef<HTMLInputElement>(null);

  const isDirectory = node.isDirectory;

  const descendantFilePaths = useMemo(
    () => (isDirectory ? collectFilePaths(node) : [node.path]),
    [node, isDirectory]
  );

  const selectedDescendantCount = useMemo(() => {
    if (descendantFilePaths.length === 0) return 0;
    const descendantSet = new Set(descendantFilePaths);
    return selectedFilePaths.filter((p) => descendantSet.has(p)).length;
  }, [descendantFilePaths, selectedFilePaths]);

  const isSelected = !isDirectory
    ? selectedFilePaths.includes(node.path)
    : selectedDescendantCount > 0 &&
      selectedDescendantCount === descendantFilePaths.length;

  const isIndeterminate =
    isDirectory &&
    selectedDescendantCount > 0 &&
    selectedDescendantCount < descendantFilePaths.length;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;

    if (isDirectory) {
      const descendantSet = new Set(descendantFilePaths);
      const otherPaths = selectedFilePaths.filter((p) => !descendantSet.has(p));
      if (isChecked) {
        setSelectedFilePaths([...otherPaths, ...descendantFilePaths]);
      } else {
        setSelectedFilePaths(otherPaths);
      }
    } else {
      if (isChecked) {
        addSelectedFilePath(node.path);
      } else {
        removeSelectedFilePath(node.path);
      }
    }
  };

  const handleDisplayFile = () => {
    if (!isDirectory) {
      setActiveFilePath(node.path);
    }
  };

  const isActive = activeFilePath === node.path;

  return (
    <div>
      <div
        className={`flex items-center rounded text-sm group select-none ${
          isActive
            ? "bg-blue-100 text-blue-900"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
        title={node.path}
      >
        <div
          style={{ paddingLeft: `${level * 1.25}rem` }}
          className="flex items-center self-stretch p-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (isDirectory) {
              setIsOpen(!isOpen);
            } else {
              handleDisplayFile();
            }
          }}
        >
          <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
            {isDirectory &&
              (isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </div>
        </div>

        <div
          className="p-1 flex items-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            checkboxRef.current?.click();
          }}
        >
          <div className="pointer-events-none">
            <Checkbox
              ref={checkboxRef}
              checked={isSelected}
              isIndeterminate={isIndeterminate}
              onChange={handleCheckboxChange}
            />
          </div>
        </div>

        <div
          className="flex items-center gap-2 flex-grow overflow-hidden p-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (isDirectory) {
              setIsOpen(!isOpen);
            } else {
              handleDisplayFile();
            }
          }}
        >
          <FileTypeIcon
            filename={node.name}
            isDirectory={isDirectory}
            isOpen={isOpen}
          />
          <span className="truncate">{node.name}</span>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isDirectory && isOpen && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            {node.children.map((child) => (
              <FileNodeComponent
                key={child.path}
                node={child}
                level={level + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FileTree() {
  const {
    rootPath,
    fileTree,
    setFileTree,
    refreshCounter,
    setRootPath,
    closeProject,
  } = useProjectStore();
  const { respectGitignore, customIgnorePatterns } = useSettingsStore();

  const handleCloseFolder = () => {
    closeProject();
  };

  const handleOpenFolder = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      await setRootPath(selected);
    }
  };

  useEffect(() => {
    if (rootPath) {
      const settings = { respectGitignore, customIgnorePatterns };
      listDirectoryRecursive(rootPath, settings)
        .then(setFileTree)
        .catch(console.error);
    } else {
      setFileTree(null);
    }
  }, [
    rootPath,
    setFileTree,
    respectGitignore,
    customIgnorePatterns,
    refreshCounter,
  ]);

  if (!rootPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 bg-gray-50">
        <div className="text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Open a project
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by opening a folder.
          </p>
          <div className="mt-6">
            <Button
              onClick={handleOpenFolder}
              variant="primary"
              leftIcon={<FolderOpen size={16} />}
            >
              Open Folder
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!fileTree) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 bg-gray-50">
        <p>Loading file tree...</p>
      </div>
    );
  }

  return (
    <div className="p-2 text-gray-800 overflow-auto h-full bg-gray-50">
      <div className="flex items-center justify-between gap-2 font-bold mb-2 p-1">
        <div className="flex items-center gap-2 truncate">
          <FileTypeIcon filename={fileTree.name} isDirectory={true} />
          <h2 className="truncate" title={fileTree.name}>
            {fileTree.name}
          </h2>
        </div>
        <button
          onClick={handleCloseFolder}
          className="p-1 rounded-full hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex-shrink-0"
          title="Close Project"
        >
          <X size={16} />
        </button>
      </div>
      <FileNodeComponent node={fileTree} level={0} initialOpen={true} />
    </div>
  );
}