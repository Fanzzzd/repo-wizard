import React from "react";

type CheckboxProps = Omit<React.ComponentPropsWithRef<"input">, "type">;

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  CheckboxProps
>(({ className, children, ...props }, ref) => {
  return (
    <label
      className={`flex items-center gap-2 cursor-pointer text-sm text-gray-700 ${
        className ?? ""
      }`}
    >
      <input
        type="checkbox"
        ref={ref}
        className="form-checkbox h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-0"
        {...props}
      />
      {children}
    </label>
  );
});
Checkbox.displayName = "Checkbox";