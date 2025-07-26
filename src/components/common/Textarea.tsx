import React from 'react';

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
        className={`form-input-base font-mono resize-none ${className ?? ''}`}
        onKeyDown={hasCustomUndoRedo ? handleKeyDown : props.onKeyDown}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
