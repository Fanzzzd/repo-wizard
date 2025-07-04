import React from "react";

type TextareaProps = React.ComponentPropsWithRef<"textarea">;

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={`w-full p-2 text-sm text-gray-900 placeholder-gray-400 bg-white rounded-md border border-gray-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
        className ?? ""
      }`}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";