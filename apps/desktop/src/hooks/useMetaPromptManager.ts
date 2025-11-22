import { useState, useEffect, useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useComposerStore } from '../store/composerStore';
import { useContextMenuStore } from '../store/contextMenuStore';
import type {
  MetaPrompt,
  MetaPromptDefinition,
  PromptMode,
  MagicPromptType,
} from '../types';
import { Copy, Trash2 } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { showErrorDialog } from '../lib/errorHandler';

export function useMetaPromptManager({ isOpen }: { isOpen: boolean }) {
  const { metaPrompts: promptDefs, setMetaPrompts: setPromptDefs } =
    useSettingsStore();
  const { enabledMetaPromptIds, setEnabledMetaPromptIds } = useComposerStore();
  const { open: openContextMenu } = useContextMenuStore();

  const [localPrompts, setLocalPrompts] = useState<MetaPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [activeDragPrompt, setActiveDragPrompt] = useState<MetaPrompt | null>(
    null
  );
  const [availableTemplates, setAvailableTemplates] = useState<
    { name: string; content: string }[]
  >([]);

  const selectedPrompt = useMemo(
    () => localPrompts.find(p => p.id === selectedPromptId),
    [localPrompts, selectedPromptId]
  );

  const { universalPrompts, editPrompts, qaPrompts } = useMemo(() => {
    // The order of localPrompts is managed by dnd-kit and should be respected.
    return {
      universalPrompts: localPrompts.filter(p => p.mode === 'universal'),
      editPrompts: localPrompts.filter(p => p.mode === 'edit'),
      qaPrompts: localPrompts.filter(p => p.mode === 'qa'),
    };
  }, [localPrompts]);

  useEffect(() => {
    if (isOpen) {
      const currentPrompts = promptDefs.map(def => ({
        ...def,
        enabled: enabledMetaPromptIds.includes(def.id),
      }));
      setLocalPrompts(currentPrompts);

      setSelectedPromptId(currentId => {
        if (currentId && currentPrompts.some(p => p.id === currentId)) {
          return currentId;
        }
        return currentPrompts[0]?.id ?? null;
      });

      const fetchTemplates = async () => {
        const templateFiles = [
          'architect.md',
          'engineer.md',
          'code-reviewer.md',
        ];
        try {
          const templatesData = await Promise.all(
            templateFiles.map(async filename => {
              const response = await fetch(`/meta-prompts/${filename}`);
              if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
              const content = await response.text();
              const name = filename
                .replace('.md', '')
                .replace(/-/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
              return { name, content };
            })
          );
          setAvailableTemplates(templatesData);
        } catch (error) {
          showErrorDialog(error);
        }
      };
      fetchTemplates();
    }
  }, [isOpen, promptDefs, enabledMetaPromptIds]);

  const handleSave = () => {
    const definitionsToSave: MetaPromptDefinition[] = localPrompts.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ enabled, ...def }) => def
    );
    const enabledIdsToSave = localPrompts.filter(p => p.enabled).map(p => p.id);
    setPromptDefs(definitionsToSave);
    setEnabledMetaPromptIds(enabledIdsToSave);
  };

  const handleUpdatePrompt = (
    prompt: MetaPrompt,
    update: Partial<Omit<MetaPrompt, 'id'>>
  ) => {
    setLocalPrompts(currentPrompts =>
      currentPrompts.map(p => (p.id === prompt.id ? { ...p, ...update } : p))
    );
  };

  const handleUpdatePromptById = (
    id: string,
    update: Partial<Omit<MetaPrompt, 'id'>>
  ) => {
    const prompt = localPrompts.find(p => p.id === id);
    if (prompt) handleUpdatePrompt(prompt, update);
  };

  const handleDragStart = (event: { active: { id: React.Key } }) => {
    setActiveDragPrompt(
      localPrompts.find(p => p.id === event.active.id) || null
    );
  };

  const handleDragCancel = () => setActiveDragPrompt(null);

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeContainer = active.data.current?.sortable
      .containerId as PromptMode;
    const overContainer = (over.data.current?.sortable.containerId ??
      over.id) as PromptMode;
    if (activeContainer && overContainer && activeContainer !== overContainer) {
      setLocalPrompts(prompts => {
        const activeIndex = prompts.findIndex(p => p.id === active.id);
        if (activeIndex === -1) return prompts;
        prompts[activeIndex].mode = overContainer;
        return arrayMove(prompts, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragPrompt(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalPrompts(prompts => {
        const oldIndex = prompts.findIndex(item => item.id === active.id);
        const newIndex = prompts.findIndex(item => item.id === over.id);
        return oldIndex !== -1 && newIndex !== -1
          ? arrayMove(prompts, oldIndex, newIndex)
          : prompts;
      });
    }
  };

  const addPrompt = (
    promptDef: Partial<MetaPromptDefinition> &
      Pick<MetaPromptDefinition, 'name' | 'content' | 'mode' | 'promptType'>
  ) => {
    const newPrompt: MetaPrompt = {
      id: window.crypto.randomUUID(),
      enabled: true,
      ...promptDef,
    };
    setLocalPrompts(prev => [newPrompt, ...prev]);
    setSelectedPromptId(newPrompt.id);
  };

  const handleAddFromTemplate = (template: {
    name: string;
    content: string;
  }) => {
    addPrompt({
      name: template.name,
      content: template.content,
      mode: 'edit',
      promptType: 'meta',
    });
  };

  const handleAddBlankPrompt = (mode: PromptMode) => {
    addPrompt({
      name: `New ${mode} Prompt`,
      content: '',
      mode,
      promptType: 'meta',
    });
  };

  const handleAddMagicPrompt = (magicType: MagicPromptType) => {
    if (magicType === 'file-tree') {
      addPrompt({
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
      });
    } else if (magicType === 'git-diff') {
      addPrompt({
        name: 'Git Diff',
        content:
          'Here are the recent code changes from the project repository. Please use this as context for my request.\n\n```diff\n{GIT_DIFF_CONTENT}\n```',
        mode: 'universal',
        promptType: 'magic',
        magicType: 'git-diff',
        gitDiffConfig: { type: 'unstaged', hash: null },
      });
    } else if (magicType === 'terminal-command') {
      addPrompt({
        name: 'Terminal Output',
        content:
          'Here is the output of a command I ran. Please use this as context for my request.\n\n```\n{TERMINAL_COMMAND_OUTPUT}\n```',
        mode: 'universal',
        promptType: 'magic',
        magicType: 'terminal-command',
        terminalCommandConfig: { command: 'pnpm check' },
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, prompt: MetaPrompt) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, [
      {
        label: 'Duplicate',
        icon: Copy,
        onClick: () => {
          const newPrompt: MetaPrompt = {
            ...prompt,
            id: window.crypto.randomUUID(),
            name: `${prompt.name} (Copy)`,
          };
          const sourceIndex = localPrompts.findIndex(p => p.id === prompt.id);
          const newPrompts = [...localPrompts];
          newPrompts.splice(sourceIndex + 1, 0, newPrompt);
          setLocalPrompts(newPrompts);
          setSelectedPromptId(newPrompt.id);
        },
      },
      { isSeparator: true },
      {
        label: 'Delete',
        icon: Trash2,
        isDanger: true,
        onClick: () => {
          const newPrompts = localPrompts.filter(p => p.id !== prompt.id);
          setLocalPrompts(newPrompts);
          if (selectedPromptId === prompt.id) {
            const index = localPrompts.findIndex(p => p.id === prompt.id);
            if (newPrompts.length === 0) setSelectedPromptId(null);
            else {
              const newIndex = Math.max(0, index - 1);
              setSelectedPromptId(newPrompts[newIndex]?.id ?? null);
            }
          }
        },
      },
    ]);
  };

  return {
    localPrompts,
    selectedPromptId,
    setSelectedPromptId,
    activeDragPrompt,
    availableTemplates,
    selectedPrompt,
    universalPrompts,
    editPrompts,
    qaPrompts,
    handleSave,
    handleUpdatePrompt,
    handleUpdatePromptById,
    handleDragStart,
    handleDragCancel,
    handleDragOver,
    handleDragEnd,
    handleAddFromTemplate,
    handleAddBlankPrompt,
    handleAddMagicPrompt,
    handleContextMenu,
  };
}
