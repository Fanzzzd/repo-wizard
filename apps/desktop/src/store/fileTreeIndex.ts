import type { FileNode } from '../bindings';

export type FileTreeIndex = {
  totalLeavesByPath: Map<string, number>;
  descendantLeavesByPath: Map<string, string[]>;
  parentByPath: Map<string, string | null>;
  filePaths: Set<string>;
};

export function buildFileTreeIndex(root: FileNode): FileTreeIndex {
  const totalLeavesByPath = new Map<string, number>();
  const descendantLeavesByPath = new Map<string, string[]>();
  const parentByPath = new Map<string, string | null>();
  const filePaths = new Set<string>();

  const walk = (node: FileNode, parent: string | null): string[] => {
    parentByPath.set(node.path, parent);
    if (!node.isDirectory) {
      filePaths.add(node.path);
      totalLeavesByPath.set(node.path, 1);
      const leaves = [node.path];
      descendantLeavesByPath.set(node.path, leaves);
      return leaves;
    }

    const leaves: string[] = [];
    if (node.children) {
      for (const child of node.children) {
        leaves.push(...walk(child, node.path));
      }
    }

    totalLeavesByPath.set(node.path, leaves.length);
    descendantLeavesByPath.set(node.path, leaves);
    return leaves;
  };

  walk(root, null);

  return {
    totalLeavesByPath,
    descendantLeavesByPath,
    parentByPath,
    filePaths,
  };
}

export function normalizeSelectedPaths(
  paths: string[],
  fileIndex: FileTreeIndex | null
): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const path of paths) {
    if (seen.has(path)) {
      continue;
    }
    if (fileIndex && !fileIndex.filePaths.has(path)) {
      continue;
    }
    seen.add(path);
    normalized.push(path);
  }
  return normalized;
}

export function buildSelectedCounts(
  selectedPaths: string[],
  fileIndex: FileTreeIndex | null
): Map<string, number> {
  const counts = new Map<string, number>();
  if (!fileIndex) {
    return counts;
  }

  for (const path of selectedPaths) {
    if (!fileIndex.filePaths.has(path)) {
      continue;
    }
    let current: string | null = path;
    while (current) {
      counts.set(current, (counts.get(current) ?? 0) + 1);
      current = fileIndex.parentByPath.get(current) ?? null;
    }
  }

  return counts;
}
