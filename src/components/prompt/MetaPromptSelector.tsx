import { useState, useEffect, useRef, useMemo } from "react";
import { useSettingsStore } from "../../store/settingsStore";
import type { MetaPrompt } from "../../types";
import { X, ChevronDown, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Checkbox } from "../common/Checkbox";
import { HorizontalScroller } from "../common/HorizontalScroller";
import { Button } from "../common/Button";

interface MetaPromptSelectorProps {
  composerMode: "edit" | "qa";
  onManageRequest: () => void;
}

export function MetaPromptSelector({
  composerMode,
  onManageRequest,
}: MetaPromptSelectorProps) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const selectorContainerRef = useRef<HTMLDivElement>(null);

  const { metaPrompts, setMetaPrompts } = useSettingsStore();

  const enabledPrompts = useMemo(
    () =>
      metaPrompts.filter(
        (p) => p.enabled && (p.mode === composerMode || p.mode === "universal")
      ),
    [metaPrompts, composerMode]
  );
  
  const selectablePrompts = useMemo(
    () =>
      metaPrompts.filter(
        (p) => p.mode === composerMode || p.mode === "universal"
      ),
    [metaPrompts, composerMode]
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectorContainerRef]);

  const handleUpdateMetaPrompt = (
    id: string,
    update: Partial<Omit<MetaPrompt, "id">>
  ) => {
    setMetaPrompts(
      metaPrompts.map((p) => (p.id === id ? { ...p, ...update } : p))
    );
  };

  if (metaPrompts.length === 0) {
    return (
      <div
        onClick={onManageRequest}
        className="text-center text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded-md p-3 hover:bg-gray-100 hover:border-gray-400 cursor-pointer transition-colors"
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
            className="relative flex items-center justify-between gap-2 p-2 border border-gray-300 bg-white rounded-md min-h-[40px] cursor-pointer hover:border-blue-400 transition-colors"
          >
            <div className="flex-grow flex-shrink min-w-0">
              <div ref={scrollContainerRef} className={scrollContainerClassName}>
                <AnimatePresence>
                  {enabledPrompts.length > 0 ? (
                    enabledPrompts.map((prompt) => (
                      <motion.div
                        key={prompt.id}
                        layout
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.15 }}
                        className={`flex-shrink-0 flex items-center gap-1.5 text-sm font-medium pl-3 pr-1.5 py-1 rounded-full ${
                          prompt.mode === 'universal'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {prompt.mode === 'universal' && <Wand2 size={12} className="mr-1" />}
                        <span>{prompt.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateMetaPrompt(prompt.id, {
                              enabled: false,
                            });
                          }}
                          className={`p-0.5 rounded-full ${
                            prompt.mode === 'universal'
                            ? 'hover:bg-purple-200'
                            : 'hover:bg-blue-200'
                          }`}
                          title={`Deselect ${prompt.name}`}
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    ))
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
                isSelectorOpen ? "rotate-180" : ""
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
              {selectablePrompts.map((prompt) => (
                  <Checkbox
                    key={prompt.id}
                    checked={prompt.enabled}
                    onChange={(e) =>
                      handleUpdateMetaPrompt(prompt.id, {
                        enabled: e.target.checked,
                      })
                    }
                    className="w-full px-3 py-2 hover:bg-blue-50 rounded-md transition-colors text-gray-700"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-2">
                        {prompt.mode === 'universal' && <Wand2 size={14} className="text-purple-500" />}
                        {prompt.name}
                      </span>
                      {prompt.enabled && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </Checkbox>
                ))}
              {selectablePrompts.length === 0 && (
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