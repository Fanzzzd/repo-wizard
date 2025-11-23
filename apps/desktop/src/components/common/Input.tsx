import React from 'react';
import { cn } from '../../lib/utils';

type InputProps = React.ComponentPropsWithRef<'input'>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn('form-input-base', className)}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
