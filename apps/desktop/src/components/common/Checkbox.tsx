import { Check, Minus } from 'lucide-react';
import React from 'react';
import { cn } from '../../lib/utils';

type CheckboxProps = Omit<React.ComponentPropsWithRef<'input'>, 'type'> & {
  isIndeterminate?: boolean;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, children, checked, isIndeterminate, ...props }, ref) => {
    // Extract title to apply to the label, not the input
    const { title, ...restProps } = props;
    return (
      <label
        title={title}
        className={cn(
          'flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none',
          className
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          className="sr-only peer"
          {...restProps}
        />
        <div
          className={cn(
            'relative h-[14px] w-[14px] flex-shrink-0 rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-blue-500 peer-disabled:opacity-50',
            checked || isIndeterminate
              ? 'border-blue-400 bg-blue-400'
              : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
          )}
        >
          <Check
            className={cn(
              'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 text-white transition-opacity',
              checked && !isIndeterminate ? 'opacity-100' : 'opacity-0'
            )}
            strokeWidth={3}
          />
          <Minus
            className={cn(
              'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 text-white transition-opacity',
              isIndeterminate ? 'opacity-100' : 'opacity-0'
            )}
            strokeWidth={3}
          />
        </div>
        {children}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';
