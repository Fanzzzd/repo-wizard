import React from "react";

type InputProps = React.ComponentPropsWithRef<"input">;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full p-2 text-sm text-gray-900 placeholder-gray-400 bg-white rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
          className ?? ""
        }`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";