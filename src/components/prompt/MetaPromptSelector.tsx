import { useState, useEffect, useRef, useMemo } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useComposerStore } from '../../store/composerStore';
import type { MetaPrompt } from '../../types';
import {
  X,
  ChevronDown,
  Wand2,
  FolderTree,
  GitBranch,
  Terminal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Checkbox } from '../common/Checkbox';
import { HorizontalScroller } from '../common/HorizontalScroller';
import { Button } from '../common/Button';

interface MetaPromptSelectorProps {
  composerMode: 'edit' | 'qa';
  onManageRequest: () => void;
}

const getPromptStyle = (prompt: MetaPrompt) => {
  if (prompt.promptType === 'magic') {
    switch (prompt.magicType) {
      case 'file-tree':
        return {
          icon: FolderTree,
          bg: 'bg-green-100',
          text: 'text-green-800',
          hoverBg: 'hover:bg-green-200',
          iconColor: 'text-green-600',
        };
      case 'git-diff':
        return {
          icon: GitBranch,
          bg: 'bg-indigo-100',
          text: 'text-indigo-800',
          hoverBg: 'hover:bg-indigo-200',
          iconColor: 'text-indigo-600',
        };
      case 'terminal-command':
        return {
          icon: Terminal,
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          hoverBg: 'hover:bg-yellow-200',
          iconColor: 'text-yellow-600',
        };
    }
  }
  if (prompt.mode === 'universal') {
    return {
      icon: Wand2,
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      hoverBg: 'hover:bg-purple-200',
      iconColor: 'text-purple-500',
    };
  }
  return {
    icon: Wand2,
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    hoverBg: 'hover:bg-blue-200',
    iconColor: 'text-blue-500',
  };
};

export function MetaPromptSelector({
  composerMode,
  onManageRequest,
}: MetaPromptSelectorProps) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const selectorContainerRef = useRef<HTMLDivElement>(null);

  const { metaPrompts: promptDefs } = useSettingsStore();
  const { enabledMetaPromptIds, setEnabledMetaPromptIds } = useComposerStore();

  const allPromptsForMode = useMemo<MetaPrompt[]>(() => {
    return promptDefs
      .filter(p => p.mode === composerMode || p.mode === 'universal')
      .map(def => ({
        ...def,
        enabled: enabledMetaPromptIds.includes(def.id),
      }));
  }, [promptDefs, enabledMetaPromptIds, composerMode]);

  const enabledPrompts = useMemo(
    () => allPromptsForMode.filter(p => p.enabled),
    [allPromptsForMode]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectorContainerRef.current &&
        !selectorContainerRef.current.contains(event.target as Node)
      ) {
        setIsSelectorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectorContainerRef]);

  const togglePrompt = (id: string, shouldBeEnabled: boolean) => {
    const currentIds = new Set(enabledMetaPromptIds);
    if (shouldBeEnabled) {
      currentIds.add(id);
    } else {
      currentIds.delete(id);
    }
    setEnabledMetaPromptIds(Array.from(currentIds));
  };

  if (promptDefs.length === 0) {
    return (
      <div
        onClick={onManageRequest}
        className="text-center text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded-md p-3 hover:bg-gray-100 hover:border-gray-400 transition-colors"
      >
        No meta prompts defined. Click here to create one.
      </div>
    );
  }

  return (
    <div className="relative" ref={selectorContainerRef}>
      <HorizontalScroller>
        {({
          scrollContainerRef,
          scrollContainerClassName,
          outerWrapperProps,
          scrollbar,
        }) => (
          <div
            {...outerWrapperProps}
            onClick={() => {
              setIsSelectorOpen(!isSelectorOpen);
              outerWrapperProps.onMouseEnter();
            }}
            className="relative flex items-center justify-between gap-2 p-2 border border-gray-300 bg-white rounded-md min-h-[40px] hover:border-blue-400 transition-colors"
          >
            <div className="flex-grow flex-shrink min-w-0">
              <div
                ref={scrollContainerRef}
                className={scrollContainerClassName}
              >
                <AnimatePresence>
                  {enabledPrompts.length > 0 ? (
                    enabledPrompts.map(prompt => {
                      const {
                        icon: Icon,
                        bg,
                        text,
                        hoverBg,
                      } = getPromptStyle(prompt);
                      return (
                        <motion.div
                          key={prompt.id}
                          layout
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ duration: 0.15 }}
                          className={`flex-shrink-0 flex items-center gap-1.5 text-sm font-medium pl-3 pr-1.5 py-1 rounded-full ${bg} ${text}`}
                        >
                          <Icon size={12} className="mr-0.5" />
                          <span>{prompt.name}</span>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              togglePrompt(prompt.id, false);
                            }}
                            className={`p-0.5 rounded-full ${hoverBg}`}
                            title={`Deselect ${prompt.name}`}
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      );
                    })
                  ) : (
                    <span className="text-gray-400 text-sm px-1 flex-shrink-0">
                      Select meta prompts...
                    </span>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <ChevronDown
              size={16}
              className={`flex-shrink-0 text-gray-500 transition-transform ${
                isSelectorOpen ? 'rotate-180' : ''
              }`}
            />
            {scrollbar}
          </div>
        )}
      </HorizontalScroller>

      <AnimatePresence>
        {isSelectorOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 right-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-2"
          >
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto p-1 thin-scrollbar">
              {allPromptsForMode.map(prompt => {
                const { icon: Icon, iconColor } = getPromptStyle(prompt);
                return (
                  <Checkbox
                    key={prompt.id}
                    checked={prompt.enabled}
                    onChange={e => togglePrompt(prompt.id, e.target.checked)}
                    className="w-full px-3 py-2 hover:bg-blue-50 rounded-md transition-colors text-gray-700"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-2">
                        <Icon size={14} className={iconColor} />
                        {prompt.name}
                      </span>
                      {prompt.enabled && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </Checkbox>
                );
              })}
              {allPromptsForMode.length === 0 && (
                <div className="text-center text-xs text-gray-400 p-4">
                  No prompts available for {composerMode} mode.
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2">
              <Button
                onClick={() => {
                  setIsSelectorOpen(false);
                  onManageRequest();
                }}
                variant="ghost"
                size="md"
                className="w-full text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              >
                Manage All Prompts...
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
