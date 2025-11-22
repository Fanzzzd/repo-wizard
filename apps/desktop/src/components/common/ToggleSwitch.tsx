import { motion } from 'motion/react';
import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
}

export function ToggleSwitch({ checked, onChange, title }: ToggleSwitchProps) {
  const spring = { type: 'spring' as const, stiffness: 700, damping: 30 };

  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onChange(!checked);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick(e);
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyPress}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      className={`flex-shrink-0 w-9 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
        checked
          ? 'bg-blue-500 justify-end'
          : 'bg-gray-300 dark:bg-gray-600 justify-start'
      }`}
      title={title}
    >
      <motion.div
        className="w-3.5 h-3.5 bg-white rounded-full shadow-md"
        layout
        transition={spring}
      />
    </div>
  );
}