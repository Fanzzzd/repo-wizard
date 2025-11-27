import React from 'react';
import { cn } from '../../lib/utils';

type InputProps = React.ComponentPropsWithRef<'input'>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#262626] dark:text-[#ededed] dark:placeholder:text-[#a3a3a3] dark:focus-visible:ring-[#d4d4d4]',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
