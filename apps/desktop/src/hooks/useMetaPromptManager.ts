import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Copy, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { showErrorDialog } from '../lib/errorHandler';
import { MAGIC_PROMPT_DEFAULTS } from '../lib/magicPromptsDefaults';
import { useComposerStore } from '../store/composerStore';
import { useContextMenuStore } from '../store/contextMenuStore';
import { useSettingsStore } from '../store/settingsStore';
import type {
  MagicPromptType,
  MetaPrompt,
  MetaPromptDefinition,
  PromptMode,
} from '../types/prompt';

export function useMetaPromptManager({ isOpen }: { isOpen: boolean }) {
  const { metaPrompts: promptDefs, setMetaPrompts: setPromptDefs } =
    useSettingsStore();
  const { enabledMetaPromptIds, setEnabledMetaPromptIds } = useComposerStore();
  const { open: openContextMenu } = useContextMenuStore();

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [activeDragPrompt, setActiveDragPrompt] = useState<MetaPrompt | null>(
    null
  );
  const [availableTemplates, setAvailableTemplates] = useState<
    { name: string; content: string }[]
  >([]);

  const allPrompts: MetaPrompt[] = useMemo(
    () =>
      promptDefs.map((def) => ({
        ...def,
        enabled: enabledMetaPromptIds.includes(def.id),
      })),
    [promptDefs, enabledMetaPromptIds]
  );

  const selectedPrompt = useMemo(
    () => allPrompts.find((p) => p.id === selectedPromptId),
    [allPrompts, selectedPromptId]
  );

  const { universalPrompts, editPrompts, qaPrompts } = useMemo(() => {
    return {
      universalPrompts: allPrompts.filter((p) => p.mode === 'universal'),
      editPrompts: allPrompts.filter((p) => p.mode === 'edit'),
      qaPrompts: allPrompts.filter((p) => p.mode === 'qa'),
    };
  }, [allPrompts]);

  useEffect(() => {
    if (isOpen) {
      const fetchTemplates = async () => {
        const templateFiles = [
          'architect.md',
          'engineer.md',
          'code-reviewer.md',
        ];
        try {
          const templatesData = await Promise.all(
            templateFiles.map(async (filename) => {
              const response = await fetch(`/meta-prompts/${filename}`);
              if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
              const content = await response.text();
              const name = filename
                .replace('.md', '')
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase());
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
  }, [isOpen]);

  // Validate selection when prompts change
  useEffect(() => {
    if (isOpen) {
      setSelectedPromptId((currentId) => {
        if (currentId && allPrompts.some((p) => p.id === currentId)) {
          return currentId;
        }
        return allPrompts[0]?.id ?? null;
      });
    }
  }, [isOpen, allPrompts]);

  const handleUpdatePrompt = (
    prompt: MetaPrompt,
    update: Partial<Omit<MetaPrompt, 'id'>>
  ) => {
    // Handle enabled state change separately as it lives in composerStore
    if ('enabled' in update) {
      const isEnabled = update.enabled;
      if (isEnabled) {
        setEnabledMetaPromptIds([...enabledMetaPromptIds, prompt.id]);
      } else {
        setEnabledMetaPromptIds(
          enabledMetaPromptIds.filter((id) => id !== prompt.id)
        );
      }
      // If there are other updates, continue to update definition
      delete update.enabled;
      if (Object.keys(update).length === 0) return;
    }

    // Update definition in settingsStore
    setPromptDefs(
      promptDefs.map((p) => (p.id === prompt.id ? { ...p, ...update } : p))
    );
  };

  const handleUpdatePromptById = (
    id: string,
    update: Partial<Omit<MetaPrompt, 'id'>>
  ) => {
    const prompt = allPrompts.find((p) => p.id === id);
    if (prompt) handleUpdatePrompt(prompt, update);
  };

  const handleDragStart = (event: { active: { id: React.Key } }) => {
    setActiveDragPrompt(
      allPrompts.find((p) => p.id === event.active.id) || null
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
      const activeIndex = promptDefs.findIndex((p) => p.id === active.id);
      if (activeIndex === -1) return;

      const newPrompts = [...promptDefs];
      newPrompts[activeIndex] = {
        ...newPrompts[activeIndex],
        mode: overContainer,
      };
      setPromptDefs(arrayMove(newPrompts, activeIndex, activeIndex));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragPrompt(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = promptDefs.findIndex((item) => item.id === active.id);
      const newIndex = promptDefs.findIndex((item) => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setPromptDefs(arrayMove(promptDefs, oldIndex, newIndex));
      }
    }
  };

  const addPrompt = (
    promptDef: Partial<MetaPromptDefinition> &
      Pick<MetaPromptDefinition, 'name' | 'content' | 'mode' | 'promptType'>
  ) => {
    const newPrompt: MetaPromptDefinition = {
      id: window.crypto.randomUUID(),
      ...promptDef,
    };
    // Add to definitions
    setPromptDefs([newPrompt, ...promptDefs]);
    // Enable by default
    setEnabledMetaPromptIds([newPrompt.id, ...enabledMetaPromptIds]);
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
    const defaults = MAGIC_PROMPT_DEFAULTS[magicType];
    if (defaults) {
      addPrompt(defaults);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, prompt: MetaPrompt) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, [
      {
        label: 'Duplicate',
        icon: Copy,
        onClick: () => {
          const newPrompt: MetaPromptDefinition = {
            ...prompt,
            id: window.crypto.randomUUID(),
            name: `${prompt.name} (Copy)`,
          };
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { enabled: _enabled, ...defOnly } = newPrompt as MetaPrompt;

          const sourceIndex = promptDefs.findIndex((p) => p.id === prompt.id);
          const newPrompts = [...promptDefs];
          newPrompts.splice(sourceIndex + 1, 0, defOnly);
          setPromptDefs(newPrompts);

          // Copy enabled state
          if (prompt.enabled) {
            setEnabledMetaPromptIds([...enabledMetaPromptIds, defOnly.id]);
          }

          setSelectedPromptId(defOnly.id);
        },
      },
      { isSeparator: true },
      {
        label: 'Delete',
        icon: Trash2,
        isDanger: true,
        onClick: () => {
          const newPrompts = promptDefs.filter((p) => p.id !== prompt.id);
          setPromptDefs(newPrompts);
          setEnabledMetaPromptIds(
            enabledMetaPromptIds.filter((id) => id !== prompt.id)
          );

          if (selectedPromptId === prompt.id) {
            const index = promptDefs.findIndex((p) => p.id === prompt.id);
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
    allPrompts,
    selectedPromptId,
    setSelectedPromptId,
    activeDragPrompt,
    availableTemplates,
    selectedPrompt,
    universalPrompts,
    editPrompts,
    qaPrompts,

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
