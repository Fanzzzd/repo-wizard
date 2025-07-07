import React from "react";

type TextareaProps = React.ComponentPropsWithRef<"textarea">;

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={`form-input-base font-mono resize-none ${
        className ?? ""
      }`}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";