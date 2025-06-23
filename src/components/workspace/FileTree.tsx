import { FolderOpen, ChevronRight, ChevronDown, X } from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useEffect, useState, useMemo, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { listDirectoryRecursive } from "../../lib/tauri_api";
import type { FileNode } from "../../types";
import { FileTypeIcon } from "./FileTypeIcon";

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
  } = useWorkspaceStore();
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

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleContainerClick = () => {
    if (isDirectory) {
      setIsOpen(!isOpen);
    } else {
      setActiveFilePath(node.path);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
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

  const isActive = activeFilePath === node.path;

  return (
    <div style={{ paddingLeft: `${level * 1}rem` }}>
      <div
        className={`flex items-center gap-2 p-1 rounded text-sm group ${
          isActive
            ? "bg-blue-100 text-blue-900"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
        title={node.path}
      >
        <input
          type="checkbox"
          ref={checkboxRef}
          className="form-checkbox h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
          checked={isSelected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
        />

        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
          {isDirectory ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="cursor-pointer"
            >
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        <div
          onClick={handleContainerClick}
          className="flex items-center gap-2 cursor-pointer flex-grow overflow-hidden"
        >
          <FileTypeIcon
            filename={node.name}
            isDirectory={isDirectory}
            isOpen={isOpen}
          />
          <span className="truncate">{node.name}</span>
        </div>
      </div>
      {isDirectory && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileNodeComponent
              key={child.path}
              node={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const { rootPath, fileTree, setRootPath, setFileTree, refreshCounter } = useWorkspaceStore();
  const { respectGitignore, customIgnorePatterns } = useSettingsStore();

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (typeof selected === "string") {
        setRootPath(selected);
      }
    } catch (error) {
      console.error("Failed to open folder dialog:", error);
    }
  };

  const handleCloseFolder = () => {
    setRootPath(null);
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
  }, [rootPath, setFileTree, respectGitignore, customIgnorePatterns, refreshCounter]);

  if (!fileTree) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 bg-gray-50">
        <button
          onClick={handleOpenFolder}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-md"
        >
          <FolderOpen size={18} />
          Open Project Folder
        </button>
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
          title="Close Folder"
        >
          <X size={16} />
        </button>
      </div>
      <FileNodeComponent node={fileTree} level={0} initialOpen={true} />
    </div>
  );
}