import React from 'react';

type InputProps = React.ComponentPropsWithRef<'input'>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`form-input-base ${className ?? ''}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
