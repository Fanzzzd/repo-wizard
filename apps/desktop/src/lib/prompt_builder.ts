import type { FileNode } from '../bindings';
import { getGitDiff } from '../services/tauriApi';
import type {
  ComposerMode,
  EditFormat,
  FileTreeConfig,
  MetaPrompt,
} from '../types/prompt';

interface File {
  path: string;
  content: string;
}

interface BuildPromptArgs {
  files: File[];
  instructions: string;
  customSystemPrompt: string;
  editFormat: EditFormat;
  metaPrompts: MetaPrompt[];
  composerMode: ComposerMode;
  fileTree: FileNode | null;
  rootPath: string | null;
  options?: { dryRun?: boolean };
}

interface BuildPromptResult {
  fullPrompt: string;
  terminalCommandToRun: string | null;
}

const diffFormattingRules = `# File editing rules:

You can modify files using either search/replace blocks (for partial edits) or overwriting the entire file (for full content).

**1. Modify using search/replace blocks (Preferred for targeted changes):**
Use the \`PATCH\` command. Each change must be in a \`<<<<<<< SEARCH ... ======= ... >>>>>>> REPLACE\` block.

PATCH path/to/file.py
\`\`\`
<<<<<<< SEARCH
    original_code_line_1
    original_code_line_2
=======
    new_code_line_1
    new_code_line_2
>>>>>>> REPLACE
\`\`\`
* The SEARCH block must match the original code exactly, character for character (including whitespace).
* You can include multiple search/replace blocks for the same file within one fenced block.

**To create a new file:**
CREATE path/to/new_file.py
\`\`\`python
// this file does not exist, it's just an example file to show you the response format
\`\`\`

**To fully overwrite an existing file:**
OVERWRITE path/to/existing_file.py
\`\`\`python
// this file does not exist, it's just an example file to show you the response format
\`\`\`

**Other operations:**

To delete a file:
DELETE path/to/file.ext

To move or rename a file:
MOVE path/from/old.ext TO path/to/new.ext
`;

const wholeFileFormattingRules = `# File editing rules:

For each file you need to modify, use a command (\`CREATE\` for new files, \`OVERWRITE\` for existing files) followed by the file path, and then the complete, updated content of the file within a fenced code block.

**To create a new file:**
CREATE path/to/new_file.py
\`\`\`python
// this file does not exist, it's just an example file to show you the response format
\`\`\`

**To fully overwrite an existing file:**
OVERWRITE path/to/existing_file.py
\`\`\`python
// this file does not exist, it's just an example file to show you the response format
\`\`\`

To delete a file, output a single line:
DELETE path/to/file.ext

To move or rename a file, output a single line:
MOVE path/from/old.ext TO path/to/new.ext
`;

const formattingRulesMap = {
  diff: diffFormattingRules,
  whole: wholeFileFormattingRules,
};

const parseIgnorePatterns = (patternsStr: string) => {
  const patterns = patternsStr
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const filePatterns: ((name: string) => boolean)[] = [];
  const dirPatterns: ((name: string) => boolean)[] = [];

  patterns.forEach((pattern) => {
    if (pattern.endsWith('/')) {
      const dirName = pattern.slice(0, -1);
      dirPatterns.push((name) => name === dirName);
    } else if (pattern.startsWith('*.')) {
      const extension = pattern.slice(1);
      filePatterns.push((name) => name.endsWith(extension));
    } else {
      const matchFn = (name: string) => name === pattern;
      filePatterns.push(matchFn);
      dirPatterns.push(matchFn);
    }
  });

  return (node: FileNode) => {
    const patternsToCheck = node.isDirectory ? dirPatterns : filePatterns;
    return patternsToCheck.some((p) => p(node.name));
  };
};

const formatFileTree = (node: FileNode, config?: FileTreeConfig): string => {
  let result = `${node.name}\n`;
  const isIgnoredFn = config?.ignorePatterns
    ? parseIgnorePatterns(config.ignorePatterns)
    : () => false;

  const buildTree = (children: FileNode[], prefix: string) => {
    let childrenToDisplay = children.filter((child) => !isIgnoredFn(child));

    const maxFiles = config?.maxFilesPerDirectory;
    if (
      typeof maxFiles === 'number' &&
      maxFiles >= 0 &&
      childrenToDisplay.length > maxFiles
    ) {
      const truncated = childrenToDisplay.slice(0, maxFiles);
      const ellipsisNode: FileNode = {
        name: '...',
        path: '',
        isDirectory: false,
        children: [],
      };
      childrenToDisplay = [...truncated, ellipsisNode];
    }

    childrenToDisplay.forEach((child, index) => {
      const isLast = index === childrenToDisplay.length - 1;
      result += `${prefix}${isLast ? '└── ' : '├── '}${child.name}\n`;
      if (child.children && child.name !== '...') {
        buildTree(child.children, `${prefix}${isLast ? '    ' : '│   '}`);
      }
    });
  };

  if (node.children) {
    buildTree(node.children, '');
  }
  return result;
};

const filterFileTreeBySelection = (
  node: FileNode,
  selectedPaths: Set<string>,
  rootPath: string
): FileNode | null => {
  const nodeRelativePath = node.path.startsWith(rootPath)
    ? node.path.substring(rootPath.length + 1).replace(/\\/g, '/')
    : node.path.replace(/\\/g, '/');

  if (selectedPaths.has(nodeRelativePath)) {
    return { ...node, children: undefined };
  }

  if (node.isDirectory && node.children) {
    const newChildren = node.children
      .map((child) => filterFileTreeBySelection(child, selectedPaths, rootPath))
      .filter((c): c is FileNode => c !== null);

    if (newChildren.length > 0) {
      return { ...node, children: newChildren };
    }
  }

  return null;
};

export const buildPrompt = async ({
  files,
  instructions,
  customSystemPrompt,
  editFormat,
  metaPrompts,
  composerMode,
  fileTree,
  rootPath,
  options: _options,
}: BuildPromptArgs): Promise<BuildPromptResult> => {
  const options = { dryRun: false, ..._options };
  let prompt = '';
  let terminalCommandToRun: string | null = null;

  if (customSystemPrompt) {
    prompt += `--- BEGIN SYSTEM PROMPT ---\n`;
    prompt += customSystemPrompt;
    prompt += `\n--- END SYSTEM PROMPT ---\n\n`;
  }

  const enabledMetaPrompts = metaPrompts.filter(
    (p) => p.enabled && (p.mode === composerMode || p.mode === 'universal')
  );

  if (enabledMetaPrompts.length > 0) {
    prompt +=
      'In addition to my instructions, you must also follow the rules in these blocks:\n\n';

    for (const metaPrompt of enabledMetaPrompts) {
      let content = metaPrompt.content;

      if (metaPrompt.promptType === 'magic' && rootPath) {
        if (metaPrompt.magicType === 'file-tree' && metaPrompt.fileTreeConfig) {
          let treeToRender = fileTree;
          if (
            metaPrompt.fileTreeConfig?.scope === 'selected' &&
            rootPath &&
            fileTree
          ) {
            const selectedRelativePaths = new Set(files.map((f) => f.path));
            treeToRender = filterFileTreeBySelection(
              fileTree,
              selectedRelativePaths,
              rootPath
            );
          }
          const fileTreeString = treeToRender
            ? formatFileTree(treeToRender, metaPrompt.fileTreeConfig)
            : 'No project is open or no files selected.';
          content = content.replace('{FILE_TREE_CONTENT}', fileTreeString);
        } else if (
          metaPrompt.magicType === 'git-diff' &&
          metaPrompt.gitDiffConfig
        ) {
          if (!options.dryRun) {
            try {
              const diff = await getGitDiff(rootPath, metaPrompt.gitDiffConfig);
              content = content.replace(
                '{GIT_DIFF_CONTENT}',
                diff || 'No changes found.'
              );
            } catch (e) {
              content = content.replace(
                '{GIT_DIFF_CONTENT}',
                `Error getting git diff: ${e}`
              );
            }
          } else {
            content = content.replace(
              '{GIT_DIFF_CONTENT}',
              '[Git diff output will be included here during prompt generation]'
            );
          }
        } else if (
          metaPrompt.magicType === 'terminal-command' &&
          metaPrompt.terminalCommandConfig
        ) {
          const commandToRun = metaPrompt.terminalCommandConfig.command;
          if (commandToRun) {
            if (options.dryRun) {
              content = content.replace(
                '{TERMINAL_COMMAND_OUTPUT}',
                `[Output of '${commandToRun}' will be captured from an interactive terminal and inserted here.]`
              );
            } else {
              terminalCommandToRun = commandToRun;
              // Leave the placeholder in place, it will be filled in by the caller
              // after the terminal interaction is complete.
            }
          } else {
            content = content.replace(
              '{TERMINAL_COMMAND_OUTPUT}',
              'No command specified in meta-prompt configuration.'
            );
          }
        }
      }

      prompt += `--- BEGIN META PROMPT: "${metaPrompt.name}" ---\n`;
      prompt += content;
      prompt += `\n--- END META PROMPT: "${metaPrompt.name}" ---\n\n`;
    }
  }

  if (composerMode === 'edit') {
    prompt += `--- BEGIN File Editing Rules ---\n`;
    prompt += formattingRulesMap[editFormat];
    prompt += `\n--- END File Editing Rules ---\n\n`;
  }

  prompt += '--- BEGIN SELECTED CODE ---\n';
  prompt += 'Here are the files to work with:\n\n';

  for (const file of files) {
    prompt += `${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
  }

  prompt += '--- END SELECTED CODE ---\n\n';

  prompt += `My instructions are:\n\n${instructions}`;

  if (composerMode === 'edit') {
    prompt += `\n\n**IMPORTANT** IF MAKING FILE CHANGES, YOU MUST USE THE FILE EDITING FORMATS PROVIDED ABOVE – IT IS THE ONLY WAY FOR YOUR CHANGES TO BE APPLIED.`;
  }

  return { fullPrompt: prompt, terminalCommandToRun };
};
