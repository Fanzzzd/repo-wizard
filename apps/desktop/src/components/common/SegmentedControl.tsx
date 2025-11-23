import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string; // Unique ID for motion layout animations
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
}: SegmentedControlProps<T>) {
  return (
    <div className="relative z-0 flex bg-gray-200 dark:bg-gray-700 rounded-md p-0.5">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'relative flex-1 text-center text-xs px-2 py-1 font-medium transition-colors duration-200',
            value === option.value
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
          )}
        >
          {value === option.value && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 bg-white dark:bg-gray-500 shadow-sm rounded-md"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <span className="relative z-10">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
