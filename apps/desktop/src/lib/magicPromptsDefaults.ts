import type { MagicPromptType, MetaPromptDefinition } from '../types/prompt';

type MagicPromptDefault = Pick<
  MetaPromptDefinition,
  'name' | 'content' | 'mode' | 'promptType' | 'magicType'
> &
  Partial<
    Pick<
      MetaPromptDefinition,
      'fileTreeConfig' | 'gitDiffConfig' | 'terminalCommandConfig'
    >
  >;

export const MAGIC_PROMPT_DEFAULTS: Record<
  MagicPromptType,
  MagicPromptDefault
> = {
  'file-tree': {
    name: 'File Tree',
    content:
      "Here is the project's file structure based on the configuration:\n\n{FILE_TREE_CONTENT}",
    mode: 'universal',
    promptType: 'magic',
    magicType: 'file-tree',
    fileTreeConfig: {
      scope: 'all',
      maxFilesPerDirectory: null,
      ignorePatterns: '',
    },
  },
  'git-diff': {
    name: 'Git Diff',
    content:
      'Here are the recent code changes from the project repository. Please use this as context for my request.\n\n```diff\n{GIT_DIFF_CONTENT}\n```',
    mode: 'universal',
    promptType: 'magic',
    magicType: 'git-diff',
    gitDiffConfig: { type: 'workspace' },
  },
  'terminal-command': {
    name: 'Terminal Output',
    content:
      'Here is the output of a command I ran. Please use this as context for my request.\n\n```\n{TERMINAL_COMMAND_OUTPUT}\n```',
    mode: 'universal',
    promptType: 'magic',
    magicType: 'terminal-command',
    terminalCommandConfig: { command: 'pnpm check' },
  },
};
