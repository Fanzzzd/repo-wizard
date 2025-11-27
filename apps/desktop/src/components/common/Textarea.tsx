import React from 'react';
import { cn } from '../../lib/utils';

type TextareaProps = React.ComponentPropsWithRef<'textarea'> & {
  onUndo?: () => void;
  onRedo?: () => void;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onUndo, onRedo, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isUndo =
        (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
      const isRedo =
        (e.ctrlKey && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey);

      if (isUndo) {
        if (onUndo) {
          e.preventDefault();
          onUndo();
        }
      } else if (isRedo) {
        if (onRedo) {
          e.preventDefault();
          onRedo();
        }
      }

      props.onKeyDown?.(e);
    };

    const hasCustomUndoRedo = onUndo || onRedo;

    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[60px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#262626] dark:text-[#ededed] dark:placeholder:text-[#a3a3a3] dark:focus-visible:ring-[#d4d4d4] font-mono resize-none',
          className
        )}
        onKeyDown={hasCustomUndoRedo ? handleKeyDown : props.onKeyDown}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
